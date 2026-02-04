import mongoose from 'mongoose';

const documentRequestSchema = new mongoose.Schema({
  // The ObjectId link to the Client model
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  
  // Basic Client Info (Mirrored for easy access and safety)
  clientName: { type: String, required: true },
  clientPhone: { type: String }, // Added to prevent lookup errors
  clientEmail: { type: String }, // Added for the email logic we built

  // Request Details
  requestType: { 
    type: String, 
    required: true,
    enum: ['Credit Report', 'Paid Up', 'Prescription', 'Debt Review', 'Defaults', 'Car Application', 'Judgment Removal'] 
  },
  idNumber: { type: String },
  creditorName: { type: String },
  creditorEmail: { type: String },
  status: { 
    type: String, 
    default: 'Pending',
    enum: ['Pending', 'Received', 'In Progress', 'COMPLETED', 'Rejected'] 
  },
  documentUrl: { type: String },

  // NEW: Communication Log for Admin Replies
  replies: [{
    subject: String,
    message: String,
    attachmentUrl: String,
    sentAt: { type: Date, default: Date.now }
  }],

  dateRequested: { type: Date, default: Date.now },
  dateReceived: { type: Date }
}, { 
  timestamps: true,
  // This helps prevent the StrictPopulateError if you query dynamically
  strictPopulate: false 
});

// Ensure the model name matches exactly what you use in .populate('client')
export default mongoose.models.DocumentRequest || mongoose.model('DocumentRequest', documentRequestSchema);
