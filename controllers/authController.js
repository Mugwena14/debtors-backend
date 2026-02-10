import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: admin._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.status(200).json({ success: true, token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};