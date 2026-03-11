import { rateLimiterService } from '../services/rateLimiter.service.js';
import { ApiError } from '../utils/ApiError.js';
import { AsyncHandler } from '../utils/AsyncHandler.js';

/**
 * Middleware to apply rate limiting to a route
 * @param {number} limit - Max requests
 * @param {number} windowInSeconds - Time window
 */
export const rateLimit = (limit = 100, windowInSeconds = 60) => {
    return AsyncHandler(async (req, res, next) => {
        const key = `ratelimit:${req.ip}:${req.originalUrl}`;
        
        const isLimited = await rateLimiterService.isRateLimited(
            key,
            limit,
            windowInSeconds
        );

        if (isLimited) {
            throw new ApiError(429, 'Too many requests, please try again later');
        }

        next();
    });
};
