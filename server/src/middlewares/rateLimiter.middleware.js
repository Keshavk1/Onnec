import { rateLimiterService } from '../services/rateLimiter.service.js';
import { ApiError } from '../utils/ApiError.js';
import { AsyncHandler } from '../utils/AsyncHandler.js';

/**
 * Middleware to apply rate limiting to a route
 * @param {number} limit - Max requests
 * @param {number} windowInSeconds - Time window
 * @param {Function} keyGenerator - Optional custom key generator
 */
export const rateLimit = (limit = 100, windowInSeconds = 60, keyGenerator = null) => {
    return AsyncHandler(async (req, res, next) => {
        const identifier = keyGenerator 
            ? keyGenerator(req) 
            : `ratelimit:${req.ip}:${req.originalUrl}`;
        
        const result = await rateLimiterService.isAllowed(
            identifier,
            limit,
            windowInSeconds * 1000
        );

        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': result.maxRequests,
            'X-RateLimit-Remaining': result.remaining,
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
        });

        if (!result.allowed) {
            throw new ApiError(429, `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`);
        }

        next();
    });
};

/**
 * User-based rate limiting middleware
 * @param {number} limit - Max requests per user
 * @param {number} windowInSeconds - Time window
 */
export const userRateLimit = (limit = 50, windowInSeconds = 60) => {
    return rateLimit(limit, windowInSeconds, rateLimiterService.getUserIdentifier);
};

/**
 * IP-based rate limiting middleware (default behavior)
 * @param {number} limit - Max requests per IP
 * @param {number} windowInSeconds - Time window
 */
export const ipRateLimit = (limit = 100, windowInSeconds = 60) => {
    return rateLimit(limit, windowInSeconds, rateLimiterService.getDefaultIdentifier);
};
