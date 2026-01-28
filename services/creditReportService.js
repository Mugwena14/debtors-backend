import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleCreditReportService = async (client, mediaUrl) => {
    // Note: The controller sends 'AWAITING_PAYMENT_METHOD' for this step
    if (!mediaUrl) {
        return { text: "⚠️ Please upload your *Proof of Payment* as a Document or Image so we can verify your R350 fee." };
    }

    try {
        const popUrl = await uploadToCloudinary(mediaUrl, `POP_${client.idNumber}_${Date.now()}`);
        
        // Save to tempRequest so the controller's snapshot finds it
        client.tempRequest.popUrl = popUrl;

        // Also save to permanent documents
        client.documents.push({
            docType: "Credit Report POP",
            url: popUrl,
            uploadedAt: new Date()
        });

        const successMsg = `✅ *Proof of Payment Received!*\n\nThank you, ${client.name}. Our team is verifying the R350 payment. Once confirmed, we will pull your report and email the analysis to ${client.email}. 📊`;

        return { text: successMsg, action: 'COMPLETE' };
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);
        return { text: "❌ Error uploading file. Please try again." };
    }
};