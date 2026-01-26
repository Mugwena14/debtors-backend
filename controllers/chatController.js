import twilio from 'twilio';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import ServiceRequest from '../models/serviceRequest.js';

// Service Imports
import { handlePaidUpService } from '../services/paidUpService.js';
import { handlePrescriptionService } from '../services/prescriptionService.js';
import { handleCreditReportService } from '../services/creditReportService.js';
import { handleNegotiationService } from '../services/negotiationService.js';
import { handleCarAppService } from '../services/carAppService.js';

const { MessagingResponse } = twilio.twiml;
const clientSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(clientSid, authToken);

export const handleIncomingMessage = async (req, res) => {
    const twiml = new MessagingResponse();
    const fromNumber = req.body.From; // Already has 'whatsapp:' from Twilio
    const mediaUrl = req.body.MediaUrl0;
    const contentType = req.body.MediaContentType0;
    const rawBody = req.body.Body ? req.body.Body.trim() : '';
    const buttonPayload = req.body.ButtonPayload || req.body.ListId || rawBody;

    console.log(`📩 Message from ${fromNumber}: [Body: ${rawBody}] [Payload: ${buttonPayload}]`);

    // Helper to send TwiML and end the request
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

        // 2. HI / RESET HANDLER
        if (rawBody.toLowerCase() === 'hi' || rawBody.toLowerCase() === 'menu') {
            client.sessionState = 'MAIN_MENU';
            await client.save();
            await sendMainMenuButtons(fromNumber, client.name);
            return sendTwiML(client);
        }

        // 3. BUTTON PAYLOAD HANDLER
        switch (buttonPayload) {
            case 'VIEW_SERVICES':
                await sendServicesMenu(fromNumber);
                return sendTwiML(client);

            case 'MORE_SERVICES':
                await sendMoreServicesMenu(fromNumber);
                return sendTwiML(client);

            case 'SERVICE_PAID_UP':
                client.tempRequest = { serviceType: 'PAID_UP_LETTER', creditorName: '', requestIdNumber: '', lastActivity: new Date() };
                client.sessionState = 'AWAITING_CREDITOR_NAME';
                twiml.message("✅ *Paid Up Letter Selection*\n\nPlease type the *Name of the Creditor*.");
                return sendTwiML(client);

            case 'SERVICE_PRESCRIPTION':
                client.tempRequest = { serviceType: 'PRESCRIPTION', creditorName: '', lastActivity: new Date() };
                client.sessionState = 'AWAITING_PRES_CREDITOR';
                twiml.message("📜 *Prescription Letter Request*\n\nFirst, what is the *Name of the Creditor*?");
                return sendTwiML(client);

            case 'SERVICE_CREDIT_REPORT':
                client.tempRequest = { serviceType: 'CREDIT_REPORT', creditorName: 'Credit Report Consultation', lastActivity: new Date() };
                client.sessionState = 'AWAITING_REPORT_CONSULTATION';
                const bankDetails = `📊 *Credit Report Consultation*\n\nTo pull your report, a fee of *R350* is required.\n\n*Bank Details:*\nRef: ${client.idNumber || "ID Number"}\n\nOnce paid, please upload your *Proof of Payment* here.`;
                twiml.message(bankDetails);
                return sendTwiML(client);

            case 'SERVICE_SETTLEMENT':
            case 'SERVICE_DEFAULT':
            case 'SERVICE_ARRANGEMENT':
                const serviceNames = {
                    'SERVICE_SETTLEMENT': 'SETTLEMENT',
                    'SERVICE_DEFAULT': 'DEFAULT_CLEARING',
                    'SERVICE_ARRANGEMENT': 'ARRANGEMENT'
                };
                client.tempRequest = { creditorName: '', serviceType: serviceNames[buttonPayload], lastActivity: new Date() };
                client.sessionState = 'AWAITING_NEGOTIATION_CREDITOR';
                twiml.message(`🤝 *Negotiation Request*\n\nPlease type the *Name of the Creditor* you want to negotiate with.`);
                return sendTwiML(client);

            case 'SERVICE_JUDGMENT':
                await saveRequestToDatabase(client, 'JUDGMENT_REMOVAL');
                twiml.message(`⚖️ *Judgment Removal*\n\nPlease tap below to call an agent:\n\n📞 *Call:* +27820000000`);
                client.sessionState = 'MAIN_MENU';
                return sendTwiML(client);

            case 'SERVICE_CAR_APP':
                client.tempRequest = { serviceType: 'CAR_APPLICATION', lastActivity: new Date() };
                client.sessionState = 'AWAITING_CAR_DOCS';
                twiml.message("🚗 *Car Finance Application*\n\nPlease upload **ONE PDF** containing your Bank Statements, Payslips, and ID Copy.");
                return sendTwiML(client);

            case 'RESET_REQUEST':
                client.tempRequest = {};
                client.sessionState = 'MAIN_MENU';
                await client.save();
                await sendMainMenuButtons(fromNumber, client.name);
                return sendTwiML(client);
        }

        // 4. SESSION ROUTING
        let serviceResponse = null;

        switch (client.sessionState) {
            case 'AWAITING_ID':
                const existingId = await Client.findOne({ idNumber: rawBody });
                if (existingId && existingId.phoneNumber === fromNumber) {
                    client.sessionState = 'MAIN_MENU';
                    await client.save();
                    await sendMainMenuButtons(fromNumber, existingId.name);
                    return sendTwiML(client);
                }
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

            case 'MAIN_MENU':
                await sendMainMenuButtons(fromNumber, client.name);
                return sendTwiML(client);

            default:
                if (client.sessionState === 'AWAITING_REPORT_CONSULTATION') {
                    serviceResponse = await handleCreditReportService(client, rawBody, mediaUrl, contentType);
                } 
                else if (client.sessionState === 'AWAITING_CAR_DOCS') {
                    serviceResponse = await handleCarAppService(client, mediaUrl, contentType);
                }
                else if (client.sessionState.startsWith('AWAITING_PRES') || client.sessionState.includes('SUMMONS')) {
                    serviceResponse = await handlePrescriptionService(client, rawBody, buttonPayload);
                } 
                else if (client.sessionState.includes('NEGOTIATION')) {
                    serviceResponse = await handleNegotiationService(client, rawBody, mediaUrl, contentType, buttonPayload);
                }
                else {
                    serviceResponse = await handlePaidUpService(client, rawBody, mediaUrl, contentType);
                }
                break;
        }

        // 5. FINALIZE SERVICE RESPONSE
        if (serviceResponse) {
            if (serviceResponse.action === 'SEND_YES_NO_BUTTONS') {
                await client.save();
                await sendYesNoButtons(fromNumber, serviceResponse.text);
                return sendTwiML(client);
            }
            if (serviceResponse.action === 'COMPLETE') {
                await saveRequestToDatabase(client, client.tempRequest.serviceType);
                client.sessionState = 'MAIN_MENU';
                client.tempRequest = {}; 
            }
            twiml.message(serviceResponse.text);
        }

        return sendTwiML(client);

    } catch (error) {
        console.error("❌ Chatbot Error:", error);
        res.status(500).send("Error");
    }
};

