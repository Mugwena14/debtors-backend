import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleNegotiationService = async (client, incomingMsg, mediaUrl, contentType, buttonPayload) => {
    const userChoice = (buttonPayload || incomingMsg || '').trim().toUpperCase();
    const rawType = client.tempRequest?.serviceType || 'SERVICE';
    const sName = rawType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

    switch (client.sessionState) {
        case 'AWAITING_NEGOTIATION_CREDITOR':
            client.tempRequest.creditorName = incomingMsg;
            client.sessionState = 'AWAITING_PAYMENT_METHOD';
            client.markModified('tempRequest'); 
            
            return { 
                text: `Got it: *${incomingMsg}*.\n\nTo proceed with your *${sName}*, please confirm your payment plan:\n\n1️⃣ Monthly Installments\n2️⃣ Once-off Settlement\n3️⃣ Full Payment` 
            };

        case 'AWAITING_PAYMENT_METHOD':
            // Logic Branch for Credit Report vs Others
            if (rawType === 'CREDIT_REPORT') {
                if (!mediaUrl) {
                    return { text: "❌ Please upload your *Proof of Payment* (Image or PDF) to proceed with your Credit Report." };
                }
                const popUrl = await uploadToCloudinary(mediaUrl, `POP_${client.idNumber}`);
                client.tempRequest.popUrl = popUrl; // Store POP
                client.tempRequest.paymentPreference = "Paid (R350)";
                client.sessionState = 'AWAITING_NEG_POA';
                client.markModified('tempRequest');
                return { 
                    text: `✅ *Proof of Payment Received.*\n\n📄 One moment while I prepare the *Power of Attorney* for your *${sName}*...`,
                    action: 'SEND_POA' 
                };
            } else {
                // Standard Debt/Judgment Payment Plan logic
                let method = userChoice;
                if (userChoice === '1') method = "Monthly Installments";
                else if (userChoice === '2') method = "Once-off Settlement";
                else if (userChoice === '3') method = "Full Payment";

                client.tempRequest.paymentPreference = method;
                client.sessionState = 'AWAITING_NEG_POA';
                client.markModified('tempRequest');

                return { 
                    text: `Selected: *${method}*.\n\n📄 One moment while I prepare the *Power of Attorney* for your *${sName}*...`,
                    action: 'SEND_POA' 
                };
            }

        case 'AWAITING_NEG_POA':
            if (!mediaUrl || !contentType?.startsWith('application/')) {
                return { text: "❌ Please upload the signed POA as a *Document* (PDF or Word file)." };
            }
            const poaUrl = await uploadToCloudinary(mediaUrl, `POA_${rawType}_${client.idNumber}`);
            client.tempRequest.poaUrl = poaUrl;
            client.sessionState = 'AWAITING_NEG_POR';
            client.markModified('tempRequest');
            return { text: `✅ *POA Received.*\n\nNow, please upload your *Proof of Residence* (Document) to finalize the *${sName}* request.` };

        case 'AWAITING_NEG_POR':
            if (!mediaUrl || !contentType?.startsWith('application/')) {
                return { text: "❌ Please upload your *Proof of Residence* as a Document." };
            }
            const porUrl = await uploadToCloudinary(mediaUrl, `POR_${rawType}_${client.idNumber}`);
            
            // Push to main docs array
            client.documents.push(
                { docType: `${sName} POA`, url: client.tempRequest.poaUrl },
                { docType: `${sName} POR`, url: porUrl }
            );

            // Clean display variables
            const finalPlan = client.tempRequest.paymentPreference || "Standard";
            const planLabel = (rawType === 'CREDIT_REPORT') ? "Payment Status" : "Payment Plan";

            const successMsg = 
                `🎉 *${sName} Request Submitted!*\n\n` +
                `*Details Saved:*\n` +
                `• Service: ${sName}\n` +
                `• Creditor/Ref: ${client.tempRequest.creditorName || 'Internal'}\n` +
                `• ${planLabel}: ${finalPlan}\n\n` +
                `*Documents Uploaded:*\n` +
                `✅ Signed POA\n` +
                `✅ Proof of Residence\n` +
                (rawType === 'CREDIT_REPORT' ? `✅ Proof of Payment\n\n` : `\n`) +
                `Our team at *MKH Debtors* will process your file and update you shortly!`;
            
            return { text: successMsg, action: 'COMPLETE' };

        default:
            return null;
    }
};