import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleCarAppService = async (client, mediaUrl, contentType, body) => {
  // Ensure tempRequest and mediaUrls array exist
  if (!client.tempRequest) client.tempRequest = {};
  if (!client.tempRequest.mediaUrls) {
    client.tempRequest.mediaUrls = [];
  }

  const incomingText = body?.toLowerCase()?.trim();

  // 1. Check if user is trying to finish manually
  if (incomingText === 'done' || incomingText === '10') {
    if (client.tempRequest.mediaUrls.length === 0) {
      return { text: "⚠️ You haven't uploaded any documents yet. Please send photos of your Bank Statements, Payslips, and ID." };
    }
    return finishApplication(client);
  }

  // 2. Validate Image Upload
  // Since you only want photos, we stick to image/ check
  if (!mediaUrl) {
      return { text: "❌ Please upload a *Photo* (Bank Statement, Payslip, or ID). Reply *DONE* when finished." };
  }

  if (!contentType?.startsWith('image/')) {
    return { text: "❌ Invalid file type. Please send the document as a *Photo* (Image)." };
  }

  // 3. Process the Image
  try {
    const imgUrl = await uploadToCloudinary(mediaUrl, `CAR_APP_${client.idNumber || client.clientPhone}_${Date.now()}`);

    // Save URL to the array
    client.tempRequest.mediaUrls.push(imgUrl);
    
    // IMPORTANT: Tell Mongoose the nested array changed
    client.markModified('tempRequest');
    client.markModified('tempRequest.mediaUrls');

    const count = client.tempRequest.mediaUrls.length;

    // 4. Auto-complete if they hit 3 images, otherwise ask for more
    if (count >= 3) {
        return finishApplication(client);
    }

    return { 
      text: `📸 *Document Received!* (${count}/3)\n\nPlease send the next photo, or reply *DONE* if you are finished.` 
    };

  } catch (error) {
    console.error("Car App Upload Error:", error);
    return { text: "⚠️ There was an error uploading your photo. Please try again." };
  }
};

/**
 * Helper to finalize the application and move docs to the client record
 */
const finishApplication = (client) => {
    const count = client.tempRequest.mediaUrls.length;
    
    // Move URLs to the permanent client document store
    client.tempRequest.mediaUrls.forEach(url => {
      client.documents.push({
        docType: 'Car Application Document',
        url: url,
        dateUploaded: new Date()
      });
    });

    // Clear temp storage and reset state
    client.tempRequest.mediaUrls = [];
    client.sessionState = 'MAIN_MENU';
    client.markModified('documents');
    client.markModified('tempRequest');

    return { 
      text: `✅ *Application Submitted Successfully!*\n\nWe have received ${count} documents. Our finance team will review your application and contact you shortly.`, 
      action: 'COMPLETE' 
    };
};
