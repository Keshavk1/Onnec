import { chatService } from '../services/chat.service.js';
import { AsyncHandler } from '../utils/AsyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const createOrGetChat = AsyncHandler(async (req, res) => {
    const { userId } = req.body; // The user to chat with

    if (!userId) {
        throw new ApiError(400, 'User ID is required');
    }

    const chat = await chatService.createChat([req.user._id, userId]);

    return res
        .status(200)
        .json(new ApiResponse(200, chat, 'Chat retrieved successfully'));
});

const sendMessage = AsyncHandler(async (req, res) => {
    const { chatId, content } = req.body;

    if (!chatId || !content) {
        throw new ApiError(400, 'Chat ID and content are required');
    }

    const message = await chatService.sendMessage(chatId, req.user._id, content);

    // Note: In real-time, we would also emit this via WebSockets
    // req.app.get('io').to(chatId).emit('message', message);

    return res
        .status(201)
        .json(new ApiResponse(201, message, 'Message sent successfully'));
});

const getMessages = AsyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { limit, skip } = req.query;

    const messages = await chatService.getChatHistory(chatId, limit, skip);

    return res
        .status(200)
        .json(new ApiResponse(200, messages, 'Messages retrieved successfully'));
});

const getMyChats = AsyncHandler(async (req, res) => {
    const chats = await chatService.getUserChats(req.user._id);

    return res
        .status(200)
        .json(new ApiResponse(200, chats, 'Chats retrieved successfully'));
});

export { createOrGetChat, sendMessage, getMessages, getMyChats };
