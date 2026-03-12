import { Url } from '../models/url.model.js';
import { ApiError } from '../utils/ApiError.js';
import { redisClient } from '../config/redis.js';

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

/**
 * Decodes a Base62 string back to a number
 * @param {string} str 
 * @returns {number}
 */
const decode = (str) => {
    let decoded = 0;
    for (let i = 0; i < str.length; i++) {
        decoded = decoded * BASE + ALPHABET.indexOf(str.charAt(i));
    }
    return decoded;
};

class UrlService {
    constructor() {
        this.cacheKeyPrefix = 'url:';
        this.counterKey = 'url_counter';
        this.defaultTTL = 3600; // 1 hour
    }

    /**
     * Gets the next available ID from Redis counter
     * @returns {Promise<number>}
     */
    async getNextId() {
        try {
            const client = redisClient.getClient();
            const nextId = await client.incr(this.counterKey);
            return nextId;
        } catch (error) {
            console.error('Redis counter error, falling back to database:', error);
            // Fallback to database count
            const count = await Url.countDocuments();
            return count + Date.now();
        }
    }

    /**
     * Shortens a URL with Redis-backed distributed counter
     * @param {string} originalUrl 
     * @param {string} userId 
     */
    async shortenUrl(originalUrl, userId) {
        if (!originalUrl) {
            throw new ApiError(400, 'Original URL is required');
        }

        // Validate URL format
        try {
            new URL(originalUrl);
        } catch {
            throw new ApiError(400, 'Invalid URL format');
        }

        // Check if URL already exists for this user
        let url = await Url.findOne({ originalUrl, createdBy: userId });
        if (url) {
            // Cache existing URL
            await this.cacheUrl(url.shortCode, url.originalUrl);
            return url;
        }

        // Get next ID from distributed counter
        const nextId = await this.getNextId();
        const shortCode = encode(nextId);

        // Create new URL entry
        url = await Url.create({
            originalUrl,
            shortCode,
            createdBy: userId,
        });

        // Cache the new URL immediately
        await this.cacheUrl(shortCode, originalUrl);

        return url;
    }

    /**
     * Caches a URL in Redis with TTL
     * @param {string} shortCode 
     * @param {string} originalUrl 
     * @param {number} ttl - Time to live in seconds
     */
    async cacheUrl(shortCode, originalUrl, ttl = this.defaultTTL) {
        try {
            const client = redisClient.getClient();
            await client.setEx(`${this.cacheKeyPrefix}${shortCode}`, ttl, originalUrl);
        } catch (error) {
            console.error('Redis cache error:', error);
            // Don't fail the operation if caching fails
        }
    }

    /**
     * Resolves a short code to the original URL with Redis caching
     * @param {string} shortCode 
     */
    async resolveUrl(shortCode) {
        if (!shortCode) {
            throw new ApiError(400, 'Short code is required');
        }

        // 1. Try Redis cache first for O(1) lookup
        try {
            const client = redisClient.getClient();
            const cachedUrl = await client.get(`${this.cacheKeyPrefix}${shortCode}`);
            if (cachedUrl) {
                // Increment click count asynchronously
                this.incrementClickCount(shortCode);
                return cachedUrl;
            }
        } catch (error) {
            console.error('Redis cache read error:', error);
        }

        // 2. Fallback to Database
        const url = await Url.findOne({ shortCode });
        if (!url) {
            throw new ApiError(404, 'URL not found');
        }

        // 3. Update clicks and cache asynchronously
        this.incrementClickCount(shortCode);
        await this.cacheUrl(shortCode, url.originalUrl);

        return url.originalUrl;
    }

    /**
     * Increments click count for a URL (fire-and-forget)
     * @param {string} shortCode 
     */
    async incrementClickCount(shortCode) {
        try {
            // Update database asynchronously
            await Url.updateOne({ shortCode }, { $inc: { clicks: 1 } });
        } catch (error) {
            console.error('Click count update error:', error);
        }
    }

    /**
     * Gets URL statistics
     * @param {string} shortCode 
     */
    async getUrlStats(shortCode) {
        if (!shortCode) {
            throw new ApiError(400, 'Short code is required');
        }

        const url = await Url.findOne({ shortCode });
        if (!url) {
            throw new ApiError(404, 'URL not found');
        }

        return {
            shortCode: url.shortCode,
            originalUrl: url.originalUrl,
            clicks: url.clicks,
            createdAt: url.createdAt,
            createdBy: url.createdBy
        };
    }

    /**
     * Clears cache for a specific URL
     * @param {string} shortCode 
     */
    async clearCache(shortCode) {
        try {
            const client = redisClient.getClient();
            await client.del(`${this.cacheKeyPrefix}${shortCode}`);
            return true;
        } catch (error) {
            console.error('Cache clear error:', error);
            return false;
        }
    }

    /**
     * Batch cache warming for frequently accessed URLs
     * @param {Array} urls - Array of {shortCode, originalUrl} objects
     */
    async batchCache(urls) {
        try {
            const client = redisClient.getClient();
            const pipeline = client.multi();
            
            urls.forEach(({ shortCode, originalUrl }) => {
                pipeline.setEx(`${this.cacheKeyPrefix}${shortCode}`, this.defaultTTL, originalUrl);
            });
            
            await pipeline.exec();
            return true;
        } catch (error) {
            console.error('Batch cache error:', error);
            return false;
        }
    }
}

export const urlService = new UrlService();
