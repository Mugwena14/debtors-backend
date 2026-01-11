import express from 'express';
import multer from 'multer';
import { 
  requestPaidUpLetter, 
  uploadReceivedDocument, 
  getAllDocumentRequests,
  updateDocumentStatus // Added this import
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


// 1. Send email to creditor via Brevo
router.post('/request-document', requestPaidUpLetter);

// 2. Fetch all request logs for the dashboard
router.get('/logs', getAllDocumentRequests);

// 3. Upload the reply document (Keep this for when you DO have a file)
router.put('/upload-document/:requestId', upload.single('paidUpLetter'), uploadReceivedDocument);

// 4. NEW: Update the status manually (Mark as Received without file)
router.put('/update-status/:requestId', updateDocumentStatus);

export default router;
