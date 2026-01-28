import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleNegotiationService = async (client, incomingMsg, mediaUrl, contentType, buttonPayload) => {
    const userChoice = (buttonPayload || incomingMsg || '').trim().toUpperCase();
    
    // Formatting the service name dynamically
    const rawType = client.tempRequest?.serviceType || 'SERVICE';
    const sName = rawType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

    switch (client.sessionState) {
        case 'AWAITING_NEGOTIATION_CREDITOR':
            client.tempRequest.creditorName = incomingMsg;
            client.sessionState = 'AWAITING_PAYMENT_METHOD';
            return { 
                text: `Got it: *${incomingMsg}*.\n\nTo proceed with your *${sName}*, please confirm your payment plan:\n\n1️⃣ Monthly Installments\n2️⃣ Once-off Settlement\n3️⃣ Full Payment` 
            };

        case 'AWAITING_PAYMENT_METHOD':
            let method = userChoice;
            if (userChoice === '1') method = "Monthly Installments";
            if (userChoice === '2') method = "Once-off Settlement";
            if (userChoice === '3') method = "Full Payment";

            client.tempRequest.paymentPreference = method;
            client.sessionState = 'AWAITING_NEG_POA';
            
            return { 
                text: `Selected: *${method}*.\n\n📄 One moment while I prepare the *Power of Attorney* for your *${sName}*... I will send it below.`,
                action: 'SEND_POA' 
            };

        case 'AWAITING_NEG_POA':
            if (!mediaUrl || !contentType?.startsWith('application/')) {
                return { text: "❌ Please upload the signed POA as a *Document* (PDF or Word file)." };
            }
            
            const poaUrl = await uploadToCloudinary(mediaUrl, `POA_${rawType}_${client.idNumber}`);
            client.tempRequest.poaUrl = poaUrl;
            client.sessionState = 'AWAITING_NEG_POR';
            
            return { text: `✅ *POA Received.*\n\nNow, please upload your *Proof of Residence* (Document) to finalize the *${sName}* request.` };

        case 'AWAITING_NEG_POR':
            if (!mediaUrl || !contentType?.startsWith('application/')) {
                return { text: "❌ Please upload your *Proof of Residence* as a Document." };
            }

            const porUrl = await uploadToCloudinary(mediaUrl, `POR_${rawType}_${client.idNumber}`);
            
            client.documents.push(
                { docType: `${sName} POA`, url: client.tempRequest.poaUrl },
                { docType: `${sName} POR`, url: porUrl }
            );

            // Summary Message for the User
            const successMsg = 
                `🎉 *${sName} Request Submitted!*\n\n` +
                `*Details Saved:*\n` +
                `• Creditor/Ref: ${client.tempRequest.creditorName}\n` +
                `• Payment Plan: ${client.tempRequest.paymentPreference}\n\n` +
                `*Documents Uploaded:*\n` +
                `✅ Signed POA\n` +
                `✅ Proof of Residence\n\n` +
                `Our team at *MKH Debtors* will process your file and update you shortly!`;
            
            return { text: successMsg, action: 'COMPLETE' };

        default:
            return null;
    }
};