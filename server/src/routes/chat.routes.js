import { Router } from 'express';
import { 
    createOrGetChat, 
    sendMessage, 
    getMessages, 
    getMyChats 
} from '../controllers/chat.controller.js';
// import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// All chat routes should be protected
// router.use(verifyJWT);

router.route('/').get(getMyChats);
router.route('/c').post(createOrGetChat);
router.route('/m').post(sendMessage);
router.route('/m/:chatId').get(getMessages);

export default router;
