import { Url } from '../models/url.model.js';
import { ApiError } from '../utils/ApiError.js';
// Redis will be imported and used here when configured
// import { redis } from '../config/redis.config.js';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = ALPHABET.length;

/**
 * Encodes a numeric ID to a Base62 string
 * @param {number} num 
 * @returns {string}
 */
const encode = (num) => {
    let encoded = '';
    while (num > 0) {
        encoded = ALPHABET.charAt(num % BASE) + encoded;
        num = Math.floor(num / BASE);
    }
    return encoded || '0';
};

class UrlService {
    /**
     * Shortens a URL
     * @param {string} originalUrl 
     * @param {string} userId 
     */
    async shortenUrl(originalUrl, userId) {
        if (!originalUrl) {
            throw new ApiError(400, 'Original URL is required');
        }

        // Check if URL already exists for this user
        let url = await Url.findOne({ originalUrl, createdBy: userId });
        if (url) return url;

        // Create a new entry to get an ID for encoding
        // Or use a counter/nanoid. Here we'll use a simple approach for now.
        // In a production distributed system, we'd use a counter in Redis.
        
        // Temporary: Generate a unique code (we'll replace this with proper distributed counter logic)
        const count = await Url.countDocuments();
        const shortCode = encode(Date.now() + count);

        url = await Url.create({
            originalUrl,
            shortCode,
            createdBy: userId,
        });

        return url;
    }

    /**
     * Resolves a short code to the original URL
     * @param {string} shortCode 
     */
    async resolveUrl(shortCode) {
        // 1. Try to get from Redis Cache first (for constant-time redirection)
        // const cachedUrl = await redis.get(`url:${shortCode}`);
        // if (cachedUrl) return cachedUrl;

        // 2. Fallback to Database
        const url = await Url.findOne({ shortCode });
        if (!url) {
            throw new ApiError(404, 'URL not found');
        }

        // 3. Update clicks asynchronously
        url.clicks += 1;
        await url.save();

        // 4. Cache in Redis for future requests
        // await redis.set(`url:${shortCode}`, url.originalUrl, 'EX', 3600); // Cache for 1 hour

        return url.originalUrl;
    }
}

export const urlService = new UrlService();
