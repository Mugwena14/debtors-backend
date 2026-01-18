import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleNegotiationService = async (client, incomingMsg, mediaUrl, contentType, buttonPayload) => {
  switch (client.sessionState) {
    case 'AWAITING_NEGOTIATION_CREDITOR':
      client.tempRequest.creditorName = incomingMsg;
      client.sessionState = 'AWAITING_PAYMENT_METHOD';
      return { 
        text: `How do you plan to pay *${incomingMsg}*?`,
        action: 'SEND_PAYMENT_OPTIONS'
      };

    case 'AWAITING_PAYMENT_METHOD':
      client.tempRequest.paymentPreference = buttonPayload || incomingMsg;
      client.sessionState = 'AWAITING_NEG_POA';
      return { 
        text: "Understood. 📄 One moment while I prepare your *Power of Attorney*...",
        action: 'SEND_POA' 
      };

    case 'AWAITING_NEG_POA':
      if (!mediaUrl || !contentType?.startsWith('application/')) {
        return { text: "❌ Please upload the signed POA as a *Document*." };
      }
      const poaUrl = await uploadToCloudinary(mediaUrl, `NEG_POA_${client.idNumber}_${Date.now()}`);
      client.tempRequest.poaUrl = poaUrl;
      client.sessionState = 'AWAITING_NEG_POR';
      return { text: "✅ POA Received. Now, please upload your *Proof of Residence* (Document)." };

    case 'AWAITING_NEG_POR':
      if (!mediaUrl || !contentType?.startsWith('application/')) {
        return { text: "❌ Please upload your *Proof of Residence* as a Document." };
      }
      const porUrl = await uploadToCloudinary(mediaUrl, `NEG_POR_${client.idNumber}_${Date.now()}`);
      
      client.documents.push(
        { docType: `${client.tempRequest.serviceType} POA - ${client.tempRequest.creditorName}`, url: client.tempRequest.poaUrl },
        { docType: `${client.tempRequest.serviceType} POR - ${client.tempRequest.creditorName}`, url: porUrl }
      );

      const successMsg = `🎉 *Request Submitted!*\n\nService: ${client.tempRequest.serviceType}\nCreditor: ${client.tempRequest.creditorName}\nPayment: ${client.tempRequest.paymentPreference}\n\nOur team will start negotiations and update you soon! 👋`;
      
      client.tempRequest = {};
      client.sessionState = 'MAIN_MENU';
      return { text: successMsg, action: 'COMPLETE' };

    default:
      return null;
  }
};