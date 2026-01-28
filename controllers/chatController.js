import twilio from 'twilio';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import ServiceRequest from '../models/serviceRequest.js';

// Service Imports
import { handlePaidUpService } from '../services/paidUpService.js';
import { handlePrescriptionService } from '../services/prescriptionService.js';
import { handleNegotiationService } from '../services/negotiationService.js';
import { handleCarAppService } from '../services/carAppService.js';
import { handleFileUpdateService } from '../services/fileUpdateService.js';

const { MessagingResponse } = twilio.twiml;
const clientSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(clientSid, authToken);

const MY_TWILIO_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

export const handleIncomingMessage = async (req, res) => {
    const twiml = new MessagingResponse();
    const fromNumber = req.body.From;
    const receivedOn = req.body.To;
    
    if (receivedOn !== MY_TWILIO_NUMBER) {
        return res.status(200).send("Please message the official number.");
    }

    const mediaUrl = req.body.MediaUrl0;
    const contentType = req.body.MediaContentType0;
    const rawBody = req.body.Body ? req.body.Body.trim() : '';
    const buttonPayload = req.body.ButtonPayload || req.body.ListId || rawBody;

    const sendTwiML = async (clientInstance) => {
        if (clientInstance) await clientInstance.save();
        return res.type('text/xml').send(twiml.toString());
    };

    try {
        let client = await Client.findOne({ phoneNumber: fromNumber });

        // 1. NEW USER ONBOARDING
        if (!client) {
            client = await Client.create({ phoneNumber: fromNumber, sessionState: 'AWAITING_ID' });
            twiml.message("Welcome to *MKH Debtors & Solutions*. 🏢\n\nPlease enter your *ID Number* to access your profile.");
            return sendTwiML(client);
        }

        // 2. HI / RESET / MENU HANDLER
        if (['hi', 'menu', 'hello', '0'].includes(rawBody.toLowerCase())) {
            client.sessionState = 'MAIN_MENU';
            client.tempRequest = {}; 
            await client.save();
            await sendMainMenuButtons(fromNumber, client.name);
            return sendTwiML(client);
        }

        // 3. MENU SELECTION LOGIC
        const isInMenuState = ['MAIN_MENU', 'SERVICES_MENU'].includes(client.sessionState);

        if (isInMenuState) {
            switch (buttonPayload) {
                case '1':
                case 'VIEW_SERVICES':
                    client.sessionState = 'SERVICES_MENU';
                    await sendServicesMenu(fromNumber);
                    return sendTwiML(client);

                case '2':
                case 'SERVICE_PAID_UP':
                    client.tempRequest = { serviceType: 'PAID_UP_LETTER', creditorName: '', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_CREDITOR_NAME';
                    twiml.message("✅ *Paid Up Letter*\n\nPlease type the *Name of the Creditor*.");
                    return sendTwiML(client);

                case '3':
                case 'SERVICE_PRESCRIPTION':
                    client.tempRequest = { serviceType: 'PRESCRIPTION', creditorName: '', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_PRES_CREDITOR';
                    twiml.message("📜 *Prescription Letter*\n\nWhat is the *Name of the Creditor*?");
                    return sendTwiML(client);

                case '4':
                case 'SERVICE_CREDIT_REPORT':
                    // UPDATED: Directly ask for POP, skipping the plan buttons
                    client.tempRequest = { 
                        serviceType: 'CREDIT_REPORT', 
                        creditorName: 'Bureau Report', 
                        lastActivity: new Date() 
                    };
                    client.sessionState = 'AWAITING_PAYMENT_METHOD'; 
                    twiml.message(
                        `📊 *Credit Report*\n\n` +
                        `To pull your report, a fee of *R350* is required.\n\n` +
                        `*Acc Holder:* MKH Debtors Associates\n` +
                        `*Branch:* 255355\n` +
                        `Bank: *FNB*\nAcc: *63140304302*\nRef: *${client.name || 'Your Name'}*\n\n` +
                        `👉 Please upload your *Proof of Payment* (Image or PDF) to proceed.`
                    );                
                    return sendTwiML(client);

                case '5':
                case 'SERVICE_NEGOTIATION':
                    client.tempRequest = { serviceType: 'DEBT_REVIEW_REMOVAL', creditorName: '', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_NEGOTIATION_CREDITOR';
                    twiml.message(`🤝 *Debt Review Removal*\n\nPlease type the *Name of the Creditor* or Institution involved.`);
                    return sendTwiML(client);

                case '6':
                case 'SERVICE_JUDGMENT':
                    client.tempRequest = { serviceType: 'JUDGMENT_REMOVAL', creditorName: '', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_NEGOTIATION_CREDITOR';
                    twiml.message(`⚖️ *Judgment Removal*\n\nPlease type the *Name of the Creditor* associated with this Judgment.`);
                    return sendTwiML(client);

                case '7':
                case 'SERVICE_CAR_APP':
                    client.tempRequest = { serviceType: 'CAR_APPLICATION', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_CAR_DOCS';
                    twiml.message("🚗 *Car Finance Application*\n\nPlease upload **ONE PDF** containing your Bank Statements, Payslips, and ID Copy.");
                    return sendTwiML(client);

                case '8':
                case 'SERVICE_FILE_UPDATE':
                    client.sessionState = 'AWAITING_FILE_UPDATE_INFO';
                    const initialUpdate = await handleFileUpdateService(client, rawBody);
                    twiml.message(initialUpdate.text);
                    return sendTwiML(client);
            }
        }

        // 4. SESSION ROUTING
        let serviceResponse = null;

        switch (client.sessionState) {
            case 'AWAITING_ID':
                client.idNumber = rawBody;
                client.sessionState = 'ONBOARDING_NAME';
                twiml.message("ID recorded. What is your *Full Name*?");
                break;

            case 'ONBOARDING_NAME':
                client.name = rawBody;
                client.sessionState = 'ONBOARDING_EMAIL';
                twiml.message(`Thanks, ${rawBody}! What is your *Email Address*?`);
                break;

            case 'ONBOARDING_EMAIL':
                client.email = rawBody;
                client.sessionState = 'MAIN_MENU';
                await client.save();
                await sendMainMenuButtons(fromNumber, client.name);
                return sendTwiML(client);

            default:
                const negotiationStates = ['AWAITING_NEGOTIATION_CREDITOR', 'AWAITING_PAYMENT_METHOD', 'AWAITING_NEG_POA', 'AWAITING_NEG_POR'];

                if (negotiationStates.includes(client.sessionState)) {
                    serviceResponse = await handleNegotiationService(client, rawBody, mediaUrl, contentType, buttonPayload);
                } 
                else if (client.sessionState === 'AWAITING_CAR_DOCS') {
                    serviceResponse = await handleCarAppService(client, mediaUrl, contentType);
                }
                else if (client.sessionState.startsWith('AWAITING_FILE_UPDATE')) {
                    serviceResponse = await handleFileUpdateService(client, rawBody);
                }
                else if (client.sessionState.startsWith('AWAITING_PRES') || client.sessionState.includes('SUMMONS')) {
                    serviceResponse = await handlePrescriptionService(client, rawBody, buttonPayload);
                } 
                else if (client.sessionState !== 'MAIN_MENU') {
                    serviceResponse = await handlePaidUpService(client, rawBody, mediaUrl, contentType);
                }
                break;
        }

        // 5. FINALIZE SERVICE RESPONSE
        if (serviceResponse) {
            if (serviceResponse.action === 'SEND_POA') {
                try {
                    await twilioClient.messages.create({
                        from: MY_TWILIO_NUMBER,
                        to: fromNumber,
                        body: "📄 Please find the Power of Attorney template below. Download, sign, and upload it back here as a *DOCUMENT*.",
                        mediaUrl: [process.env.POA_TEMPLATE_URL] 
                    });
                } catch (err) { console.error("❌ POA Send Error:", err.message); }
            }

            if (serviceResponse.action === 'COMPLETE') {
                const sType = client.tempRequest.serviceType || 'SERVICE_QUERY';
                await saveRequestToDatabase(client, sType);
                client.sessionState = 'MAIN_MENU';
                client.tempRequest = {}; 
                twiml.message(serviceResponse.text + "\n\nReply *0* for the Main Menu.");
            } else {
                twiml.message(serviceResponse.text);
            }
        }

        return sendTwiML(client);

    } catch (error) {
        console.error("❌ Chatbot Error:", error);
        res.status(500).send("Error");
    }
};

// --- HELPERS ---
async function sendMainMenuButtons(to, name) {
    const body = `Hello *${name}*! Welcome to MKH DEBTORS ASSOCIATES PTY LTD. 🏢\n\nHow can we help you today?\n\n*Reply with a number:*\n1️⃣ View All Services\n0️⃣ Reset Session`;
    try {
        await twilioClient.messages.create({ from: MY_TWILIO_NUMBER, to: to, body: body });
    } catch (err) { console.error("Menu Error:", err.message); }
}

async function sendServicesMenu(to) {
    const body = `🛠 *Our Services*\n\n2️⃣ Paid Up Letter\n3️⃣ Prescription Letter\n4️⃣ Credit Report\n5️⃣ Debt Review Removal\n6️⃣ Judgment Removal\n7️⃣ Car Finance Application\n8️⃣ File Updates 📂\n\n0️⃣ *Back*`;
    try {
        await twilioClient.messages.create({ from: MY_TWILIO_NUMBER, to: to, body: body });
    } catch (err) { console.error("Services Menu Error:", err.message); }
}

async function saveRequestToDatabase(client, serviceType) {
    try {
        await ServiceRequest.create({
            clientId: client._id,
            clientName: client.name,
            clientPhone: client.phoneNumber,
            serviceType: serviceType,
            details: {
                creditorName: client.tempRequest?.creditorName || 'N/A',
                paymentPreference: client.tempRequest?.paymentPreference || 'N/A',
                poaUrl: client.tempRequest?.poaUrl,
                porUrl: client.tempRequest?.porUrl,
                popUrl: client.tempRequest?.popUrl // Added for Credit Reports
            }
        });
    } catch (err) { console.error("❌ DB Save Error:", err); }
}