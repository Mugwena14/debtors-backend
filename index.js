import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { handleQuoteRequest } from './controllers/quoteController.js';

dotenv.config();

const app = express();

// 1. CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Update with your actual URL
  methods: ['POST']
}));

app.use(express.json());

// 2. Multer Configuration (Memory Storage)

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for ID copies
});

// 3. The Route
// 'idCopy' must match the field name used in your React FormData.append('idCopy', ...)
app.post('/api/quote', upload.array('idCopy', 2), handleQuoteRequest);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 MKH Backend running on port ${PORT}`));