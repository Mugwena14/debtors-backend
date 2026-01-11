import apiInstance from "../config/brevo.js"; 
import DocumentRequest from '../models/DocumentRequest.js';
import Client from '../models/Client.js';

/**
 * 1. REQUEST PAID-UP LETTER
 */
export const requestPaidUpLetter = async (req, res) => {
  const { idNumber, creditorName, creditorEmail } = req.body;

  try {
    const client = await Client.findOne({ idNumber });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client ID not found in database." });
    }

    const emailData = {
      sender: { name: "MKH Admin", email: process.env.ADMIN_EMAIL },
      to: [{ email: creditorEmail, name: creditorName }],
      subject: `Official Paid-up Letter Request: ${client.name} (${idNumber})`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #00B4D8; border-bottom: 2px solid #00B4D8; padding-bottom: 10px;">MKH Debtors & Solutions</h2>
          <p>Dear <strong>${creditorName}</strong> Team,</p>
          <p>We are formally requesting a <strong>Paid-up Letter</strong> for the following client:</p>
          <div style="background-color: #f4f7f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Full Name:</strong> ${client.name}</p>
            <p style="margin: 5px 0;"><strong>ID Number:</strong> ${idNumber}</p>
          </div>
          <p>Please review your records and reply to this email (<em>${process.env.ADMIN_EMAIL}</em>) with the requested document attached.</p>
          <br>
          <p>Regards,</p>
          <p><strong>Admin Department</strong><br/>MKH Debtors & Solutions</p>
        </div>
      `
    };

    await apiInstance.sendTransacEmail(emailData);

    const newRequest = await DocumentRequest.create({
      client: client._id,
      idNumber: idNumber,
      creditorName: creditorName,
      creditorEmail: creditorEmail,
      status: 'Pending'
    });

    res.status(200).json({ 
      success: true, 
      message: `Request sent to ${creditorName}`, 
      data: newRequest 
    });

  } catch (error) {
    console.error("Brevo SDK Error:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process document request via Brevo SDK." 
    });
  }
};

/**
 * 2. UPLOAD RECEIVED DOCUMENT
 */
export const uploadReceivedDocument = async (req, res) => {
  const { requestId } = req.params;
  const fileUrl = req.file ? req.file.path : req.body.fileUrl;

  if (!fileUrl) {
    return res.status(400).json({ success: false, message: "No document provided for upload." });
  }

  try {
    const updatedRequest = await DocumentRequest.findByIdAndUpdate(
      requestId,
      { 
        status: 'Received', 
        documentUrl: fileUrl, 
        dateReceived: new Date() 
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Request ID not found." });
    }

    res.status(200).json({ 
      success: true, 
      message: "Document successfully attached to client profile.", 
      data: updatedRequest 
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ success: false, message: "Server error during document upload." });
  }
};

/**
 * NEW: 3. UPDATE DOCUMENT STATUS (Manual Toggle)
 * Updates status to 'Received' or 'Pending' without requiring a file upload
 */
export const updateDocumentStatus = async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  try {
    const updatedRequest = await DocumentRequest.findByIdAndUpdate(
      requestId,
      { 
        status, 
        // If marked as Received manually, we set the date
        dateReceived: status === 'Received' ? new Date() : null 
      },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(404).json({ success: false, message: "Document request not found." });
    }

    res.status(200).json({ 
      success: true, 
      message: `Status updated to ${status}`, 
      data: updatedRequest 
    });
  } catch (error) {
    console.error("Status Update Error:", error);
    res.status(500).json({ success: false, message: "Failed to update status." });
  }
};

/**
 * 4. DELETE  REQUESTS
 */

export const deleteDocumentRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    // Check if the record exists
    const request = await DocumentRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Document request not found."
      });
    }

    await DocumentRequest.findByIdAndDelete(requestId);

    res.status(200).json({
      success: true,
      message: "Request record deleted successfully."
    });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while deleting record."
    });
  }
};

/**
 * 5. GET DASHBOARD STATS
 */

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Count Active Clients (Assuming you have a Client model)
    const activeClients = await Client.countDocuments({ status: 'Active' });

    // 2. Count Pending Document Requests
    const pendingDocs = await DocumentRequest.countDocuments({ status: 'Pending' });

    // 3. Count Completed (Received) Document Requests
    const completedDocs = await DocumentRequest.countDocuments({ status: 'Received' });

    res.status(200).json({
      success: true,
      stats: {
        activeClients,
        pendingDocs,
        completedDocs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. GET ALL REQUESTS
 */
export const getAllDocumentRequests = async (req, res) => {
  try {
    const logs = await DocumentRequest.find()
      .populate('client', 'name phoneNumber')
      .sort({ dateRequested: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not fetch logs." });
  }
};
