import { Chat } from '../models/chat.model.js';
import { Message } from '../models/message.model.js';
import { ApiError } from '../utils/ApiError.js';
import { redisClient } from '../config/redis.js';

class ChatService {
    constructor() {
        this.messageCachePrefix = 'chat_messages:';
        this.chatCachePrefix = 'chat_cache:';
        this.defaultCacheTTL = 3600; // 1 hour
    }

    async createChat(participants, name, isGroupChat = false) {
        if (!participants || participants.length < 2) {
            throw new ApiError(400, 'At least two participants are required');
        }

        // Check if a 1-on-1 chat already exists
        if (!isGroupChat) {
            const existingChat = await Chat.findOne({
                isGroupChat: false,
                participants: { $all: participants, $size: 2 },
            });
            if (existingChat) return existingChat;
        }

        const chat = await Chat.create({
            name,
            isGroupChat,
            participants,
        });

        // Clear relevant caches
        await this.clearUserChatsCache(participants);

        return chat;
    }

    async sendMessage(chatId, senderId, content, attachments = [], type = 'text', replyTo = null) {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new ApiError(404, 'Chat not found');
        }

        // Verify sender is a participant
        if (!chat.participants.includes(senderId)) {
            throw new ApiError(403, 'You are not a participant in this chat');
        }

        const message = await Message.create({
            sender: senderId,
            content,
            chat: chatId,
            attachments,
            type,
            replyTo,
            readBy: [{ user: senderId, readAt: new Date() }] // Mark as read by sender
        });

        // Update chat's last message
        chat.lastMessage = message._id;
        chat.updatedAt = new Date();
        await chat.save();

        // Clear message cache for this chat
        await this.clearChatMessagesCache(chatId);

