import { redisClient } from '../config/redis.js';

class RateLimiterService {
    constructor() {
        this.defaultWindowMs = 60000; // 1 minute
        this.defaultMaxRequests = 100;
    }

    /**
     * Sliding window rate limiter using Redis
     * @param {string} identifier - Unique identifier (IP, user ID, etc.)
     * @param {number} maxRequests - Maximum requests allowed
     * @param {number} windowMs - Time window in milliseconds
     * @returns {Promise<{allowed: boolean, remaining: number, resetTime: number}>}
     */
    async isAllowed(identifier, maxRequests = this.defaultMaxRequests, windowMs = this.defaultWindowMs) {
        try {
            const client = redisClient.getClient();
            const now = Date.now();
            const windowStart = now - windowMs;
            const key = `rate_limit:${identifier}`;

            // Use a transaction to ensure atomicity
            const pipeline = client.multi();

            // Remove expired entries
            pipeline.zRemRangeByScore(key, 0, windowStart);

            // Count current requests in window
            pipeline.zCard(key);

            // Add current request
            pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });

            // Set expiration on the key
            pipeline.expire(key, Math.ceil(windowMs / 1000));

            const results = await pipeline.exec();

            const currentCount = results[1].response;
            const allowed = currentCount < maxRequests;
            const remaining = Math.max(0, maxRequests - currentCount - 1);
            const resetTime = now + windowMs;

            return {
                allowed,
                remaining,
                resetTime,
                currentCount: currentCount + 1,
                maxRequests,
                windowMs
            };

        } catch (error) {
            console.error('Rate limiter error:', error);
            // Fail open - allow request if Redis is down
            return {
                allowed: true,
                remaining: maxRequests - 1,
                resetTime: Date.now() + windowMs,
                currentCount: 1,
                maxRequests,
                windowMs
            };
        }
    }

    /**
     * Express middleware for rate limiting
     * @param {number} maxRequests - Maximum requests per window
     * @param {number} windowMs - Time window in milliseconds
     * @param {Function} keyGenerator - Function to generate unique key from request
     */
    middleware(maxRequests = this.defaultMaxRequests, windowMs = this.defaultWindowMs, keyGenerator = null) {
        return async (req, res, next) => {
            try {
                // Generate identifier for rate limiting
                const identifier = keyGenerator 
                    ? keyGenerator(req) 
                    : this.getDefaultIdentifier(req);

                const result = await this.isAllowed(identifier, maxRequests, windowMs);

                // Set rate limit headers
                res.set({
                    'X-RateLimit-Limit': result.maxRequests,
                    'X-RateLimit-Remaining': result.remaining,
                    'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
                });

                if (!result.allowed) {
                    return res.status(429).json({
                        error: 'Too Many Requests',
                        message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
                        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
                    });
                }

                next();
            } catch (error) {
                console.error('Rate limiter middleware error:', error);
                next(); // Fail open
            }
        };
    }

    /**
     * Default identifier generator using IP address
     */
    getDefaultIdentifier(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
               'unknown';
    }

    /**
     * User-based rate limiting identifier
     */
    getUserIdentifier(req) {
        return req.user?.id ? `user:${req.user.id}` : this.getDefaultIdentifier(req);
    }

    /**
     * Get current rate limit status for an identifier
     */
    async getStatus(identifier, maxRequests = this.defaultMaxRequests, windowMs = this.defaultWindowMs) {
        try {
            const client = redisClient.getClient();
            const now = Date.now();
            const windowStart = now - windowMs;
            const key = `rate_limit:${identifier}`;

            // Count current requests in window
            await client.zRemRangeByScore(key, 0, windowStart);
            const currentCount = await client.zCard(key);

            return {
                currentCount,
                remaining: Math.max(0, maxRequests - currentCount),
                maxRequests,
                windowMs,
                resetTime: now + windowMs
            };
        } catch (error) {
            console.error('Rate limiter status error:', error);
            return null;
        }
    }

    /**
     * Reset rate limit for a specific identifier
     */
    async reset(identifier) {
        try {
            const client = redisClient.getClient();
            const key = `rate_limit:${identifier}`;
            await client.del(key);
            return true;
        } catch (error) {
            console.error('Rate limiter reset error:', error);
            return false;
        }
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use isAllowed instead
     */
    async isRateLimited(identifier, limit, windowInSeconds) {
        const result = await this.isAllowed(identifier, limit, windowInSeconds * 1000);
        return !result.allowed;
    }
}

export const rateLimiterService = new RateLimiterService();
