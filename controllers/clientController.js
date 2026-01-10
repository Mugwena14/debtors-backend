import Client from '../models/Client.js';

// GET ALL CLIENTS
export const getClients = async (req, res) => {
  try {
    // Fetch all and sort by most recently updated
    const clients = await Client.find().sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADD CLIENT MANUALLY
export const addClient = async (req, res) => {
  try {
    const { name, email, idNumber, phoneNumber, accountStatus } = req.body;

    // 1. Check if phone number exists
    const existingPhone = await Client.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(400).json({ success: false, message: "Phone number already registered." });
    }

    // 2. Check if ID exists 
    if (idNumber) {
      const existingID = await Client.findOne({ idNumber });
      if (existingID) {
        return res.status(400).json({ success: false, message: "ID Number already exists." });
      }
    }

    const newClient = await Client.create({
      name,
      email,
      idNumber,
      phoneNumber,
      accountStatus: accountStatus || 'Active', // Default to Active for manual adds
      sessionState: 'MAIN_MENU', // Skip onboarding flow for manual adds
    });

    res.status(201).json({ success: true, data: newClient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};