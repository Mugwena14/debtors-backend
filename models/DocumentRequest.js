import mongoose from 'mongoose';

const documentRequestSchema = new mongoose.Schema({
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  clientName: { type: String, required: true },
  clientPhone: { type: String },
  clientEmail: { type: String }, 

  // Request Details
  requestType: { 
    type: String, 
    required: true,
    // UPDATED: Added 'Paid-Up' with hyphen to match frontend logic
    enum: ['Credit Report', 'Paid Up', 'Paid-Up', 'Prescription', 'Debt Review', 'Defaults', 'Car Application', 'Judgment Removal'] 
  },
  idNumber: { type: String },
  creditorName: { type: String },
  // creditorEmail remains a String. 
  // Our controller will save the joined list: "email1, email2, email3"
  creditorEmail: { type: String },
  status: { 
    type: String, 
    default: 'Pending',
    enum: ['Pending', 'Received', 'In Progress', 'COMPLETED', 'Rejected'] 
  },
  documentUrl: { type: String },

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
  strictPopulate: false 
});

export default mongoose.models.DocumentRequest || mongoose.model('DocumentRequest', documentRequestSchema);
