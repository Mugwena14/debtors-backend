import mongoose from 'mongoose';

const documentRequestSchema = new mongoose.Schema({
  // The reference to the Client model
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  // The specific category of the request
  requestType: { 
    type: String, 
    enum: ['Paid-Up', 'Prescription', 'Debt Review', 'Defaults'], 
    required: true,
    default: 'Paid-Up'
  },
  idNumber: { type: String, required: true },
  creditorName: { type: String, required: true },
  creditorEmail: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'Received'], 
    default: 'Pending' 
  },
  documentUrl: { type: String }, 
  dateRequested: { type: Date, default: Date.now },
  dateReceived: { type: Date }
}, {
  // Adding timestamps automatically handles 'createdAt' and 'updatedAt'
  timestamps: true 
});

export default mongoose.model('DocumentRequest', documentRequestSchema);
