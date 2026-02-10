import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const adminExists = await Admin.findOne({ email: 'admin@mkhdebtors.co.za' });
    if (adminExists) {
       console.log("Admin already exists!");
       process.exit();
    }

    await Admin.create({
      email: 'admin@mkhdebtors.co.za',
      password: 'ghn41@gmail.com'
    });

    console.log("✅ Admin account created successfully!");
    process.exit();
  })
  .catch(err => console.log(err));