import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleNegotiationService = async (client, incomingMsg, mediaUrl, buttonPayload) => {
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
            let method = "Standard";
            if (userChoice === '1' || userChoice.includes("MONTHLY")) method = "Monthly Installments";
            else if (userChoice === '2' || userChoice.includes("ONCE")) method = "Once-off Settlement";
            else if (userChoice === '3' || userChoice.includes("FULL")) method = "Full Payment";
            else method = incomingMsg; 

            // Save choice to tempRequest immediately
            client.tempRequest.paymentPreference = method;
            client.sessionState = 'AWAITING_NEG_POA';
            client.markModified('tempRequest');

            return { 
                text: `Selected: *${method}*.\n\n📄 One moment while I prepare the *Power of Attorney* for your *${sName}*...`,
                action: 'SEND_POA' 
            };

        case 'AWAITING_NEG_POA':
            if (!mediaUrl) {
                return { text: "❌ Please upload the signed POA as a *Document* (PDF or Word)." };
            }
            const poaUrl = await uploadToCloudinary(mediaUrl, `POA_${rawType}_${client.idNumber}`);
            
            // Save to tempRequest so the DB function sees it
            client.tempRequest.poaUrl = poaUrl;
            client.sessionState = 'AWAITING_NEG_POR';
            client.markModified('tempRequest');
            
            return { text: `✅ *POA Received.*\n\nNow, please upload your *Proof of Residence* (Document) to finalize the request.` };

        case 'AWAITING_NEG_POR':
            if (!mediaUrl) {
                return { text: "❌ Please upload your *Proof of Residence* as a Document." };
            }
            const porUrl = await uploadToCloudinary(mediaUrl, `POR_${rawType}_${client.idNumber}`);
            
            // CRUCIAL: Save to tempRequest so it's available for the final database save
            client.tempRequest.porUrl = porUrl;

            client.documents.push(
                { docType: `${sName} POA`, url: client.tempRequest.poaUrl },
                { docType: `${sName} POR`, url: porUrl }
            );

            // Fetch the preference one last time for the summary text
            const finalMethod = client.tempRequest.paymentPreference || "Not Specified";

            client.markModified('tempRequest');

            return { 
                text: `🎉 *${sName} Request Submitted!*\n\n*Details Saved:*\n• Creditor: ${client.tempRequest.creditorName}\n• Payment Plan: ${finalMethod}\n\nOur team at *MKH Debtors* will process your file and update you shortly!`, 
                action: 'COMPLETE' 
            };

        default:
            return null;
    }
};