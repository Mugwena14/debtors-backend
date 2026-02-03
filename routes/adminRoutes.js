import express from 'express';
import multer from 'multer';
import { 
  requestPaidUpLetter, 
  uploadReceivedDocument, 
  getAllDocumentRequests,
  getWhatsAppRequests,
  updateDocumentStatus,
  deleteDocumentRequest,
  getDashboardStats
} from '../controllers/adminController.js';

const router = express.Router();

// Configure Multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/docs/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// --- API ENDPOINTS (FOR REACT FRONTEND) ---

/**
 * @route   POST /api/admin/request-document
 * @desc    Send email to creditor via Brevo and log request
 */
router.post('/request-document', requestPaidUpLetter);

/**
 * @route   GET /api/admin/logs
 * @desc    Fetch manual document request logs (Paid Up, Prescription, etc.)
 */
router.get('/logs', getAllDocumentRequests);

/**
 * @route   GET /api/admin/whatsapp-requests
 * @desc    Fetch all WhatsApp bot service requests for the Requests Page
 */
router.get('/whatsapp-requests', getWhatsAppRequests);

/**
 * @route   PUT /api/admin/upload-document/:requestId
 * @desc    Upload the reply document received from a creditor
 */
router.put('/upload-document/:requestId', upload.single('paidUpLetter'), uploadReceivedDocument);

/**
 * @route   PUT /api/admin/update-status/:requestId
 * @desc    Update status manually (Pending/Received/etc.)
 */
router.put('/update-status/:requestId', updateDocumentStatus);

/**
 * @route   DELETE /api/admin/delete-request/:requestId
 * @desc    Delete a request record (Handles both manual and WhatsApp requests)
 */
router.delete('/delete-request/:requestId', deleteDocumentRequest);

/**
 * @route   GET /api/admin/stats
 * @desc    Get counts and recent activity for the Dashboard
 */
router.get('/stats', getDashboardStats);

export default router;
