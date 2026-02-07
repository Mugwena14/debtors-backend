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
          client: whatsappReq.clientId,
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
/**
 * 2. UNIVERSAL DOCUMENT REQUEST
 * Sends individual private emails to each recipient and logs to DB
 */
export const requestPaidUpLetter = async (req, res) => {
  // When using FormData, arrays are often sent as JSON strings
  const { idNumber, creditorName, requestType = 'Paid-Up' } = req.body;
  
  try {
    // Parse emails if they come in as a string
    const creditorEmails = typeof req.body.creditorEmails === 'string' 
      ? JSON.parse(req.body.creditorEmails) 
      : req.body.creditorEmails;

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

    // --- PREPARE ATTACHMENTS (ID & POA) ---
    const emailAttachments = [];
    
    if (req.files) {
      // Handle 'idFile'
      if (req.files['idFile'] && req.files['idFile'][0]) {
        emailAttachments.push({
          name: `ID_Document_${client.name.replace(/\s/g, '_')}.pdf`,
          content: req.files['idFile'][0].buffer.toString("base64")
        });
      }
      // Handle 'poaFile'
      if (req.files['poaFile'] && req.files['poaFile'][0]) {
        emailAttachments.push({
          name: `Proof_of_Address_${client.name.replace(/\s/g, '_')}.pdf`,
          content: req.files['poaFile'][0].buffer.toString("base64")
        });
      }
    }

    // --- LOOP START: SEND INDIVIDUAL PRIVATE EMAILS ---
    for (const email of creditorEmails) {
      if (!email) continue;
      
      const emailData = {
        sender: { name: "MKH Admin", email: process.env.ADMIN_EMAIL },
        to: [{ email: email.trim(), name: creditorName || "Collections/Legal" }],
        subject: `Official ${requestType} Request: ${client.name} (${idNumber})`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #00B4D8; border-bottom: 2px solid #00B4D8; padding-bottom: 10px;">MKH Debtors & Solutions</h2>
            <p>Dear <strong>${creditorName || 'Legal'}</strong> Team,</p>
            <p>We represent <strong>${client.name}</strong> and are formally requesting <strong>${requestedItem}</strong>.</p>
            <div style="background-color: #f4f7f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Full Name:</strong> ${client.name}</p>
              <p style="margin: 5px 0;"><strong>ID Number:</strong> ${idNumber}</p>
              <p style="margin: 5px 0;"><strong>Inquiry Type:</strong> ${requestType}</p>
            </div>
            <p><strong>Please find the attached ID and Proof of Address for verification.</strong></p>
            <p>Please review your records and reply to this email with the requested documentation.</p>
            <br>
            <p>Regards,</p>
            <p><strong>Admin Department</strong><br/>MKH Debtors & Solutions</p>
          </div>
        `,
        attachment: emailAttachments // ID and POA attached here
      };

      await apiInstance.sendTransacEmail(emailData);
    }

    // 4. Create database log
    const newRequest = await DocumentRequest.create({
      client: client._id,
      clientName: client.name,
      idNumber: idNumber,
      creditorName: creditorName || "Multiple Creditors",
      creditorEmail: creditorEmails.join(', '),
      requestType: requestType, 
      status: 'Pending'
    });

    res.status(200).json({ 
      success: true, 
      message: `${requestType} requests with attachments sent to ${creditorEmails.length} recipients.`, 
      data: newRequest 
    });

  } catch (error) {
    console.error("DETAILED ERROR:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Failed to process document request with attachments." });
  }
};
/**
 * 3. GET WHATSAPP SERVICE REQUESTS
 */
export const getWhatsAppRequests = async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .populate({
        path: 'clientId',
        model: 'Client',
        select: 'email name',
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 })
      .lean();

    const formattedRequests = requests.map(doc => {
      return {
        _id: doc._id,
        clientName: doc.clientName || doc.clientId?.name || "New Client",
        clientPhone: doc.clientPhone,
        clientEmail: doc.clientId?.email || doc.details?.email || null,
        requestType: doc.serviceType ? doc.serviceType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : "General Inquiry",
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
 * 5. UPDATE DOCUMENT STATUS (SMART VERSION)
 * Checks both DocumentRequest and ServiceRequest models
 */
export const updateDocumentStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  try {
    // Attempt to update manual DocumentRequest
    let updatedRequest = await DocumentRequest.findByIdAndUpdate(
      requestId,
      { status, dateReceived: (status === 'Received' || status === 'COMPLETED') ? new Date() : null },
      { new: true }
    );

    // If not found, attempt to update WhatsApp ServiceRequest
    if (!updatedRequest) {
      updatedRequest = await ServiceRequest.findByIdAndUpdate(
        requestId,
        { status },
        { new: true }
      );
    }

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Request ID not found in any collection." });
    }

    res.status(200).json({ success: true, data: updatedRequest });
  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error);
    res.status(500).json({ success: false, message: "Update failed.", error: error.message });
  }
};

/**
 * 6. DELETE REQUESTS (SMART VERSION)
 */
export const deleteDocumentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Attempt deletion from both to ensure it's gone
    const docDel = await DocumentRequest.findByIdAndDelete(requestId);
    const servDel = await ServiceRequest.findByIdAndDelete(requestId);
    
    if (!docDel && !servDel) {
        return res.status(404).json({ success: false, message: "Record already deleted or not found." });
    }
    
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
    const logs = await DocumentRequest.find()
      .populate({
        path: 'client',
        model: 'Client',
        select: 'name email',
        options: { strictPopulate: false }
      })
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedLogs = logs.map(doc => {
      return { 
        ...doc, 
        clientName: doc.clientName || doc.client?.name || "Unknown Client",
        clientEmail: doc.client?.email || doc.clientEmail || doc.creditorEmail
      };
    });

    res.status(200).json({ success: true, data: sanitizedLogs });
  } catch (error) {
    console.error("Log Fetch Error:", error);
    res.status(500).json({ success: false, message: "Could not fetch logs." });
  }
};
