import twilio from 'twilio';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import ServiceRequest from '../models/serviceRequest.js';

// Service Imports
import { handlePaidUpService } from '../services/paidUpService.js';
import { handlePrescriptionService } from '../services/prescriptionService.js';
import { handleNegotiationService } from '../services/negotiationService.js';
import { handleCreditReportService } from '../services/creditReportService.js';
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
        if (clientInstance) {
            clientInstance.markModified('tempRequest');
            await clientInstance.save();
        }
        return res.type('text/xml').send(twiml.toString());
    };

    try {
        // 1. GATEKEEPER CHECK
        let client = await Client.findOne({ phoneNumber: fromNumber });

        if (!client) {
            client = await Client.create({ 
                phoneNumber: fromNumber, 
                sessionState: 'AWAITING_ID',
                accountStatus: 'Lead' 
            });
            twiml.message(
                "Welcome to *MKH Debtors & Solutions*. 🏢\n\n" +
                "To access our services, you need to register an account.\n\n" +
                "⚖️ *Notice:* By proceeding and creating an account, you agree to our Terms and Conditions.\n\n" +
                "Please enter your *13-digit ID Number* to begin:"
            );
            return sendTwiML(client);
        }

        const onboardingStates = ['AWAITING_ID', 'ONBOARDING_NAME', 'ONBOARDING_EMAIL'];
        const isRegistering = onboardingStates.includes(client.sessionState);

        // 2. HI / RESET / MENU HANDLER
        if (!isRegistering && ['hi', 'menu', 'hello', '0'].includes(rawBody.toLowerCase())) {
            client.sessionState = 'MAIN_MENU';
            client.tempRequest = {}; 
            await client.save();
            await sendMainMenuButtons(fromNumber, client.name);
            return sendTwiML(client);
        }

        // 3. MENU SELECTION LOGIC
        const isInMenuState = ['MAIN_MENU', 'SERVICES_MENU'].includes(client.sessionState);

        if (!isRegistering && isInMenuState) {
            let handled = true;
            switch (buttonPayload) {
                case '1':
                case 'VIEW_SERVICES':
                    client.sessionState = 'SERVICES_MENU';
                    await sendServicesMenu(fromNumber);
                    break;

                case '2':
                case 'SERVICE_PAID_UP':
                    client.tempRequest = { serviceType: 'PAID_UP_LETTER', creditorName: '', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_CREDITOR_NAME';
                    twiml.message("✅ *Paid Up Letter*\n\nPlease type the *Name of the Creditor*.");
                    break;

                case '3':
                case 'SERVICE_PRESCRIPTION':
                    client.tempRequest = { serviceType: 'PRESCRIPTION', creditorName: '', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_PRES_CREDITOR';
                    twiml.message("📜 *Prescription Letter*\n\nWhat is the *Name of the Creditor*?");
                    break;

                case '4':
                case 'SERVICE_CREDIT_REPORT':
                    client.tempRequest = { serviceType: 'CREDIT_REPORT', creditorName: 'Bureau Report', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_CREDIT_REPORT_POP'; 
                    twiml.message(
                        `📊 *Credit Report*\n\n` +
                        `To pull your report, a fee of *R350* is required.\n\n` +
                        `*Acc Holder:* MKH Debtors Associates\n` +
                        `Bank: *FNB*\n` +
                        `Branch: *255355*\n` +
                        `Acc: *63140304302*\n` +
                        `Ref: *Your Name & Surname*\n\n` +
                        `👉 Please upload your *Proof of Payment* to proceed.`
                    );                
                    break;

                case '5':
                case 'SERVICE_NEGOTIATION':
                    client.tempRequest = { serviceType: 'DEBT_REVIEW_REMOVAL', creditorName: '', paymentPreference: '', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_NEGOTIATION_CREDITOR';
                    twiml.message(`🤝 *Debt Review Removal*\n\nPlease type the *Name of the Creditor* involved.`);
                    break;

                case '6':
                case 'SERVICE_JUDGMENT':
                    client.tempRequest = { serviceType: 'JUDGMENT_REMOVAL', creditorName: '', paymentPreference: '', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_NEGOTIATION_CREDITOR';
                    twiml.message(`⚖️ *Judgment Removal*\n\nPlease type the *Name of the Creditor* associated with this Judgment.`);
                    break;

                case '7':
                case 'SERVICE_CAR_APP':
                    client.tempRequest = { serviceType: 'CAR_APPLICATION', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_CAR_DOCS';
                    twiml.message("🚗 *Car Finance Application*\n\nPlease upload **ONE PDF** containing your Bank Statements, Payslips, and ID Copy.");
                    break;

                case '8':
                case 'SERVICE_FILE_UPDATE':
                    client.tempRequest = { serviceType: 'FILE_UPDATE', lastActivity: new Date() };
                    client.sessionState = 'AWAITING_FILE_UPDATE_INFO';
                    const initialUpdate = await handleFileUpdateService(client, rawBody);
                    twiml.message(initialUpdate.text);
                    break;
                
                default:
                    handled = false;
            }
            if (handled) return sendTwiML(client);
        }

        // 4. SESSION ROUTING
        let serviceResponse = null;

        switch (client.sessionState) {
            case 'AWAITING_ID':
                if (!/^\d{13}$/.test(rawBody)) {
                    twiml.message("❌ *Invalid ID Number.*\n\nPlease ensure you enter exactly *13 digits*.");
                } else {
                    client.idNumber = rawBody;
                    client.sessionState = 'ONBOARDING_NAME';
                    twiml.message("✅ ID recorded. What is your *Full Name and Surname*?");
                }
                break;

            case 'ONBOARDING_NAME':
                if (rawBody.length < 3) {
                    twiml.message("❌ Please enter your full name.");
                } else {
                    client.name = rawBody;
                    client.sessionState = 'ONBOARDING_EMAIL';
                    twiml.message(`Thanks, ${rawBody.split(' ')[0]}! What is your *Email Address*?`);
                }
                break;

            case 'ONBOARDING_EMAIL':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(rawBody)) {
                    twiml.message("❌ *Invalid Email.*\n\nPlease enter a valid email address.");
                } else {
                    client.email = rawBody.toLowerCase();
                    client.sessionState = 'MAIN_MENU';
                    client.accountStatus = 'Active';
                    await client.save();
                    twiml.message("🎉 *Account Created Successfully!*");
                    await sendMainMenuButtons(fromNumber, client.name);
                    return sendTwiML(client);
                }
                break;

            case 'AWAITING_CREDIT_REPORT_POP':
                serviceResponse = await handleCreditReportService(client, mediaUrl);
                break;

            default:
                // Define state groupings for clean routing
                const negStates = ['AWAITING_NEGOTIATION_CREDITOR', 'AWAITING_PAYMENT_METHOD', 'AWAITING_NEG_POA', 'AWAITING_NEG_POR'];
                const presStates = ['AWAITING_PRES_CREDITOR', 'AWAITING_LAST_PAYMENT_DATE', 'AWAITING_PAYMENT_ARRANGEMENT', 'AWAITING_ANY_PAYMENTS', 'AWAITING_SUMMONS'];

                if (negStates.includes(client.sessionState)) {
                    serviceResponse = await handleNegotiationService(client, rawBody, mediaUrl, buttonPayload);
                } 
                else if (presStates.includes(client.sessionState)) {
                    serviceResponse = await handlePrescriptionService(client, rawBody, buttonPayload);
                }
                else if (client.sessionState === 'AWAITING_CAR_DOCS') {
                    serviceResponse = await handleCarAppService(client, mediaUrl, contentType);
                }
                else if (client.sessionState.startsWith('AWAITING_FILE_UPDATE')) {
                    serviceResponse = await handleFileUpdateService(client, rawBody);
                }
                else if (client.sessionState !== 'MAIN_MENU') {
                    // Fallback for Paid Up service and generic states
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
                        body: "📄 Please find the Power of Attorney template below. Download, sign, and upload it back here.",
                        mediaUrl: [process.env.POA_TEMPLATE_URL] 
                    });
                } catch (err) { console.error("❌ POA Send Error:", err.message); }
            }

            if (serviceResponse.action === 'COMPLETE') {
                client.markModified('tempRequest');
                await client.save();
                
                const snapshotData = JSON.parse(JSON.stringify(client.tempRequest));
                const confirmedType = snapshotData.serviceType || 'FILE_UPDATE';
                
                await saveRequestToDatabase(client, confirmedType, snapshotData);

                let summary = `📝 *Request Summary*\n` +
                              `━━━━━━━━━━━━━━\n` +
                              `📍 *Service:* ${confirmedType.replace(/_/g, ' ')}\n` +
                              `🏢 *Creditor:* ${snapshotData.creditorName || 'N/A'}\n`;
                
                if (snapshotData.paymentPreference && snapshotData.paymentPreference !== 'N/A') {
                    summary += `💳 *Payment:* ${snapshotData.paymentPreference}\n`;
                }

                summary += `✅ *Status:* Submitted for Review\n\n` +
                           (serviceResponse.text || "") + `\n\nReply *0* for Main Menu.`;
                
                client.sessionState = 'MAIN_MENU';
                client.tempRequest = {}; 
                twiml.message(summary);
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

async function sendMainMenuButtons(to, name) {
    const body = `Hello *${name}*! Welcome to MKH DEBTORS ASSOCIATES PTY LTD. 🏢\n\nHow can we help you today?\n\n*Reply with a number:*\n1️⃣ View All Services\n0️⃣ Reset Session`;
    try { await twilioClient.messages.create({ from: MY_TWILIO_NUMBER, to: to, body: body }); } catch (err) { console.error("Menu Error:", err.message); }
}

async function sendServicesMenu(to) {
    const body = `🛠 *Our Services*\n\n2️⃣ Paid Up Letter\n3️⃣ Prescription Letter\n4️⃣ Credit Report\n5️⃣ Debt Review Removal\n6️⃣ Judgment Removal\n7️⃣ Car Finance Application\n8️⃣ File Updates 📂\n\n0️⃣ *Back*`;
    try { await twilioClient.messages.create({ from: MY_TWILIO_NUMBER, to: to, body: body }); } catch (err) { console.error("Services Menu Error:", err.message); }
}

async function saveRequestToDatabase(client, serviceType, requestData) {
    try {
        const validTypes = [
            'PAID_UP_LETTER', 'PRESCRIPTION', 'CREDIT_REPORT', 
            'SETTLEMENT', 'DEFAULT_CLEARING', 'ARRANGEMENT', 
            'JUDGMENT_REMOVAL', 'CAR_APPLICATION', 
            'DEBT_REVIEW_REMOVAL', 'FILE_UPDATE'
        ];

        let normalizedType = serviceType;
        if (serviceType === 'CAR_APP') normalizedType = 'CAR_APPLICATION';
        if (!validTypes.includes(normalizedType)) normalizedType = 'FILE_UPDATE';

        await ServiceRequest.create({
            clientId: client._id,
            clientName: client.name,
            clientPhone: client.phoneNumber,
            serviceType: normalizedType,
            status: 'PENDING',
            details: {
                creditorName: requestData?.creditorName || 'N/A',
                paymentPreference: requestData?.paymentPreference || 'N/A',
                poaUrl: requestData?.poaUrl || null,
                porUrl: requestData?.porUrl || null,
                popUrl: requestData?.popUrl || null,
                mediaUrl: requestData?.mediaUrl || null
            }
        });
        console.log(`✅ ${normalizedType} saved correctly.`);
    } catch (err) { 
        console.error("❌ DB Save Error:", err.message); 
    }
}