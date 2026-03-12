import { rateLimiterService } from '../src/services/rateLimiter.service.js';
import { jest } from '@jest/globals';

describe('Rate Limiter Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAllowed', () => {
    it('should allow requests within limit', async () => {
      const result = await rateLimiterService.isAllowed('test_ip', 5, 60000);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
      expect(result.currentCount).toBeLessThanOrEqual(result.maxRequests);
    });

    it('should handle Redis errors gracefully', async () => {
      // Mock Redis error
      const mockClient = {
        multi: jest.fn().mockReturnValue({
          zRemRangeByScore: jest.fn().mockReturnThis(),
          zCard: jest.fn().mockReturnThis(),
          zAdd: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          exec: jest.fn().mockRejectedValue(new Error('Redis error'))
        })
      };
      
      // Temporarily replace getClient method
      const originalGetClient = rateLimiterService.constructor.prototype.getClient;
      rateLimiterService.getClient = jest.fn().mockReturnValue(mockClient);

      const result = await rateLimiterService.isAllowed('test_ip', 5, 60000);
      
      // Should fail open on Redis errors
      expect(result.allowed).toBe(true);
      
      // Restore original method
      rateLimiterService.getClient = originalGetClient;
    });
  });

  describe('middleware', () => {
    it('should create a middleware function', () => {
      const middleware = rateLimiterService.middleware(10, 60000);
      expect(typeof middleware).toBe('function');
    });

    it('should call next() when request is allowed', async () => {
      const middleware = rateLimiterService.middleware(10, 60000);
      const req = { ip: '127.0.0.1', originalUrl: '/test' };
      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': expect.any(Number),
          'X-RateLimit-Remaining': expect.any(Number),
          'X-RateLimit-Reset': expect.any(String)
        })
      );
    });
  });

  describe('getDefaultIdentifier', () => {
    it('should return IP address from request', () => {
      const req = { ip: '192.168.1.1' };
      const identifier = rateLimiterService.getDefaultIdentifier(req);
      expect(identifier).toBe('192.168.1.1');
    });

    it('should fallback to other IP fields', () => {
      const req = {
        connection: { remoteAddress: '192.168.1.2' }
      };
      const identifier = rateLimiterService.getDefaultIdentifier(req);
      expect(identifier).toBe('192.168.1.2');
    });
  });

  describe('getUserIdentifier', () => {
    it('should return user ID when authenticated', () => {
      const req = { user: { id: 'user123' } };
      const identifier = rateLimiterService.getUserIdentifier(req);
      expect(identifier).toBe('user:user123');
    });

    it('should fallback to IP when not authenticated', () => {
      const req = { ip: '127.0.0.1' };
      const identifier = rateLimiterService.getUserIdentifier(req);
      expect(identifier).toBe('127.0.0.1');
    });
  });

  describe('getStatus', () => {
    it('should return status information', async () => {
      const status = await rateLimiterService.getStatus('test_identifier', 10, 60000);
      
      expect(status).toEqual(
        expect.objectContaining({
          currentCount: expect.any(Number),
          remaining: expect.any(Number),
          maxRequests: 10,
          windowMs: 60000,
          resetTime: expect.any(Number)
        })
      );
    });
  });

  describe('reset', () => {
    it('should reset rate limit for identifier', async () => {
      const result = await rateLimiterService.reset('test_identifier');
      expect(typeof result).toBe('boolean');
    });
  });
});
