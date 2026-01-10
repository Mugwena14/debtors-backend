import express from 'express';
import multer from 'multer';
import { 
  requestPaidUpLetter, 
  uploadReceivedDocument, 
  getAllDocumentRequests 
} from '../controllers/adminController.js';

const router = express.Router();

// Configure Multer for PDF uploads (saving to a 'uploads/docs' folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/docs/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });


// Send email to creditor via Brevo
router.post('/request-document', requestPaidUpLetter);

// Fetch all request logs for the dashboard
router.get('/logs', getAllDocumentRequests);

// Upload the reply document
router.put('/upload-document/:requestId', upload.single('paidUpLetter'), uploadReceivedDocument);

export default router;