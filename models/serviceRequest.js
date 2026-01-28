import mongoose from 'mongoose';

const ServiceRequestSchema = new mongoose.Schema({
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Client', 
    required: true 
  },
  clientName: String,
  clientPhone: String,
  serviceType: { 
    type: String, 
    required: true,
    enum: [
      'PAID_UP_LETTER', 
      'PRESCRIPTION', 
      'CREDIT_REPORT', 
      'SETTLEMENT', 
      'DEFAULT_CLEARING', 
      'ARRANGEMENT', 
      'JUDGMENT_REMOVAL', 
      'CAR_APPLICATION',
      'DEBT_REVIEW_REMOVAL',
      'FILE_UPDATE'         
    ]
  },
  status: { 
    type: String, 
    default: 'PENDING',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'] 
  }, 
  
  details: {
    creditorName: String,
    paymentPreference: String, 
    requestIdNumber: String,
    mediaUrl: String,         
    poaUrl: String,            
    porUrl: String,
    popUrl: String, // Added to support Proof of Payment uploads
    answers: mongoose.Schema.Types.Mixed, 
  },
  
  createdAt: { type: Date, default: Date.now }
});

// Ensure the model isn't compiled multiple times in development
const ServiceRequest = mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', ServiceRequestSchema);

export default ServiceRequest;