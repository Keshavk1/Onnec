import { Chat } from '../models/chat.model.js';
import { Message } from '../models/message.model.js';
import { ApiError } from '../utils/ApiError.js';

class ChatService {
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

        return chat;
    }

    async sendMessage(chatId, senderId, content, attachments = []) {
        const chat = await Chat.findById(chatId);
        if (!chat) {
            throw new ApiError(404, 'Chat not found');
        }

        const message = await Message.create({
            sender: senderId,
            content,
            chat: chatId,
            attachments,
        });

        chat.lastMessage = message._id;
        await chat.save();

        return message.populate('sender', 'username fullName avatar');
    }

    async getChatHistory(chatId, limit = 50, skip = 0) {
        return await Message.find({ chat: chatId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'username fullName avatar');
    }

    async getUserChats(userId) {
        return await Chat.find({ participants: userId })
            .sort({ updatedAt: -1 })
            .populate('participants', 'username fullName avatar')
            .populate('lastMessage');
    }
}

export const chatService = new ChatService();
