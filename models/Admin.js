import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Hash password before saving
adminSchema.pre('save', async function() {
  // If the password hasn't been modified, just exit the function
  if (!this.isModified('password')) return;

  // Hash the password and replace the plain text one
  this.password = await bcrypt.hash(this.password, 12);
  
  // No next() needed here because the function is async
});

export default mongoose.model('Admin', adminSchema);