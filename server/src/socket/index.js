import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { redisClient } from '../config/redis.js';
import { chatService } from '../services/chat.service.js';

class SocketService {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // socketId -> user info
        this.userSockets = new Map(); // userId -> Set of socketIds
        this.chatRooms = new Map(); // chatId -> Set of userIds
    }

    /**
     * Initialize Socket.io server and event handlers
     * @param {import('http').Server} server 
     */
    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || "*",
                credentials: true,
            },
            pingTimeout: 60000,
            pingInterval: 25000,
        });

        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                
                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                socket.userId = decoded.id;
                socket.userInfo = decoded;
                next();
            } catch (error) {
                console.error('Socket authentication error:', error);
                next(new Error('Invalid authentication token'));
            }
        });

        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        return this.io;
    }

    /**
     * Handle new socket connection
     */
    async handleConnection(socket) {
        console.log(`User connected: ${socket.userId} (Socket: ${socket.id})`);

        // Store user connection info
        this.connectedUsers.set(socket.id, {
            userId: socket.userId,
            userInfo: socket.userInfo,
            connectedAt: new Date()
        });

        // Add to user's socket set
        if (!this.userSockets.has(socket.userId)) {
            this.userSockets.set(socket.userId, new Set());
        }
        this.userSockets.get(socket.userId).add(socket.id);

        // Store online status in Redis
        await this.setUserOnlineStatus(socket.userId, true);

        // Join user to their personal room for private messages
        socket.join(`user:${socket.userId}`);

        // Send user's online status to friends
        this.broadcastUserStatus(socket.userId, 'online');

        // Handle joining chat rooms
        socket.on('joinChat', async (data) => {
            await this.handleJoinChat(socket, data);
        });

        // Handle leaving chat rooms
        socket.on('leaveChat', async (data) => {
            await this.handleLeaveChat(socket, data);
        });

        // Handle sending messages
        socket.on('sendMessage', async (data) => {
            await this.handleSendMessage(socket, data);
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            this.handleTyping(socket, data);
        });

        socket.on('stopTyping', (data) => {
            this.handleStopTyping(socket, data);
        });

        // Handle message read receipts
        socket.on('markAsRead', async (data) => {
            await this.handleMarkAsRead(socket, data);
        });

        // Handle getting online users
        socket.on('getOnlineUsers', async () => {
            await this.handleGetOnlineUsers(socket);
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            await this.handleDisconnection(socket);
        });

        // Send welcome message
        socket.emit('connected', {
            message: 'Connected to chat server',
            userId: socket.userId,
            socketId: socket.id
        });
    }

    /**
     * Handle joining a chat room
     */
    async handleJoinChat(socket, data) {
        try {
            const { chatId } = data;
            
            if (!chatId) {
                socket.emit('error', { message: 'Chat ID is required' });
                return;
            }

            // Verify user has access to this chat
            const hasAccess = await chatService.userHasAccess(socket.userId, chatId);
            if (!hasAccess) {
                socket.emit('error', { message: 'Access denied to this chat' });
                return;
            }

            socket.join(chatId);

            // Add user to chat room tracking
            if (!this.chatRooms.has(chatId)) {
                this.chatRooms.set(chatId, new Set());
            }
            this.chatRooms.get(chatId).add(socket.userId);

            // Store in Redis for cross-server chat room tracking
            await this.addUserToChatRoom(socket.userId, chatId);

            socket.emit('joinedChat', { chatId });
            
            // Notify other users in the chat
            socket.to(chatId).emit('userJoinedChat', {
                chatId,
                user: socket.userInfo,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Join chat error:', error);
            socket.emit('error', { message: 'Failed to join chat' });
        }
    }

    /**
     * Handle leaving a chat room
     */
    async handleLeaveChat(socket, data) {
        try {
            const { chatId } = data;
            
            if (!chatId) return;

            socket.leave(chatId);

            // Remove from chat room tracking
            if (this.chatRooms.has(chatId)) {
                this.chatRooms.get(chatId).delete(socket.userId);
            }

            await this.removeUserFromChatRoom(socket.userId, chatId);

            socket.emit('leftChat', { chatId });
            
            // Notify other users
            socket.to(chatId).emit('userLeftChat', {
                chatId,
                user: socket.userInfo,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Leave chat error:', error);
        }
    }

    /**
     * Handle sending messages
     */
    async handleSendMessage(socket, data) {
        try {
            const { chatId, content, type = 'text', replyTo } = data;

            if (!chatId || !content) {
                socket.emit('error', { message: 'Chat ID and content are required' });
                return;
            }

            // Verify user is in the chat
            const isInChat = await this.isUserInChat(socket.userId, chatId);
            if (!isInChat) {
                socket.emit('error', { message: 'You are not in this chat' });
                return;
            }

            // Save message to database
            const message = await chatService.saveMessage({
                chatId,
                senderId: socket.userId,
                content,
                type,
                replyTo
            });

            // Broadcast to all users in the chat room
            this.io.to(chatId).emit('messageReceived', {
                ...message,
                timestamp: new Date()
            });

            // Send delivery confirmation to sender
            socket.emit('messageDelivered', {
                messageId: message._id,
                chatId,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Send message error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }

    /**
     * Handle typing indicators
     */
    handleTyping(socket, data) {
        const { chatId } = data;
        if (!chatId) return;

        socket.to(chatId).emit('userTyping', {
            chatId,
            user: socket.userInfo,
            timestamp: new Date()
        });
    }

    /**
     * Handle stop typing indicators
     */
    handleStopTyping(socket, data) {
        const { chatId } = data;
        if (!chatId) return;

        socket.to(chatId).emit('userStopTyping', {
            chatId,
            user: socket.userInfo,
            timestamp: new Date()
        });
    }

    /**
     * Handle marking messages as read
     */
    async handleMarkAsRead(socket, data) {
        try {
            const { messageId, chatId } = data;

            if (!messageId || !chatId) return;

            // Update read status in database
            await chatService.markMessageAsRead(messageId, socket.userId);

            // Notify other users in the chat
            socket.to(chatId).emit('messageRead', {
                messageId,
                userId: socket.userId,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Mark as read error:', error);
        }
    }

    /**
     * Handle getting online users
     */
    async handleGetOnlineUsers(socket) {
        try {
            const onlineUsers = await this.getOnlineUsers();
            socket.emit('onlineUsers', onlineUsers);
        } catch (error) {
            console.error('Get online users error:', error);
        }
    }

    /**
     * Handle socket disconnection
     */
    async handleDisconnection(socket) {
        console.log(`User disconnected: ${socket.userId} (Socket: ${socket.id})`);

        // Remove from connected users
        this.connectedUsers.delete(socket.id);

        // Remove from user's socket set
        if (this.userSockets.has(socket.userId)) {
            this.userSockets.get(socket.userId).delete(socket.id);
            
            // If user has no more active sockets, mark as offline
            if (this.userSockets.get(socket.userId).size === 0) {
                this.userSockets.delete(socket.userId);
                await this.setUserOnlineStatus(socket.userId, false);
                this.broadcastUserStatus(socket.userId, 'offline');
            }
        }
    }

    /**
     * Set user online status in Redis
     */
    async setUserOnlineStatus(userId, isOnline) {
        try {
            const client = redisClient.getClient();
            const key = `user_status:${userId}`;
            
            if (isOnline) {
                await client.setEx(key, 300, 'online'); // 5 minutes TTL
            } else {
                await client.del(key);
            }
        } catch (error) {
            console.error('Set user status error:', error);
        }
    }

    /**
     * Broadcast user status change
     */
    broadcastUserStatus(userId, status) {
        this.io.emit('userStatusChanged', {
            userId,
            status,
            timestamp: new Date()
        });
    }

    /**
     * Add user to chat room in Redis
     */
    async addUserToChatRoom(userId, chatId) {
        try {
            const client = redisClient.getClient();
            await client.sAdd(`chat_users:${chatId}`, userId);
            await client.expire(`chat_users:${chatId}`, 86400); // 24 hours
        } catch (error) {
            console.error('Add user to chat room error:', error);
        }
    }

    /**
     * Remove user from chat room in Redis
     */
    async removeUserFromChatRoom(userId, chatId) {
        try {
            const client = redisClient.getClient();
            await client.sRem(`chat_users:${chatId}`, userId);
        } catch (error) {
            console.error('Remove user from chat room error:', error);
        }
    }

    /**
     * Check if user is in chat
     */
    async isUserInChat(userId, chatId) {
        try {
            const client = redisClient.getClient();
            const isMember = await client.sIsMember(`chat_users:${chatId}`, userId);
            return isMember;
        } catch (error) {
            console.error('Check user in chat error:', error);
            return false;
        }
    }

    /**
     * Get online users from Redis
     */
    async getOnlineUsers() {
        try {
            const client = redisClient.getClient();
            const keys = await client.keys('user_status:*');
            const userIds = keys.map(key => key.replace('user_status:', ''));
            return userIds;
        } catch (error) {
            console.error('Get online users error:', error);
            return [];
        }
    }

    /**
     * Send message to specific user
     */
    sendToUser(userId, event, data) {
        this.io.to(`user:${userId}`).emit(event, data);
    }

    /**
     * Get connected users count
     */
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }

    /**
     * Get chat rooms count
     */
    getChatRoomsCount() {
        return this.chatRooms.size;
    }
}

export const socketService = new SocketService();

/**
 * Initialize Socket.io server (backward compatibility)
 * @param {import('http').Server} server 
 */
export const initializeSocket = (server) => {
    return socketService.initialize(server);
};
