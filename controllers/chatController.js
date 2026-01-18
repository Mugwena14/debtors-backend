import twilio from 'twilio';
const { MessagingResponse } = twilio.twiml;
import Client from '../models/Client.js';
import { handlePaidUpService } from '../services/paidUpService.js';
import { handlePrescriptionService } from '../services/prescriptionService.js';
import { handleCreditReportService } from '../services/creditReportService.js';
import { handleNegotiationService } from '../services/negotiationService.js';
import { handleCarAppService } from '../services/carAppService.js';

const clientSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(clientSid, authToken);

export const handleIncomingMessage = async (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body ? req.body.Body.trim() : '';
  const fromNumber = req.body.From;
  const buttonPayload = req.body.ButtonPayload;
  const mediaUrl = req.body.MediaUrl0;
  const contentType = req.body.MediaContentType0;

  try {
    let client = await Client.findOne({ phoneNumber: fromNumber });

    // --- 0. INITIAL ONBOARDING CHECK ---
    if (!client) {
      client = await Client.create({ phoneNumber: fromNumber, sessionState: 'AWAITING_ID' });
      twiml.message("Welcome to *MKH Debtors & Solutions*. 🏢\n\nPlease enter your *ID Number* to access your profile.");
      return res.type('text/xml').send(twiml.toString());
    }

    // --- 1. GLOBAL HI HANDLER ---
    if (incomingMsg.toLowerCase() === 'hi' && !buttonPayload) {
      if (client.tempRequest?.creditorName) {
        await sendResumeMenu(fromNumber, client.tempRequest.creditorName);
      } else {
        client.sessionState = 'MAIN_MENU';
        await client.save();
        await sendMainMenuButtons(fromNumber, client.name);
      }
      return res.status(200).end();
    }

    // --- 2. BUTTON HANDLER ---
    if (buttonPayload) {
      switch (buttonPayload) {
        case 'VIEW_SERVICES':
          // This serves as Page 1 and the "Back" button target
          await sendServicesMenu(fromNumber);
          return res.status(200).end();

        case 'MORE_SERVICES':
          // This serves as Page 2
          await sendMoreServicesMenu(fromNumber);
          return res.status(200).end();

        case 'SERVICE_PAID_UP':
          client.tempRequest = { creditorName: '', requestIdNumber: '', poaUrl: '', porUrl: '', lastActivity: new Date() };
          client.sessionState = 'AWAITING_CREDITOR_NAME';
          twiml.message("✅ *Paid Up Letter Selection*\n\nPlease type the *Name of the Creditor*.");
          await client.save();
          return res.type('text/xml').send(twiml.toString());
        
        case 'SERVICE_PRESCRIPTION':
          client.tempRequest = { creditorName: '', lastActivity: new Date() };
          client.sessionState = 'AWAITING_PRES_CREDITOR';
          twiml.message("📜 *Prescription Letter Request*\n\nTo see if this debt has legally prescribed, I need to ask a few questions.\n\nFirst, what is the *Name of the Creditor*?");
          await client.save();
          return res.type('text/xml').send(twiml.toString());

        case 'SERVICE_CREDIT_REPORT':
          client.tempRequest = { creditorName: 'Credit Report Consultation', lastActivity: new Date() };
          client.sessionState = 'AWAITING_REPORT_CONSULTATION';
          const bankDetails = "📊 *Credit Report Consultation*\n\nTo pull your official report and provide an analysis, a consultation fee of *R350* is required.\n\n*Bank Details:*\nRef: " + (client.idNumber || "Your ID Number") + "\n\nOnce paid, please upload your *Proof of Payment* here as a Document or Image.";
          twiml.message(bankDetails);
          await client.save();
          return res.type('text/xml').send(twiml.toString());

        case 'SERVICE_SETTLEMENT':
        case 'SERVICE_DEFAULT':
        case 'SERVICE_ARRANGEMENT':
          const serviceNames = {
            'SERVICE_SETTLEMENT': 'Settlement Letter',
            'SERVICE_DEFAULT': 'Default Account Clearing',
            'SERVICE_ARRANGEMENT': 'Payment Arrangement'
          };
          client.tempRequest = { creditorName: '', serviceType: serviceNames[buttonPayload], lastActivity: new Date() };
          client.sessionState = 'AWAITING_NEGOTIATION_CREDITOR';
          twiml.message(`🤝 *${serviceNames[buttonPayload]}*\n\nPlease type the *Name of the Creditor* you want to negotiate with.`);
          await client.save();
          return res.type('text/xml').send(twiml.toString());

        case 'SERVICE_JUDGMENT':
          const agentNumber = "+27820000000"; 
          twiml.message(`⚖️ *Judgment Removal*\n\nRemoving a judgment from your record requires a legal specialist to review your court files.\n\nPlease tap the number below to speak directly with an agent who can assist you:\n\n📞 *Call Agent:* ${agentNumber}\n\n_Our office hours are 08:00 - 17:00._`);
          client.sessionState = 'MAIN_MENU';
          await client.save();
          return res.type('text/xml').send(twiml.toString());

        case 'SERVICE_CAR_APP':
          client.tempRequest = { serviceType: 'Car Application', lastActivity: new Date() };
          client.sessionState = 'AWAITING_CAR_DOCS';
          twiml.message("🚗 *Car Finance Application*\n\nPlease upload **ONE PDF or Document** containing your:\n- 3 Months Bank Statements\n- 3 Months Payslips\n- Proof of Residence\n- Driver's License\n- ID Copy");
          await client.save();
          return res.type('text/xml').send(twiml.toString());

        case 'CONTINUE_REQUEST':
          if (client.sessionState.includes('CREDITOR')) client.sessionState = 'AWAITING_REQ_ID';
          twiml.message("Great! Picking up where we left off... 🔄");
          await client.save();
          return res.type('text/xml').send(twiml.toString());

        case 'RESET_REQUEST':
          client.tempRequest = { creditorName: '', requestIdNumber: '', poaUrl: '', porUrl: '' };
          client.sessionState = 'MAIN_MENU';
          await client.save();
          await sendMainMenuButtons(fromNumber, client.name);
          return res.status(200).end();
      }
    }

    // --- 3. ONBOARDING & SERVICE ROUTING ---
    let serviceResponse = null;

    switch (client.sessionState) {
      case 'AWAITING_ID':
        const existingId = await Client.findOne({ idNumber: incomingMsg });
        if (existingId && existingId.phoneNumber === fromNumber) {
          client.sessionState = 'MAIN_MENU';
          await client.save();
          await sendMainMenuButtons(fromNumber, existingId.name);
          return res.status(200).end();
        }
        client.idNumber = incomingMsg;
        client.sessionState = 'ONBOARDING_NAME';
        twiml.message("ID not found. What is your *Full Name*?");
        break;

      case 'ONBOARDING_NAME':
        client.name = incomingMsg;
        client.sessionState = 'ONBOARDING_EMAIL';
        twiml.message(`Thanks, ${incomingMsg}! Email?`);
        break;

      case 'ONBOARDING_EMAIL':
        client.email = incomingMsg;
        client.sessionState = 'MAIN_MENU';
        await client.save();
        await sendMainMenuButtons(fromNumber, client.name);
        return res.status(200).end();

      case 'MAIN_MENU':
        await sendMainMenuButtons(fromNumber, client.name);
        return res.status(200).end();

      default:
        // ROUTE TO SERVICE
        if (client.sessionState === 'AWAITING_REPORT_CONSULTATION') {
          serviceResponse = await handleCreditReportService(client, incomingMsg, mediaUrl, contentType);
        } 
        else if (client.sessionState === 'AWAITING_CAR_DOCS') {
          serviceResponse = await handleCarAppService(client, mediaUrl, contentType);
        }
        else if (client.sessionState.startsWith('AWAITING_PRES') || client.sessionState.includes('SUMMONS') || client.sessionState.includes('PAYMENT')) {
          serviceResponse = await handlePrescriptionService(client, incomingMsg, buttonPayload);
        } 
        else if (client.sessionState.includes('NEGOTIATION') || client.sessionState.startsWith('AWAITING_NEG')) {
          serviceResponse = await handleNegotiationService(client, incomingMsg, mediaUrl, contentType, buttonPayload);
        }
        else {
          serviceResponse = await handlePaidUpService(client, incomingMsg, mediaUrl, contentType);
        }
        break;
    }

    // --- 4. HANDLE SERVICE RESPONSE ---
    if (serviceResponse) {
      if (serviceResponse.action === 'SEND_YES_NO_BUTTONS') {
        await client.save();
        return await sendYesNoButtons(fromNumber, serviceResponse.text);
      }

      if (serviceResponse.action === 'SEND_PAYMENT_OPTIONS') {
        await client.save();
        return await sendPaymentOptions(fromNumber, serviceResponse.text);
      }

      twiml.message(serviceResponse.text);
      
      if (serviceResponse.action === 'SEND_POA') {
        await client.save();
        res.type('text/xml').send(twiml.toString());
        return await sendPOADocument(fromNumber);
      }

      if (serviceResponse.action === 'COMPLETE') {
        client.sessionState = 'MAIN_MENU';
      }
    }

    await client.save();
    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).send("Error");
  }
};

