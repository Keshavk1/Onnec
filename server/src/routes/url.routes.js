import { Router } from 'express';
import { shortenUrl, redirectUrl, getUrlStats } from '../controllers/url.controller.js';
import { rateLimit } from '../middlewares/rateLimiter.middleware.js';
// import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Public route for redirection
router.route('/:shortCode').get(redirectUrl);

// Protected routes (apply auth middleware when ready)
router.route('/shorten').post(rateLimit(10, 60), shortenUrl);
router.route('/stats/:shortCode').get(getUrlStats);

export default router;
