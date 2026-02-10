import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handlePaidUpService = async (client, incomingMsg, mediaUrl, contentType) => {
  // Ensure we keep track of the service type throughout the flow
  if (!client.tempRequest.serviceType) {
    client.tempRequest.serviceType = 'PAID_UP_LETTER';
  }

  switch (client.sessionState) {
    case 'AWAITING_CREDITOR_NAME':
      client.tempRequest.creditorName = incomingMsg;
      client.sessionState = 'AWAITING_REQ_ID';
      client.tempRequest.lastActivity = new Date();
      return { 
        text: `Got it: *${incomingMsg}*.\n\nNow, please enter your *ID Number* for this request.` 
      };

    case 'AWAITING_REQ_ID':
      client.tempRequest.requestIdNumber = incomingMsg;
      client.sessionState = 'AWAITING_POA_UPLOAD';
      client.tempRequest.lastActivity = new Date();
      return { 
        text: "Thank you. 📄 One moment while I prepare your *Power of Attorney* document...",
        action: 'SEND_POA' 
      };

    case 'AWAITING_POA_UPLOAD':
      if (!mediaUrl || !contentType || !contentType.startsWith('image/')) {
        return { text: "❌ Please upload a *Photo* of the signed POA (click '+' -> 'Gallery' or 'Camera')." };
      }
      
      try {
        const poaUrl = await uploadToCloudinary(mediaUrl, `POA_${client.tempRequest.requestIdNumber}_${Date.now()}`);
        client.tempRequest.poaUrl = poaUrl;
        client.sessionState = 'AWAITING_POR_UPLOAD';
        client.tempRequest.lastActivity = new Date();
        
        return { text: "✅ POA Photo Received. Now, please upload a *Photo* of your *Proof of Residence*." };
      } catch (error) {
        return { text: "⚠️ Error uploading POA. Please try again." };
      }

    case 'AWAITING_POR_UPLOAD':
      if (!mediaUrl || !contentType || !contentType.startsWith('image/')) {
        return { text: "❌ Please upload your *Proof of Residence* as a *Photo*." };
      }
      
      try {
        const porUrl = await uploadToCloudinary(mediaUrl, `POR_${client.tempRequest.requestIdNumber}_${Date.now()}`);
        
        // Permanent storage
        client.documents.push(
          { docType: `POA - ${client.tempRequest.creditorName}`, url: client.tempRequest.poaUrl, dateUploaded: new Date() },
          { docType: `POR - ${client.tempRequest.creditorName}`, url: porUrl, dateUploaded: new Date() }
        );

        // Map for the controller's saveRequestToDatabase logic
        client.tempRequest.porUrl = porUrl;
        client.tempRequest.mediaUrl = porUrl; // Backup for general link
        
        const successMsg = `Thank you, ${client.name}. We have received your photos. Our admin team will verify everything and reach out to you soon.`;
        
        // NOTE: We do NOT reset tempRequest here anymore. 
        // The controller handles the reset after the database save is confirmed.
        return { text: successMsg, action: 'COMPLETE' };
      } catch (error) {
        return { text: "⚠️ Error uploading POR. Please try again." };
      }

    default:
      return null;
  }
};
