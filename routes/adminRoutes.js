import express from 'express';
import multer from 'multer';
import ServiceRequest from '../models/serviceRequest.js'; 
import { 
  requestPaidUpLetter, 
  uploadReceivedDocument, 
  getAllDocumentRequests,
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

// API ENDPOINTS (FOR MANAGEMENT)

// Send email to creditor via Brevo
router.post('/request-document', requestPaidUpLetter);

// Fetch all request logs for the dashboard
router.get('/logs', getAllDocumentRequests);

// Upload the reply document 
router.put('/upload-document/:requestId', upload.single('paidUpLetter'), uploadReceivedDocument);

// Update the status manually 
router.put('/update-status/:requestId', updateDocumentStatus);

// Delete a request record
router.delete('/delete-request/:requestId', deleteDocumentRequest);

// Get Dashboard stats
router.get('/stats', getDashboardStats);


/**
 * @route   GET /api/admin/dashboard
 * @desc    View all WhatsApp service requests in a browser table
 * @access  Private (Password Protected)
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Key for Verification
    // URL: /api/admin/dashboard?pass=MKH2024
    if (req.query.pass !== 'MKH2024') {
      return res.status(401).send(`
        <div style="text-align:center; margin-top:100px; font-family:sans-serif; color:#444;">
          <h1 style="font-size: 50px;">🔒</h1>
          <h1>Unauthorized Access</h1>
          <p>Please provide the correct password in the URL to view the dashboard.</p>
        </div>
      `);
    }

    // Fetch all requests from the Bot
    const requests = await ServiceRequest.find().sort({ createdAt: -1 });

    // Map database entries to HTML table rows
    const tableRows = requests.map(request => {
      const date = new Date(request.createdAt).toLocaleString('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Check if the service involved a file upload (POP, ID, Car App Docs)
      const mediaLink = request.details?.mediaUrl 
        ? `<a href="${request.details.mediaUrl}" target="_blank" style="background:#25D366; color:white; text-decoration:none; padding:5px 10px; border-radius:5px; font-size:11px; font-weight:bold;">View File 📄</a>` 
        : '<span style="color:#999; font-size:12px;">No File</span>';

      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding:15px; font-size: 13px; color: #666;">${date}</td>
          <td style="padding:15px;">
            <div style="font-weight:bold; color:#333;">${request.clientName || 'New Client'}</div>
            <div style="font-size:12px; color:#075E54;">${request.clientPhone}</div>
          </td>
          <td style="padding:15px;">
            <span style="background:#e3f2fd; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:bold; color:#1976d2; text-transform:uppercase;">
              ${request.serviceType.replace(/_/g, ' ')}
            </span>
          </td>
          <td style="padding:15px; text-align:center;">${mediaLink}</td>
          <td style="padding:15px;">
            <details style="cursor:pointer;">
                <summary style="font-size:12px; font-weight:600; color:#075E54;">Expand Details</summary>
                <div style="background:#fdfdfd; border:1px solid #eee; padding:10px; margin-top:5px; border-radius:5px;">
                  <pre style="font-size:11px; white-space: pre-wrap; margin:0; color:#444;">${JSON.stringify(request.details, null, 2)}</pre>
                </div>
            </details>
          </td>
          <td style="padding:15px;">
            <span style="color:#128C7E; font-weight:bold; font-size:13px;">● ${request.status}</span>
          </td>
        </tr>`;
    }).join('');

    // send the full thing HTML Page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MKH Bot Inbox | Admin Dashboard</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f0f2f5; margin: 0; padding: 30px; }
            .container { background: white; max-width: 1200px; margin: 0 auto; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden; }
            .header { background: #075E54; color: white; padding: 30px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { margin:0; font-size:24px; letter-spacing: -0.5px; }
            .stat-badge { background: rgba(255,255,255,0.15); padding: 8px 18px; border-radius: 25px; font-size: 14px; border: 1px solid rgba(255,255,255,0.2); }
            table { width: 100%; border-collapse: collapse; }
            th { background: #fcfcfc; text-align: left; padding: 18px; border-bottom: 2px solid #f0f0f0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
            tr:hover { background: #f9f9f9; }
            td { vertical-align: middle; border-bottom: 1px solid #f8f8f8; }
            .empty-state { padding: 60px; text-align: center; color: #aaa; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div>
                <h1>MKH Service Inbox</h1>
                <p style="margin:5px 0 0; font-size:13px; opacity:0.8;">Live tracking of WhatsApp interactions</p>
              </div>
              <div class="stat-badge">Total Service Requests: <strong>${requests.length}</strong></div>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 15%;">Date Submitted</th>
                  <th style="width: 20%;">Client</th>
                  <th style="width: 20%;">Service Type</th>
                  <th style="width: 10%; text-align:center;">Evidence</th>
                  <th style="width: 25%;">Collected Data</th>
                  <th style="width: 10%;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows.length > 0 ? tableRows : '<tr><td colspan="6" class="empty-state"><h3>Inbox Empty</h3><p>Requests will appear here as clients complete them via WhatsApp.</p></td></tr>'}
              </tbody>
            </table>
          </div>
          <p style="text-align:center; font-size:12px; color:#999; margin-top:25px;">MKH Debtors & Solutions Dashboard &copy; 2026</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`
      <div style="padding:20px; border:1px solid red; background:#fff1f1; border-radius:8px; font-family:sans-serif;">
        <h3 style="color:red; margin-top:0;">Dashboard Rendering Error</h3>
        <p>${err.message}</p>
      </div>
    `);
  }
});

export default router;