import { urlService } from '../services/url.service.js';
import { AsyncHandler } from '../utils/AsyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const shortenUrl = AsyncHandler(async (req, res) => {
    const { originalUrl } = req.body;
    const userId = req.user?._id; // Assuming user is authenticated

    if (!originalUrl) {
        throw new ApiError(400, 'URL is required');
    }

    const url = await urlService.shortenUrl(originalUrl, userId);

    return res
        .status(201)
        .json(new ApiResponse(201, url, 'URL shortened successfully'));
});

const redirectUrl = AsyncHandler(async (req, res) => {
    const { shortCode } = req.params;

    const originalUrl = await urlService.resolveUrl(shortCode);

    // In a production app, we might want to track analytics here
    return res.redirect(originalUrl);
});

const getUrlStats = AsyncHandler(async (req, res) => {
    const { shortCode } = req.params;
    // Implementation for stats...
});

export { shortenUrl, redirectUrl, getUrlStats };
