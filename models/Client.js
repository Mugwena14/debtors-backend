import mongoose from 'mongoose';

const ClientSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  idNumber: { 
    type: String, 
    unique: true, 
    sparse: true,
    validate: {
      validator: function(v) {
        return /^\d{13}$/.test(v);
      },
      message: props => `${props.value} is not a valid 13-digit ID number!`
    }
  },
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
    serviceType: { type: String, default: '' },
    creditorName: { type: String, default: '' },
    paymentPreference: { type: String, default: '' },
    requestIdNumber: { type: String, default: '' },
    poaUrl: { type: String, default: '' },
    porUrl: { type: String, default: '' },
    popUrl: { type: String, default: '' }, 
    lastActivity: { type: Date, default: Date.now }
  },
  documents: [{
    docType: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  outstandingBalance: { type: Number, default: 0 }
}, { timestamps: true });

const Client = mongoose.models.Client || mongoose.model('Client', ClientSchema);

export default Client;