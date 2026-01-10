import mongoose from 'mongoose';

const documentRequestSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  idNumber: { type: String, required: true },
  creditorName: { type: String, required: true },
  creditorEmail: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Received'], default: 'Pending' },
  documentUrl: { type: String }, 
  dateRequested: { type: Date, default: Date.now },
  dateReceived: { type: Date }
});

export default mongoose.model('DocumentRequest', documentRequestSchema);