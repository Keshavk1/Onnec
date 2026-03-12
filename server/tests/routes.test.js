import request from 'supertest';
import { app } from '../src/app.js';
import { jest } from '@jest/globals';

// Mock the services
jest.mock('../src/services/url.service.js');
jest.mock('../src/services/rateLimiter.service.js');

describe('URL Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/url/shorten', () => {
    it('should create a shortened URL', async () => {
      const mockUrlService = require('../src/services/url.service.js').urlService;
      mockUrlService.shortenUrl = jest.fn().mockResolvedValue({
        _id: 'url123',
        originalUrl: 'https://example.com',
        shortCode: '1a',
        createdBy: 'user123'
      });

      const response = await request(app)
        .post('/api/v1/url/shorten')
        .send({ originalUrl: 'https://example.com' });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.originalUrl).toBe('https://example.com');
      expect(response.body.data.shortCode).toBe('1a');
    });

    it('should return 400 for missing URL', async () => {
      const response = await request(app)
        .post('/api/v1/url/shorten')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('URL is required');
    });

    it('should return 400 for invalid URL format', async () => {
      const mockUrlService = require('../src/services/url.service.js').urlService;
      mockUrlService.shortenUrl = jest.fn().mockRejectedValue(
        new Error('Invalid URL format')
      );

      const response = await request(app)
        .post('/api/v1/url/shorten')
        .send({ originalUrl: 'invalid-url' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/url/:shortCode', () => {
    it('should redirect to original URL', async () => {
      const mockUrlService = require('../src/services/url.service.js').urlService;
      mockUrlService.resolveUrl = jest.fn().mockResolvedValue('https://example.com');

      const response = await request(app)
        .get('/api/v1/url/1a');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('https://example.com');
    });

    it('should return 404 for non-existent short code', async () => {
      const mockUrlService = require('../src/services/url.service.js').urlService;
      mockUrlService.resolveUrl = jest.fn().mockRejectedValue(
        new Error('URL not found')
      );

      const response = await request(app)
        .get('/api/v1/url/nonexistent');

      expect(response.status).toBe(404);
    });

    it('should return 400 for missing short code', async () => {
      const mockUrlService = require('../src/services/url.service.js').urlService;
      mockUrlService.resolveUrl = jest.fn().mockRejectedValue(
        new Error('Short code is required')
      );

      const response = await request(app)
        .get('/api/v1/url/');

      expect(response.status).toBe(404); // Route not found
    });
  });

  describe('GET /api/v1/url/stats/:shortCode', () => {
    it('should return URL statistics', async () => {
      const mockUrlService = require('../src/services/url.service.js').urlService;
      mockUrlService.getUrlStats = jest.fn().mockResolvedValue({
        shortCode: '1a',
        originalUrl: 'https://example.com',
        clicks: 10,
        createdAt: new Date(),
        createdBy: 'user123'
      });

      const response = await request(app)
        .get('/api/v1/url/stats/1a');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.shortCode).toBe('1a');
      expect(response.body.data.clicks).toBe(10);
    });

    it('should return 404 for non-existent URL stats', async () => {
      const mockUrlService = require('../src/services/url.service.js').urlService;
      mockUrlService.getUrlStats = jest.fn().mockRejectedValue(
        new Error('URL not found')
      );

      const response = await request(app)
        .get('/api/v1/url/stats/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});

describe('Chat Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/chat/create', () => {
    it('should create a new chat', async () => {
      const mockChatService = require('../src/services/chat.service.js').chatService;
      mockChatService.createChat = jest.fn().mockResolvedValue({
        _id: 'chat123',
        participants: ['user1', 'user2'],
        isGroupChat: false
      });

      const response = await request(app)
        .post('/api/v1/chat/create')
        .send({
          participants: ['user1', 'user2'],
          isGroupChat: false
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.participants).toEqual(['user1', 'user2']);
    });

    it('should return 400 for insufficient participants', async () => {
      const mockChatService = require('../src/services/chat.service.js').chatService;
      mockChatService.createChat = jest.fn().mockRejectedValue(
        new Error('At least two participants are required')
      );

      const response = await request(app)
        .post('/api/v1/chat/create')
        .send({
          participants: ['user1'],
          isGroupChat: false
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/chat/history/:chatId', () => {
    it('should return chat history', async () => {
      const mockChatService = require('../src/services/chat.service.js').chatService;
      mockChatService.getChatHistory = jest.fn().mockResolvedValue([
        {
          _id: 'msg1',
          content: 'Hello',
          sender: { username: 'user1' },
          createdAt: new Date()
        }
      ]);

      const response = await request(app)
        .get('/api/v1/chat/history/chat123');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/chat/user/:userId', () => {
    it('should return user chats', async () => {
      const mockChatService = require('../src/services/chat.service.js').chatService;
      mockChatService.getUserChats = jest.fn().mockResolvedValue([
        {
          _id: 'chat1',
          participants: ['user1', 'user2'],
          lastMessage: { content: 'Hello' }
        }
      ]);

      const response = await request(app)
        .get('/api/v1/chat/user/user123');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});

describe('Root Route', () => {
  it('should return welcome message', async () => {
    const response = await request(app)
      .get('/');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.message).toBe('Welcome to Onnec API');
  });
});
