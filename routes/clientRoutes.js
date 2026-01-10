import express from 'express';
const router = express.Router();
import { getClients, addClient } from '../controllers/clientController.js';

// Route: GET /api/clients
router.get('/', getClients);

// Route: POST /api/clients
router.post('/', addClient);

export default router;