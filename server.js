import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Route Imports
import { handleQuoteRequest } from './controllers/quoteController.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import clientRoutes from './routes/clientRoutes.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🍃 MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['POST', 'GET', 'PUT', 'DELETE']
}));

app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));

// Serve uploaded documents as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Configuration for Quotes
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } 
});

// Routes

// Quote Route
app.post('/api/quote', upload.array('idCopy', 2), handleQuoteRequest);

// Chatbot Route
app.use('/whatsapp', chatbotRoutes);

// Admin Management
app.use('/api/admin', adminRoutes);

// Client Management Routes 
app.use('/api/clients', clientRoutes); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 MKH Backend running on port ${PORT}`));
