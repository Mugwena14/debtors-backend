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

// --- DATABASE CONNECTION ---
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
    console.error('❌ MONGODB_URI is missing from .env or Render Environment Variables!');
} else {
    mongoose.connect(mongoURI)
      .then(() => console.log('🍃 MongoDB Connected'))
      .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// --- CORS CONFIGURATION ---
const allowedOrigins = [
  'http://localhost:5173',
  'https://mkhdebtors.co.za',
  'https://www.mkhdebtors.co.za'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from origin: ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  // ADDED 'PATCH' HERE TO RESOLVE YOUR ERROR
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
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

// --- ROUTES ---
app.post('/api/quote', upload.array('idCopy', 2), handleQuoteRequest);
app.use('/whatsapp', chatbotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/clients', clientRoutes); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 MKH Backend running on port ${PORT}`));
