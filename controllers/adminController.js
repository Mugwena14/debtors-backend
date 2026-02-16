import apiInstance from "../config/brevo.js"; 
import DocumentRequest from '../models/DocumentRequest.js';
import Client from '../models/Client.js';
import ServiceRequest from '../models/serviceRequest.js'; 
import nodemailer from 'nodemailer';

const OFFICIAL_ADMIN_EMAIL = "admin@mkhdebtors.co.za";

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
      sender: { name: "MKH Debtors Admin", email: OFFICIAL_ADMIN_EMAILL },
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
 * Sends individual private emails with template-specific wording
 */

// Configure the SMTP transporter
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "mlangaviclyde@gmail.com", 
    pass: "xsmtpsib-3dd2f9c06dc4e0281139c2ce89ab4b7c0509a839c3273640f831312128cb6455-MHt1ahSDxS1eENPW", 
  },
});

export const requestPaidUpLetter = async (req, res) => {
  const { idNumber, creditorName, requestType = 'Paid-Up' } = req.body;
  
  try {
    const creditorEmails = typeof req.body.creditorEmails === 'string' 
      ? JSON.parse(req.body.creditorEmails) 
      : req.body.creditorEmails;

    const client = await Client.findOne({ idNumber });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client ID not found in database." });
    }

    const clientNameUpper = client.name.toUpperCase();

    // --- DYNAMIC PHRASING BASED ON SERVICE TYPE ---
    let openingStatement = "";
    switch (requestType) {
      case 'Paid-Up':
      case 'PAID_UP_LETTER':
        openingStatement = `We are writing to request a **Paid up letter** for our client's **${clientNameUpper}**, the account has been settled in full.`;
        break;
      case 'Prescription':
      case 'PRESCRIPTION':
        openingStatement = `We are writing to request a **prescription letter** for our client **${clientNameUpper}** account, in accordance with the **Prescription Act 68 of 1969**.`;
        break;
      case 'Discounts':
      case 'SETTLEMENT_DISCOUNT':
        openingStatement = `We are writing to request a **Settlement Discount** for our client **${clientNameUpper}**. Please provide the discounted settlement balance to facilitate final payment.`;
        break;
      case 'Debt Review':
      case 'DEBT_REVIEW_REMOVAL':
        openingStatement = `We are writing to request the **Debt Review Removal Certificate (Form 19)** for our client **${clientNameUpper}**.`;
        break;
      default:
        openingStatement = `We are writing to request the relevant documentation for our client **${clientNameUpper}** regarding their account.`;
    }

    // --- PREPARE ATTACHMENTS FOR NODEMAILER ---
    const emailAttachments = [];
    if (req.files) {
      if (req.files['idFile']?.[0]) {
        emailAttachments.push({
          filename: `ID_Document_${client.name.replace(/\s/g, '_')}.pdf`,
          content: req.files['idFile'][0].buffer
        });
      }
      if (req.files['poaFile']?.[0]) {
        emailAttachments.push({
          filename: `Power_of_Attorney_${client.name.replace(/\s/g, '_')}.pdf`, 
          content: req.files['poaFile'][0].buffer
        });
      }
    }

    // --- LOOP START: SEND INDIVIDUAL EMAILS VIA SMTP ---
    for (const email of creditorEmails) {
      if (!email) continue;
      
      const mailOptions = {
        from: `"MKH Debtors Associates Admin" <${OFFICIAL_ADMIN_EMAIL}>`,
        to: email.trim(),
        // No BCC needed here - SMTP will save this to your SENT folder
        subject: `Official ${requestType} Request: ${clientNameUpper} (${idNumber})`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; padding: 20px; border: 1px solid #eee;">
            <p>Good day,</p>
            <p>I hope this email finds you well.</p>
            <p>${openingStatement}</p>
            
            <p>To facilitate this request, we have attached the following documents:</p>
            <ol>
              <li>ID Copy</li>
              <li>Power of Attorney</li>
            </ol>

            <p>Please process this request at your earliest convenience. If any additional information is required, please do not hesitate to contact us.</p>
            <p>Thank you for your prompt attention to this matter.</p>
            <br>
            <p>Best regards,</p>
            <p><strong>Admin Department</strong><br/>
            MKH Debtors Associates PTY LTD</p>
          </div>
        `,
        attachments: emailAttachments
      };

      await transporter.sendMail(mailOptions);
    }

    // --- LOG TO DATABASE ---
    const newRequest = await DocumentRequest.create({
      client: client._id,
      clientName: client.name,
      idNumber: idNumber,
      creditorName: creditorName || "Multiple Creditors",
      creditorEmail: Array.isArray(creditorEmails) ? creditorEmails.join(', ') : creditorEmails,
      requestType: requestType, 
      status: 'Pending'
    });

    res.status(200).json({ success: true, message: "Request sent (Check your Sent folder).", data: newRequest });

  } catch (error) {
    console.error("SMTP ERROR:", error.message);
    res.status(500).json({ success: false, message: "Failed to send email through SMTP." });
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
