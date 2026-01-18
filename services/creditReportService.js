import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleCreditReportService = async (client, incomingMsg, mediaUrl, contentType) => {
  switch (client.sessionState) {
    case 'AWAITING_REPORT_CONSULTATION':
      if (!mediaUrl) {
        return { text: "⚠️ Please upload your *Proof of Payment* as a Document or Screenshot so we can verify your consultation." };
      }

      const popUrl = await uploadToCloudinary(mediaUrl, `POP_${client.idNumber}_${Date.now()}`);
      
      client.documents.push({
        docType: "Credit Report POP",
        url: popUrl,
        uploadedAt: new Date()
      });


      client.sessionState = 'MAIN_MENU';
      
      const successMsg = "✅ *Proof of Payment Received!*\n\nThank you, " + client.name + ". Our finance team is verifying the R350 payment. \n\nOnce confirmed, we will pull your credit report and send you a email to begin the analysis. 📊";

      return { text: successMsg, action: 'COMPLETE' };

    default:
      return null;
  }
};