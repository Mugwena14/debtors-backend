import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handlePaidUpService = async (client, incomingMsg, mediaUrl, contentType) => {
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
      if (!mediaUrl || !contentType || !contentType.startsWith('application/')) {
        return { text: "❌ Please upload the signed POA as a *Document* (click '+' -> 'Document')." };
      }
      
      const poaUrl = await uploadToCloudinary(mediaUrl, `POA_${client.tempRequest.requestIdNumber}_${Date.now()}`);
      client.tempRequest.poaUrl = poaUrl;
      client.sessionState = 'AWAITING_POR_UPLOAD';
      client.tempRequest.lastActivity = new Date();
      
      return { text: "✅ POA Received. Now, please upload your *Proof of Residence* as a Document." };

    case 'AWAITING_POR_UPLOAD':
      if (!mediaUrl || !contentType || !contentType.startsWith('application/')) {
        return { text: "❌ Please upload your *Proof of Residence* as a 'Document' file." };
      }
      
      const porUrl = await uploadToCloudinary(mediaUrl, `POR_${client.tempRequest.requestIdNumber}_${Date.now()}`);
      
      client.documents.push(
        { docType: `POA - ${client.tempRequest.creditorName}`, url: client.tempRequest.poaUrl },
        { docType: `POR - ${client.tempRequest.creditorName}`, url: porUrl }
      );

      const successMsg = `🎉 *Request Submitted Successfully!* \n\nThank you, ${client.name}. We have received your documents*. \n\nOur admin team will verify everything and reach out to you soon. Have a great day! 👋`;
      
      client.tempRequest = { creditorName: '', requestIdNumber: '', poaUrl: '', porUrl: '' };
      client.sessionState = 'MAIN_MENU';
      
      return { text: successMsg, action: 'COMPLETE' };

    default:
      return null;
  }
};