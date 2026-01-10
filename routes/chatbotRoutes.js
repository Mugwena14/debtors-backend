import express from 'express';
import { handleIncomingMessage } from '../controllers/chatController.js';

const router = express.Router();

// Logic handled in the controller
router.post('/incoming', handleIncomingMessage);

export default router;