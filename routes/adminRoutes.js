import express from 'express';
import multer from 'multer';
import { 
  requestPaidUpLetter, 
  uploadReceivedDocument, 
  getAllDocumentRequests,
  getWhatsAppRequests,
  updateDocumentStatus,
  deleteDocumentRequest,
  getDashboardStats,
  handleAdminReplyEmail 
} from '../controllers/adminController.js';

const router = express.Router();

// 1. DISK STORAGE: For permanent document uploads (PDFs from creditors)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/docs/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const uploadDisk = multer({ storage: diskStorage });

// 2. MEMORY STORAGE: For temporary email attachments sent via Brevo
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for emails
});

// --- API ENDPOINTS (FOR REACT FRONTEND) ---

/**
 * @route   POST /api/admin/send-client-email
 */
router.post('/send-client-email', uploadMemory.single('attachment'), handleAdminReplyEmail);

/**
 * @route   POST /api/admin/request-document
 */
router.post('/request-document', requestPaidUpLetter);

/**
 * @route   GET /api/admin/logs
 */
router.get('/logs', getAllDocumentRequests);

/**
 * @route   GET /api/admin/whatsapp-requests
 */
router.get('/whatsapp-requests', getWhatsAppRequests);

/**
 * @route   PUT /api/admin/upload-document/:requestId
 */
router.put('/upload-document/:requestId', uploadDisk.single('paidUpLetter'), uploadReceivedDocument);

/**
 * @route   PATCH /api/admin/update-request-status/:requestId
 * @desc    Update status manually. Changed to PATCH and updated path to match Frontend Axios call.
 * We use :requestId as the param name to match your controller logic.
 */
router.patch('/update-request-status/:requestId', updateDocumentStatus);

/**
 * @route   DELETE /api/admin/delete-request/:requestId
 */
router.delete('/delete-request/:requestId', deleteDocumentRequest);

/**
 * @route   GET /api/admin/stats
 */
router.get('/stats', getDashboardStats);

export default router;