// --- HELPERS ---
async function sendMainMenuButtons(to, name) {
  try { await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to, contentSid: process.env.TWILIO_MAIN_MENU_SID, contentVariables: JSON.stringify({ "1": name }) }); } catch (err) { console.error(err); }
}

async function sendServicesMenu(to) {
  try { await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to, contentSid: process.env.TWILIO_SERVICES_MENU_SID, contentVariables: JSON.stringify({ "1": "Select a service below (Page 1):" }) }); } catch (err) { console.error(err); }
}

async function sendMoreServicesMenu(to) {
  try { await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to, contentSid: process.env.TWILIO_SERVICES_MENU_2_SID, contentVariables: JSON.stringify({ "1": "More specialized services (Page 2):" }) }); } catch (err) { console.error(err); }
}

async function sendResumeMenu(to, creditorName) {
  try { await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to, contentSid: process.env.TWILIO_RESUME_MENU_SID, contentVariables: JSON.stringify({ "1": creditorName }) }); } catch (err) { console.error(err); }
}

async function sendPOADocument(to) {
  try { await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to, body: "Please sign and upload the POA back here as a *Document*.", mediaUrl: [process.env.POA_TEMPLATE_URL] }); } catch (err) { console.error(err); }
}

async function sendYesNoButtons(to, bodyText) {
  try { await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to, body: bodyText, contentSid: process.env.TWILIO_YES_NO_SID }); } catch (err) { console.error(err); }
}

async function sendPaymentOptions(to, bodyText) {
  try { await twilioClient.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to, body: bodyText, contentSid: process.env.TWILIO_PAYMENT_OPTIONS_SID }); } catch (err) { console.error(err); }
}