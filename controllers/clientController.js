import Client from '../models/Client.js';

// GET ALL CLIENTS
export const getClients = async (req, res) => {
  try {
    // Fetch all and sort
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

    // Check if phone number exists
    const existingPhone = await Client.findOne({ phoneNumber });
    if (existingPhone) {
      return res.status(400).json({ success: false, message: "Phone number already registered." });
    }

    // Check if ID exists 
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
      accountStatus: accountStatus || 'Active', 
      sessionState: 'MAIN_MENU', 
    });

    res.status(201).json({ success: true, data: newClient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE CLIENT
export const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, idNumber, phoneNumber, accountStatus } = req.body;

    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { name, email, idNumber, phoneNumber, accountStatus },
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    res.status(200).json({ success: true, data: updatedClient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE CLIENT
export const deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedClient = await Client.findByIdAndDelete(id);

    if (!deletedClient) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    res.status(200).json({ success: true, message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};