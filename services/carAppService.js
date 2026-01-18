import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleCarAppService = async (client, mediaUrl, contentType) => {
  if (!mediaUrl || !contentType?.startsWith('application/')) {
    return { text: "❌ Please upload your application pack as a *Document* (PDF preferred)." };
  }

  try {
    const docUrl = await uploadToCloudinary(mediaUrl, `CAR_APP_${client.idNumber}_${Date.now()}`);

    client.documents.push({
      docType: 'Full Car Application Pack',
      url: docUrl,
      dateUploaded: new Date()
    });

    client.tempRequest = {};
    client.sessionState = 'MAIN_MENU';

    return { 
      text: "✅ *Application Received!*\n\nWe have received your document pack. Our finance team will review your 3 months statements and payslips and contact you shortly regarding your car application.", 
      action: 'COMPLETE' 
    };
  } catch (error) {
    console.error("Car App Upload Error:", error);
    return { text: "⚠️ There was an error uploading your files. Please try again." };
  }
};