// HELPERS (Ensuring 'whatsapp:' prefix is handled)

async function saveRequestToDatabase(client, serviceType) {
    try {
        await ServiceRequest.create({
            clientId: client._id,
            clientName: client.name,
            clientPhone: client.phoneNumber,
            serviceType: serviceType,
            details: {
                creditorName: client.tempRequest?.creditorName,
                requestIdNumber: client.tempRequest?.requestIdNumber,
                mediaUrl: client.tempRequest?.poaUrl || client.tempRequest?.porUrl || client.tempRequest?.popUrl || client.tempRequest?.mediaUrl,
                answers: client.tempRequest
            }
        });
    } catch (err) { console.error("❌ Database Save Error:", err); }
}

async function sendMainMenuButtons(to, name) {
    try {
        await twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER, // Must be 'whatsapp:+123...'
            to: to.includes('whatsapp:') ? to : `whatsapp:${to}`,
            contentSid: process.env.TWILIO_MAIN_MENU_SID,
            contentVariables: JSON.stringify({ "1": name })
        });
    } catch (err) { console.error("Menu Error:", err.message); }
}

async function sendServicesMenu(to) {
    try {
        await twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: to.includes('whatsapp:') ? to : `whatsapp:${to}`,
            contentSid: process.env.TWILIO_SERVICES_MENU_SID,
            contentVariables: JSON.stringify({ "1": "Available Services" }),
        });
    } catch (err) { console.error("❌ Services Menu Rejection:", err.message); }
}

async function sendMoreServicesMenu(to) {
    try {
        await twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: to.includes('whatsapp:') ? to : `whatsapp:${to}`,
            contentSid: process.env.TWILIO_SERVICES_MENU_2_SID,
            contentVariables: JSON.stringify({ "1": "Specialized Services:" })
        });
    } catch (err) { console.error("More Services Error:", err.message); }
}

async function sendYesNoButtons(to, bodyText) {
    try {
        await twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: to.includes('whatsapp:') ? to : `whatsapp:${to}`,
            body: bodyText,
            contentSid: process.env.TWILIO_YES_NO_SID
        });
    } catch (err) { console.error("Yes/No Error:", err.message); }
}