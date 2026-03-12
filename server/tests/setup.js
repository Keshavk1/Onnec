// Test setup file
import { jest } from '@jest/globals';

// Mock Redis for testing
jest.mock('../src/config/redis.js', () => ({
  redisClient: {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    getClient: jest.fn(() => ({
      get: jest.fn().mockResolvedValue(null),
      setEx: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(true),
      incr: jest.fn().mockResolvedValue(1),
      zRemRangeByScore: jest.fn().mockResolvedValue(0),
      zCard: jest.fn().mockResolvedValue(0),
      zAdd: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(true),
      multi: jest.fn(() => ({
        zRemRangeByScore: jest.fn().mockReturnThis(),
        zCard: jest.fn().mockReturnThis(),
        zAdd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { response: 0 },
          { response: 0 },
          { response: 1 },
          { response: 1 }
        ])
      })),
      keys: jest.fn().mockResolvedValue([]),
      sAdd: jest.fn().mockResolvedValue(1),
      sRem: jest.fn().mockResolvedValue(1),
      sIsMember: jest.fn().mockResolvedValue(true)
    }))
  }
}));

// Mock JWT for testing
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token, secret) => {
    if (token === 'valid_token') {
      return { id: 'user123', username: 'testuser' };
    }
    throw new Error('Invalid token');
  }),
  sign: jest.fn(() => 'mock_jwt_token')
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};
