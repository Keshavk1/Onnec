import { chatService } from '../src/services/chat.service.js';
import { jest } from '@jest/globals';

describe('Chat Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChat', () => {
    it('should throw error for insufficient participants', async () => {
      await expect(chatService.createChat(['user1']))
        .rejects.toThrow('At least two participants are required');
    });

    it('should throw error for empty participants', async () => {
      await expect(chatService.createChat([]))
        .rejects.toThrow('At least two participants are required');
    });

    it('should create chat with valid participants', async () => {
      const mockChat = {
        _id: 'chat123',
        participants: ['user1', 'user2'],
        isGroupChat: false,
        save: jest.fn().mockResolvedValue(true)
      };

      const Chat = require('../src/models/chat.model.js').Chat;
      Chat.findOne = jest.fn().mockResolvedValue(null);
      Chat.create = jest.fn().mockResolvedValue(mockChat);

      const result = await chatService.createChat(['user1', 'user2']);
      
      expect(result).toBeDefined();
      expect(result.participants).toEqual(['user1', 'user2']);
    });
  });

  describe('saveMessage', () => {
    it('should save message with valid data', async () => {
      const mockMessage = {
        _id: 'msg123',
        chat: 'chat123',
        sender: 'user1',
        content: 'Hello world',
        type: 'text',
        populate: jest.fn().mockResolvedValue({
          _id: 'msg123',
          content: 'Hello world',
          sender: { username: 'user1', fullName: 'User One' }
        })
      };

      const mockChat = {
        participants: ['user1', 'user2'],
        save: jest.fn().mockResolvedValue(true)
      };

      const Chat = require('../src/models/chat.model.js').Chat;
      const Message = require('../src/models/message.model.js').Message;
      
      Chat.findById = jest.fn().mockResolvedValue(mockChat);
      Message.create = jest.fn().mockResolvedValue(mockMessage);
      Message.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 1 });

      const messageData = {
        chatId: 'chat123',
        senderId: 'user1',
        content: 'Hello world',
        type: 'text'
      };

      const result = await chatService.saveMessage(messageData);
      
      expect(result).toBeDefined();
      expect(result.content).toBe('Hello world');
    });
  });

  describe('userHasAccess', () => {
    it('should return true for authorized user', async () => {
      const mockChat = {
        participants: ['user1', 'user2']
      };

      const Chat = require('../src/models/chat.model.js').Chat;
      Chat.findById = jest.fn().mockResolvedValue(mockChat);

      const result = await chatService.userHasAccess('user1', 'chat123');
      expect(result).toBe(true);
    });

    it('should return false for unauthorized user', async () => {
      const mockChat = {
        participants: ['user1', 'user2']
      };

      const Chat = require('../src/models/chat.model.js').Chat;
      Chat.findById = jest.fn().mockResolvedValue(mockChat);

      const result = await chatService.userHasAccess('user3', 'chat123');
      expect(result).toBe(false);
    });

    it('should return false for non-existent chat', async () => {
      const Chat = require('../src/models/chat.model.js').Chat;
      Chat.findById = jest.fn().mockResolvedValue(null);

      const result = await chatService.userHasAccess('user1', 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read', async () => {
      const mockMessage = {
        _id: 'msg123',
        chat: 'chat123',
        sender: 'user1',
        readBy: [],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockChat = {
        participants: ['user1', 'user2']
      };

      const Message = require('../src/models/message.model.js').Message;
      const Chat = require('../src/models/chat.model.js').Chat;
      
      Message.findById = jest.fn().mockResolvedValue(mockMessage);
      Chat.findById = jest.fn().mockResolvedValue(mockChat);

      const result = await chatService.markMessageAsRead('msg123', 'user2');
      
      expect(result).toBeDefined();
      expect(result._id).toBe('msg123');
    });

    it('should throw error for non-existent message', async () => {
      const Message = require('../src/models/message.model.js').Message;
      Message.findById = jest.fn().mockResolvedValue(null);

      await expect(chatService.markMessageAsRead('nonexistent', 'user1'))
        .rejects.toThrow('Message not found');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      const Message = require('../src/models/message.model.js').Message;
      Message.countDocuments = jest.fn().mockResolvedValue(5);

      const count = await chatService.getUnreadCount('user1', 'chat123');
      expect(count).toBe(5);
    });

    it('should return 0 on error', async () => {
      const Message = require('../src/models/message.model.js').Message;
      Message.countDocuments = jest.fn().mockRejectedValue(new Error('DB error'));

      const count = await chatService.getUnreadCount('user1', 'chat123');
      expect(count).toBe(0);
    });
  });

  describe('deleteMessage', () => {
    it('should allow sender to delete message', async () => {
      const mockMessage = {
        _id: 'msg123',
        sender: 'user1',
        deleted: false,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockChat = {
        participants: ['user1', 'user2']
      };

      const Message = require('../src/models/message.model.js').Message;
      const Chat = require('../src/models/chat.model.js').Chat;
      
      Message.findById = jest.fn().mockResolvedValue(mockMessage);
      Chat.findById = jest.fn().mockResolvedValue(mockChat);

      const result = await chatService.deleteMessage('msg123', 'user1');
      
      expect(result).toBeDefined();
      expect(result.deleted).toBe(true);
    });

    it('should throw error for non-existent message', async () => {
      const Message = require('../src/models/message.model.js').Message;
      Message.findById = jest.fn().mockResolvedValue(null);

      await expect(chatService.deleteMessage('nonexistent', 'user1'))
        .rejects.toThrow('Message not found');
    });
  });

  describe('cache operations', () => {
    it('should handle set cache', async () => {
      const result = await chatService.setCache('test_key', { data: 'test' });
      expect(typeof result).toBe('undefined'); // void function
    });

    it('should handle get from cache', async () => {
      const result = await chatService.getFromCache('test_key');
      expect(result).toBeNull(); // No data in mock
    });

    it('should handle clear cache', async () => {
      const result = await chatService.clearCache('test_key');
      expect(typeof result).toBe('undefined'); // void function
    });
  });
});
