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
  // Conversation flow states: 'AWAITING_ID', 'ONBOARDING_NAME', 'ONBOARDING_EMAIL', 'MAIN_MENU'
  sessionState: { 
    type: String, 
    default: 'AWAITING_ID' 
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