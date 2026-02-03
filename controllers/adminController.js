import apiInstance from "../config/brevo.js"; 
import DocumentRequest from '../models/DocumentRequest.js';
import Client from '../models/Client.js';
import ServiceRequest from '../models/serviceRequest.js'; // Import the WhatsApp model

/**
 * 1. UNIVERSAL DOCUMENT REQUEST (Brevo Email + DB Log)
 */
export const requestPaidUpLetter = async (req, res) => {
  const { idNumber, creditorName, creditorEmail, requestType = 'Paid-Up' } = req.body;

  try {
    const client = await Client.findOne({ idNumber });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client ID not found in database." });
    }

    const typeMap = {
      'Paid-Up': "a Paid-up Letter",
      'Prescription': "the removal of Prescribed Debt (Prescription)",
      'Debt Review': "the Debt Review Removal Certificate (Form 19)",
      'Defaults': "the removal of Adverse Defaults/Judgments"
    };

    const requestedItem = typeMap[requestType] || "the requested documentation";

    const emailData = {
      sender: { name: "MKH Admin", email: process.env.ADMIN_EMAIL },
      to: [{ email: creditorEmail, name: creditorName }],
      subject: `Official ${requestType} Request: ${client.name} (${idNumber})`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #00B4D8; border-bottom: 2px solid #00B4D8; padding-bottom: 10px;">MKH Debtors & Solutions</h2>
          <p>Dear <strong>${creditorName}</strong> Team,</p>
          <p>We are formally requesting <strong>${requestedItem}</strong> for the following client:</p>
          <div style="background-color: #f4f7f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Full Name:</strong> ${client.name}</p>
            <p style="margin: 5px 0;"><strong>ID Number:</strong> ${idNumber}</p>
            <p style="margin: 5px 0;"><strong>Inquiry Type:</strong> ${requestType}</p>
          </div>
          <p>Please review your records and reply to this email (<em>${process.env.ADMIN_EMAIL}</em>) with the requested documentation attached.</p>
          <br>
          <p>Regards,</p>
          <p><strong>Admin Department</strong><br/>MKH Debtors & Solutions</p>
        </div>
      `
    };

    await apiInstance.sendTransacEmail(emailData);

    const newRequest = await DocumentRequest.create({
      client: client._id,
      clientName: client.name,
      idNumber: idNumber,
      creditorName: creditorName,
      creditorEmail: creditorEmail,
      requestType: requestType, 
      status: 'Pending'
    });

    res.status(200).json({ success: true, message: `${requestType} request sent successfully.`, data: newRequest });

  } catch (error) {
    console.error("DETAILED ERROR:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Failed to process document request.", details: error.response?.data || error.message });
  }
};

/**
 * 2. GET WHATSAPP SERVICE REQUESTS (For the new Requests Page)
 */
export const getWhatsAppRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find().sort({ createdAt: -1 });

    const formattedRequests = requests.map(req => {
      const doc = req.toObject();
      return {
        _id: doc._id,
        clientName: doc.clientName || "New Client",
        clientPhone: doc.clientPhone,
        // Convert "CREDIT_REPORT" to "Credit Report" for cleaner UI
        requestType: doc.serviceType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        status: doc.status || 'PENDING',
        createdAt: doc.createdAt,
        creditorName: doc.details?.creditorName || "Bureau Report",
        details: doc.details // Pass all data for the "View" modal
      };
    });

    res.status(200).json({ success: true, data: formattedRequests });
  } catch (error) {
    console.error("WhatsApp Fetch Error:", error);
    res.status(500).json({ success: false, message: "Could not fetch WhatsApp requests." });
  }
};

/**
 * 3. UPLOAD RECEIVED DOCUMENT
 */
export const uploadReceivedDocument = async (req, res) => {
  const { requestId } = req.params;
  const fileUrl = req.file ? req.file.path : req.body.fileUrl;

  if (!fileUrl) return res.status(400).json({ success: false, message: "No document provided." });

  try {
    const updatedRequest = await DocumentRequest.findByIdAndUpdate(
      requestId,
      { status: 'Received', documentUrl: fileUrl, dateReceived: new Date() },
      { new: true }
    );
    if (!updatedRequest) return res.status(404).json({ success: false, message: "Request not found." });
    res.status(200).json({ success: true, message: "Document attached.", data: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error during upload." });
  }
};

/**
 * 4. UPDATE DOCUMENT STATUS
 */
export const updateDocumentStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  try {
    const updatedRequest = await DocumentRequest.findByIdAndUpdate(
      requestId,
      { status, dateReceived: status === 'Received' ? new Date() : null },
      { new: true }
    );
    if (!updatedRequest) return res.status(404).json({ success: false, message: "Not found." });
    res.status(200).json({ success: true, data: updatedRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed." });
  }
};

/**
 * 5. DELETE REQUESTS (General)
 */
export const deleteDocumentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    // Check both collections to ensure we delete the right one
    const deletedDoc = await DocumentRequest.findByIdAndDelete(requestId);
    const deletedService = await ServiceRequest.findByIdAndDelete(requestId);
    
    res.status(200).json({ success: true, message: "Deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * 6. GET DASHBOARD STATS
 */
export const getDashboardStats = async (req, res) => {
  try {
    const activeClients = await Client.countDocuments({ accountStatus: { $in: ['Lead', 'Client'] } });
    const pendingDocs = await DocumentRequest.countDocuments({ status: 'Pending' });
    const completedDocs = await DocumentRequest.countDocuments({ status: 'Received' });

    const recentRequests = await DocumentRequest.find().sort({ createdAt: -1 }).limit(5);

    res.status(200).json({ success: true, stats: { activeClients, pendingDocs, completedDocs }, recentRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. GET ALL LOGS (Manual Document Requests Only)
 */
export const getAllDocumentRequests = async (req, res) => {
  try {
    const logs = await DocumentRequest.find().populate('client', 'name').sort({ createdAt: -1 });
    const sanitizedLogs = logs.map(log => {
      const doc = log.toObject();
      return { ...doc, clientName: doc.clientName || doc.client?.name || "Unknown Client" };
    });
    res.status(200).json({ success: true, data: sanitizedLogs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not fetch logs." });
  }
};
