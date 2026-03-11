// import { redis } from '../config/redis.config.js';

class RateLimiterService {
    /**
     * Sliding Window Rate Limiter using Redis Lua Script
     * @param {string} key - e.g., 'rate_limit:ip_address'
     * @param {number} limit - Max requests allowed
     * @param {number} windowInSeconds - Time window size
     */
    async isRateLimited(key, limit, windowInSeconds) {
        // Lua script for atomic sliding window operation
        const luaScript = `
            local key = KEYS[1]
            local limit = tonumber(ARGV[1])
            local window = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            
            -- Remove old requests outside the window
            redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)
            
            -- Count current requests in the window
            local count = redis.call('ZCARD', key)
            
            if count < limit then
                -- Add current request
                redis.call('ZADD', key, now, now)
                -- Set expiry for the key to clean up eventually
                redis.call('EXPIRE', key, window)
                return 0 -- Not limited
            else
                return 1 -- Rate limited
            end
        `;

        const now = Date.now();
        
        /* 
        try {
            // Evaluates the Lua script on Redis
            // EVAL script numkeys key [key ...] arg [arg ...]
            const result = await redis.eval(luaScript, 1, key, limit, windowInSeconds, now);
            return result === 1;
        } catch (error) {
            console.error('RateLimiter Error:', error);
            return false; // Fail open in case of Redis failure (or fail closed based on policy)
        }
        */
        
        // Mocking for now since Redis is not configured
        console.log(`Checking rate limit for ${key} (Limit: ${limit}, Window: ${windowInSeconds}s)`);
        return false; 
    }
}

export const rateLimiterService = new RateLimiterService();
