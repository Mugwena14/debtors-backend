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
            if (rawType === 'CREDIT_REPORT') {
                if (!mediaUrl) {
                    return { text: "❌ Please upload your *Proof of Payment* (Image or PDF) to proceed." };
                }

                const popUrl = await uploadToCloudinary(mediaUrl, `POP_${client.idNumber}`);
                client.tempRequest.popUrl = popUrl;
                client.tempRequest.paymentPreference = "Paid (R350)";
                
                client.documents.push({ docType: 'Credit Report POP', url: popUrl });
                client.markModified('tempRequest');

                return { 
                    text: `✅ *Proof of Payment Received!*\n\nThank you, your request for a *Credit Report* has been submitted. Our admin team will process it and reach out to you shortly.`,
                    action: 'COMPLETE' 
                };
            } else {
                // FIXED: Explicitly map the selection here
                let method = "Standard";
                if (userChoice === '1' || userChoice.includes("MONTHLY")) method = "Monthly Installments";
                else if (userChoice === '2' || userChoice.includes("ONCE")) method = "Once-off Settlement";
                else if (userChoice === '3' || userChoice.includes("FULL")) method = "Full Payment";
                else method = incomingMsg; // Fallback to raw text if they typed something else

                client.tempRequest.paymentPreference = method;
                client.sessionState = 'AWAITING_NEG_POA';
                client.markModified('tempRequest');

                return { 
                    text: `Selected: *${method}*.\n\n📄 One moment while I prepare the *Power of Attorney* for your *${sName}*...`,
                    action: 'SEND_POA' 
                };
            }

        case 'AWAITING_NEG_POA':
            if (!mediaUrl) {
                return { text: "❌ Please upload the signed POA as a *Document* (PDF or Word)." };
            }
            const poaUrl = await uploadToCloudinary(mediaUrl, `POA_${rawType}_${client.idNumber}`);
            client.tempRequest.poaUrl = poaUrl;
            client.sessionState = 'AWAITING_NEG_POR';
            client.markModified('tempRequest');
            return { text: `✅ *POA Received.*\n\nNow, please upload your *Proof of Residence* (Document) to finalize the request.` };

        case 'AWAITING_NEG_POR':
            if (!mediaUrl) {
                return { text: "❌ Please upload your *Proof of Residence* as a Document." };
            }
            const porUrl = await uploadToCloudinary(mediaUrl, `POR_${rawType}_${client.idNumber}`);
            
            // Persist to main document history
            client.documents.push(
                { docType: `${sName} POA`, url: client.tempRequest.poaUrl },
                { docType: `${sName} POR`, url: porUrl }
            );

            // FIXED: Pull the preference we saved earlier
            const finalMethod = client.tempRequest.paymentPreference || "Not Specified";

            return { 
                text: `🎉 *${sName} Request Submitted!*\n\n*Details Saved:*\n• Creditor: ${client.tempRequest.creditorName}\n• Payment Plan: ${finalMethod}\n\nOur team at *MKH Debtors* will process your file and update you shortly!`, 
                action: 'COMPLETE' 
            };

        default:
            return null;
    }
};