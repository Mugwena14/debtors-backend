import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleCarAppService = async (client, mediaUrl, contentType, body) => {
  // 1. Check if user is trying to finish the upload process
  if (body?.toLowerCase() === 'done' || body === '10') {
    if (!client.tempRequest.mediaUrls || client.tempRequest.mediaUrls.length === 0) {
      return { text: "⚠️ You haven't uploaded any documents yet. Please send photos of your Bank Statements, Payslips, and ID." };
    }

    // Move URLs to the permanent client document store if needed
    client.tempRequest.mediaUrls.forEach(url => {
      client.documents.push({
        docType: 'Car App Photo',
        url: url,
        dateUploaded: new Date()
      });
    });

    return { 
      text: `✅ *Application Complete!*\n\nWe have received ${client.tempRequest.mediaUrls.length} documents. Our finance team will review them and contact you shortly.`, 
      action: 'COMPLETE' 
    };
  }

  // 2. Validate Image Upload
  if (!mediaUrl || !contentType?.startsWith('image/')) {
    return { text: "❌ Please upload a **Photo** of your document. Once you have uploaded all documents, reply *DONE*." };
  }

  try {
    const imgUrl = await uploadToCloudinary(mediaUrl, `CAR_APP_${client.idNumber}_${Date.now()}`);

    // Initialize the array in tempRequest if it doesn't exist
    if (!client.tempRequest.mediaUrls) {
      client.tempRequest.mediaUrls = [];
    }

    // Save the URL to tempRequest
    client.tempRequest.mediaUrls.push(imgUrl);
    client.markModified('tempRequest'); 

    const count = client.tempRequest.mediaUrls.length;

    return { 
      text: `📸 *Document Received!* (${count} total)\n\nSend another photo, or if you are finished sending all documents, reply with *DONE*.` 
    };
  } catch (error) {
    console.error("Car App Upload Error:", error);
    return { text: "⚠️ There was an error uploading your photo. Please try again." };
  }
};