        return message.populate([
            { path: 'sender', select: 'username fullName avatar' },
            { path: 'replyTo', populate: { path: 'sender', select: 'username fullName avatar' } }
        ]);
    }

    /**
     * Save message (used by WebSocket handler)
     */
    async saveMessage(messageData) {
        const { chatId, senderId, content, type = 'text', replyTo } = messageData;
        
        return await this.sendMessage(chatId, senderId, content, [], type, replyTo);
    }

    async getChatHistory(chatId, limit = 50, skip = 0) {
        try {
            // Try to get from cache first
            const cacheKey = `${this.messageCachePrefix}${chatId}:${limit}:${skip}`;
            const cachedMessages = await this.getFromCache(cacheKey);
            
            if (cachedMessages) {
                return cachedMessages;
            }

            // Get from database
            const messages = await Message.find({ chat: chatId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('sender', 'username fullName avatar')
                .populate('replyTo', 'content sender createdAt')
                .populate('replyTo.sender', 'username fullName avatar');

            // Cache the result
            await this.setCache(cacheKey, messages, this.defaultCacheTTL);

            return messages;
        } catch (error) {
            console.error('Get chat history error:', error);
            throw error;
        }
    }

    async getUserChats(userId, limit = 20, skip = 0) {
        try {
            // Try cache first
            const cacheKey = `${this.chatCachePrefix}user:${userId}:${limit}:${skip}`;
            const cachedChats = await this.getFromCache(cacheKey);
            
            if (cachedChats) {
                return cachedChats;
            }

            // Get from database
            const chats = await Chat.find({ participants: userId })
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('participants', 'username fullName avatar')
                .populate('lastMessage')
                .populate('admin', 'username fullName avatar');

            // Cache the result
            await this.setCache(cacheKey, chats, this.defaultCacheTTL);

            return chats;
        } catch (error) {
            console.error('Get user chats error:', error);
            throw error;
        }
    }

    /**
     * Check if user has access to a chat
     */
    async userHasAccess(userId, chatId) {
        try {
            const cacheKey = `${this.chatCachePrefix}access:${userId}:${chatId}`;
            const cachedAccess = await this.getFromCache(cacheKey);
            
            if (cachedAccess !== null) {
                return cachedAccess;
            }

            const chat = await Chat.findById(chatId);
            const hasAccess = chat && chat.participants.includes(userId);

            // Cache the result for 5 minutes
            await this.setCache(cacheKey, hasAccess, 300);

            return hasAccess;
        } catch (error) {
            console.error('User has access error:', error);
            return false;
        }
    }

    /**
     * Mark message as read
     */
    async markMessageAsRead(messageId, userId) {
        try {
            const message = await Message.findById(messageId);
            if (!message) {
                throw new ApiError(404, 'Message not found');
            }

            // Check if user is a participant in the chat
            const chat = await Chat.findById(message.chat);
            if (!chat || !chat.participants.includes(userId)) {
                throw new ApiError(403, 'Access denied');
            }

            // Add to readBy array if not already present
            const alreadyRead = message.readBy.some(read => read.user.toString() === userId);
            if (!alreadyRead && message.sender.toString() !== userId) {
                message.readBy.push({ user: userId, readAt: new Date() });
                await message.save();

                // Clear relevant caches
                await this.clearChatMessagesCache(message.chat);
            }

            return message;
        } catch (error) {
            console.error('Mark as read error:', error);
            throw error;
        }
    }

    /**
     * Get unread messages count for a user in a chat
     */
    async getUnreadCount(userId, chatId) {
        try {
            const count = await Message.countDocuments({
                chat: chatId,
                sender: { $ne: userId },
                'readBy.user': { $ne: userId }
            });
            return count;
        } catch (error) {
            console.error('Get unread count error:', error);
            return 0;
        }
    }

    /**
     * Get total unread messages count for a user
     */
    async getTotalUnreadCount(userId) {
        try {
            const userChats = await Chat.find({ participants: userId }).select('_id');
            const chatIds = userChats.map(chat => chat._id);

            const totalUnread = await Message.countDocuments({
                chat: { $in: chatIds },
                sender: { $ne: userId },
                'readBy.user': { $ne: userId }
            });

            return totalUnread;
        } catch (error) {
            console.error('Get total unread count error:', error);
            return 0;
        }
    }

    /**
     * Delete message
     */
    async deleteMessage(messageId, userId) {
        try {
            const message = await Message.findById(messageId);
            if (!message) {
                throw new ApiError(404, 'Message not found');
            }

            // Check if user is the sender or chat admin
            const chat = await Chat.findById(message.chat);
            const isAdmin = chat.admin && chat.admin.toString() === userId;
            const isSender = message.sender.toString() === userId;

            if (!isSender && !isAdmin) {
                throw new ApiError(403, 'Access denied');
            }

            // Soft delete by marking as deleted
            message.deleted = true;
            message.deletedAt = new Date();
            message.deletedBy = userId;
            await message.save();

            // Clear caches
            await this.clearChatMessagesCache(message.chat);

            return message;
        } catch (error) {
            console.error('Delete message error:', error);
            throw error;
        }
    }

    /**
     * Helper methods for Redis caching
     */
    async setCache(key, value, ttl = this.defaultCacheTTL) {
        try {
            const client = redisClient.getClient();
            await client.setEx(key, ttl, JSON.stringify(value));
        } catch (error) {
            console.error('Set cache error:', error);
        }
    }

    async getFromCache(key) {
        try {
            const client = redisClient.getClient();
            const value = await client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Get from cache error:', error);
            return null;
        }
    }

    async clearCache(key) {
        try {
            const client = redisClient.getClient();
            await client.del(key);
        } catch (error) {
            console.error('Clear cache error:', error);
        }
    }

    async clearChatMessagesCache(chatId) {
        try {
            const client = redisClient.getClient();
            const pattern = `${this.messageCachePrefix}${chatId}:*`;
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
            }
        } catch (error) {
            console.error('Clear chat messages cache error:', error);
        }
    }

    async clearUserChatsCache(userIds) {
        try {
            const client = redisClient.getClient();
            const patterns = userIds.map(userId => `${this.chatCachePrefix}user:${userId}:*`);
            
            for (const pattern of patterns) {
                const keys = await client.keys(pattern);
                if (keys.length > 0) {
                    await client.del(keys);
                }
            }
        } catch (error) {
            console.error('Clear user chats cache error:', error);
        }
    }
}

export const chatService = new ChatService();
