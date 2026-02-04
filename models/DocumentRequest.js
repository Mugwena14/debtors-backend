import mongoose from 'mongoose';

const documentRequestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  clientName: { type: String, required: true },
  requestType: { type: String, required: true },
  idNumber: { type: String },
  creditorName: { type: String },
  creditorEmail: { type: String },
  status: { type: String, default: 'Pending' },
  documentUrl: { type: String },
  
  // NEW: Communication Log
  replies: [{
    subject: String,
    message: String,
    attachmentUrl: String,
    sentAt: { type: Date, default: Date.now }
  }],

  dateRequested: { type: Date, default: Date.now },
  dateReceived: { type: Date }
}, { timestamps: true });

export default mongoose.model('DocumentRequest', documentRequestSchema);
