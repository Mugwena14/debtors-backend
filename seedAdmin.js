import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

const DB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

mongoose.connect(DB_URI)
  .then(async () => {
    console.log("Connected to MongoDB... checking for admin.");

    const email = 'admin@mkhdebtors.co.za';
    const adminExists = await Admin.findOne({ email });

    if (adminExists) {
      console.log("Admin already exists!");
      process.exit(0);
    }

    await Admin.create({
      email: email,
      password: 'ghn41@gmail.com'
    });

    console.log("✅ Admin account created successfully!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection error:", err);
    process.exit(1);
  });