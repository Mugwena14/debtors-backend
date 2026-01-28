import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  idNumber: { type: String, unique: true, sparse: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  accountStatus: { 
    type: String, 
    enum: ['Lead', 'Active', 'Closed'], 
    default: 'Lead' 
  },
  sessionState: { 
    type: String, 
    default: 'AWAITING_ID' 
  },
  tempRequest: {
    creditorName: { type: String, default: '' },
    requestIdNumber: { type: String, default: '' },
    poaUrl: { type: String, default: '' },
    porUrl: { type: String, default: '' },
    lastActivity: { type: Date, default: Date.now }
  },
  documents: [{
    docType: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  outstandingBalance: { type: Number, default: 0 }
}, { timestamps: true });

const Client = mongoose.model('Client', ClientSchema);
export default Client;