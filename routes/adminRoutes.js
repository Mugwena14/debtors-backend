import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import { login } from '../controllers/authController.js'; // Import login from authController
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

// --- MULTER CONFIGURATIONS ---

// Disk Storage: For permanent document uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/docs/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const uploadDisk = multer({ storage: diskStorage });

// Memory Storage: For temporary processing (like email attachments)
const memoryStorage = multer.memoryStorage();
const uploadMemory = multer({ 
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// --- PUBLIC ROUTES ---

/**
 * @route   POST /api/admin/login
 * @desc    Admin authentication - Must be public (no protect middleware)
 */
router.post('/login', login);

// --- PROTECTED API ENDPOINTS ---
// All routes below this line require a valid Bearer Token

/**
 * @route   POST /api/admin/send-client-email
 */
router.post(
  '/send-client-email', 
  protect, 
  uploadMemory.single('attachment'), 
  handleAdminReplyEmail
);

/**
 * @route   POST /api/admin/request-document
 */
router.post(
  '/request-document', 
  protect, 
  uploadMemory.fields([
    { name: 'idFile', maxCount: 1 },
    { name: 'poaFile', maxCount: 1 }
  ]), 
  requestPaidUpLetter
);

/**
 * @route   GET /api/admin/logs
 */
router.get('/logs', protect, getAllDocumentRequests);

/**
 * @route   GET /api/admin/whatsapp-requests
 */
router.get('/whatsapp-requests', protect, getWhatsAppRequests);

/**
 * @route   PUT /api/admin/upload-document/:requestId
 */
router.put(
  '/upload-document/:requestId', 
  protect, 
  uploadDisk.single('paidUpLetter'), 
  uploadReceivedDocument
);

/**
 * @route   PATCH /api/admin/update-request-status/:requestId
 */
router.patch('/update-request-status/:requestId', protect, updateDocumentStatus);

/**
 * @route   DELETE /api/admin/delete-request/:requestId
 */
router.delete('/delete-request/:requestId', protect, deleteDocumentRequest);

/**
 * @route   GET /api/admin/stats
 */
router.get('/stats', protect, getDashboardStats);

export default router;
