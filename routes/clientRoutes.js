import express from 'express';
const router = express.Router();
import { getClients, addClient, updateClient, deleteClient} from '../controllers/clientController.js';

// Route: GET /api/clients
router.get('/', getClients);

// Route: POST /api/clients
router.post('/', addClient);

// Route: /api/clients/:id
router.put('/:id', updateClient);

// Route: /api/clients/:id
router.delete('/:id', deleteClient); 

export default router;