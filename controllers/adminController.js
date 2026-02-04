import apiInstance from "../config/brevo.js"; 
import DocumentRequest from '../models/DocumentRequest.js';
import Client from '../models/Client.js';
import ServiceRequest from '../models/serviceRequest.js'; 

/**
 * 1. SEND MANUAL EMAIL REPLY & LOG TO DATABASE
 */
export const handleAdminReplyEmail = async (req, res) => {
  const { to, subject, message, requestId } = req.body;

  try {
    const attachments = req.file 
      ? [{
          name: req.file.originalname,
          content: req.file.buffer.toString("base64"),
        }]
      : null;

    const emailData = {
      sender: { name: "MKH Debtors Admin", email: process.env.ADMIN_EMAIL },
      to: [{ email: to }],
      subject: subject || "Update regarding your request",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px; border: 1px solid #eee; padding:20px; color:#111; background-color: #ffffff;">
          <h2 style="color:#0033A1; border-bottom: 2px solid #00B4D8; padding-bottom:10px;">Official Correspondence</h2>
          <p style="white-space: pre-line; font-size: 15px;">${message}</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
            <p>This is an automated delivery from the MKH Web Portal on behalf of the Admin team.</p>
            <p><strong>MKH Debtors & Solutions</strong></p>
          </div>
        </div>
      `,
      attachment: attachments,
    };

    await apiInstance.sendTransacEmail(emailData);

    const logEntry = {
      subject: subject || "Update regarding your request",
      message: message,
      attachmentUrl: req.file ? req.file.originalname : "No attachment",
      sentAt: new Date()
    };

    let updatedDoc = await DocumentRequest.findByIdAndUpdate(
      requestId,
      { 
        $push: { replies: logEntry },
        $set: { status: 'In Progress' } 
      },
      { new: true }
    );

    if (!updatedDoc) {
      const whatsappReq = await ServiceRequest.findById(requestId);
      if (whatsappReq) {
        updatedDoc = await DocumentRequest.create({
          clientName: whatsappReq.clientName,
          requestType: whatsappReq.serviceType,
          creditorName: whatsappReq.details?.creditorName || "Client Inquiry",
          creditorEmail: to,
          status: 'In Progress',
          replies: [logEntry]
        });
      }
    }

    res.status(200).json({ 
      success: true, 
      message: "Email delivered and saved to history.",
      data: updatedDoc
    });

  } catch (error) {
    console.error("ADMIN EMAIL REPLY ERROR:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send email or log to database.", 
      details: error.response?.data || error.message 
    });
  }
};

/**
 * 2. UNIVERSAL DOCUMENT REQUEST
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
    res.status(500).json({ success: false, message: "Failed to process document request." });
  }
};

/**
 * 3. GET WHATSAPP SERVICE REQUESTS (FIXED: Populates Client Email)
 */
export const getWhatsAppRequests = async (req, res) => {
  try {
    // Populate the 'client' reference to get the email address
    const requests = await ServiceRequest.find()
      .populate('client', 'email name')
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map(req => {
      const doc = req.toObject();
      return {
        _id: doc._id,
        clientName: doc.clientName || doc.client?.name || "New Client",
        clientPhone: doc.clientPhone,
        // Map the client email so frontend can find it easily
        clientEmail: doc.client?.email || doc.details?.email || null,
        requestType: doc.serviceType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        status: doc.status || 'PENDING',
        createdAt: doc.createdAt,
        creditorName: doc.details?.creditorName || "Bureau Report",
        details: doc.details 
      };
    });

    res.status(200).json({ success: true, data: formattedRequests });
  } catch (error) {
    console.error("WhatsApp Fetch Error:", error);
    res.status(500).json({ success: false, message: "Could not fetch WhatsApp requests." });
  }
};

/**
 * 4. UPLOAD RECEIVED DOCUMENT
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
 * 5. UPDATE DOCUMENT STATUS
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
 * 6. DELETE REQUESTS
 */
export const deleteDocumentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    await DocumentRequest.findByIdAndDelete(requestId);
    await ServiceRequest.findByIdAndDelete(requestId);
    
    res.status(200).json({ success: true, message: "Deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * 7. GET DASHBOARD STATS
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
 * 8. GET ALL LOGS (Manual Only)
 */
export const getAllDocumentRequests = async (req, res) => {
  try {
    // Populate client email here as well for consistency
    const logs = await DocumentRequest.find().populate('client', 'name email').sort({ createdAt: -1 });
    const sanitizedLogs = logs.map(log => {
      const doc = log.toObject();
      return { 
        ...doc, 
        clientName: doc.clientName || doc.client?.name || "Unknown Client",
        clientEmail: doc.client?.email || doc.creditorEmail // Fallback to creditor if client email missing in log
      };
    });
    res.status(200).json({ success: true, data: sanitizedLogs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not fetch logs." });
  }
};
