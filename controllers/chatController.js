import twilio from 'twilio';
const { MessagingResponse } = twilio.twiml;
import Client from '../models/Client.js';

const clientSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(clientSid, authToken);

export const handleIncomingMessage = async (req, res) => {
  const twiml = new MessagingResponse();
  const incomingMsg = req.body.Body ? req.body.Body.trim() : '';
  const fromNumber = req.body.From;
  const buttonPayload = req.body.ButtonPayload; 

  try {
    let client = await Client.findOne({ phoneNumber: fromNumber });

    if (!client) {
      client = await Client.create({ phoneNumber: fromNumber, sessionState: 'AWAITING_ID' });
      twiml.message("Welcome to *MKH Debtors & Solutions*. 🏢\n\nI am your assistance, by continuing with this chat, you agree that you comply with our *Terms & Conditions*. \n\nPlease enter your *ID Number* to access your profile.");
      return res.type('text/xml').send(twiml.toString());
    }

    // --- BUTTON HANDLER ---
    if (buttonPayload) {
      switch (buttonPayload) {
        case 'VIEW_STATUS':
          twiml.message(`*Update:* Your status is currently: ${client.accountStatus}.`);
          break;

        case 'VIEW_DOCS':
          if (client.documents && client.documents.length > 0) {
            let docList = client.documents.map((d, i) => `*${i + 1}.* ${d.docType}`).join('\n');
            twiml.message(`📂 *Available Documents:*\n\n${docList}\n\nType the number or name of the document you wish to receive.`);
          } else {
            twiml.message("❌ You don't have any documents ready for download yet.");
          }
          break;

        case 'VIEW_BALANCE':
          twiml.message(`💰 Your outstanding balance is *R${client.outstandingBalance || 0}*.`);
          break;
      }
      await client.save();
      return res.type('text/xml').send(twiml.toString());
    }

    // --- DOCUMENT DELIVERY LOGIC ---
    if (client.sessionState === 'MAIN_MENU' && client.documents.length > 0) {
      const requestedDoc = client.documents.find(doc => 
        incomingMsg.toLowerCase().includes(doc.docType.toLowerCase()) || 
        incomingMsg === (client.documents.indexOf(doc) + 1).toString()
      );

      if (requestedDoc) {
        await twilioClient.messages.create({
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: fromNumber,
          body: `Here is your requested document: *${requestedDoc.docType}*`,
          mediaUrl: [requestedDoc.url] 
        });
        return res.status(200).end();
      }
    }

    // --- STATE-BASED LOGIC FLOW ---
    switch (client.sessionState) {
      case 'AWAITING_ID':
        const existingIdRecord = await Client.findOne({ idNumber: incomingMsg });
        if (existingIdRecord) {
          if (existingIdRecord.phoneNumber === fromNumber) {
            client.sessionState = 'MAIN_MENU';
            await client.save();
            await sendMainMenuButtons(fromNumber, existingIdRecord.name);
            return res.status(200).end();
          } else {
            twiml.message("⚠️ Security Alert: This ID is linked to another number.");
          }
        } else {
          client.idNumber = incomingMsg;
          client.sessionState = 'ONBOARDING_NAME';
          twiml.message("ID not found. Let's register you! 📝\n\nWhat is your *Full Name*?");
        }
        break;

      case 'ONBOARDING_NAME':
        client.name = incomingMsg;
        client.sessionState = 'ONBOARDING_EMAIL';
        twiml.message(`Thanks, ${incomingMsg}! What is your *Email Address*?`);
        break;

      case 'ONBOARDING_EMAIL':
        client.email = incomingMsg;
        client.accountStatus = 'Lead';
        client.sessionState = 'MAIN_MENU';
        await client.save();
        await sendMainMenuButtons(fromNumber, client.name);
        return res.status(200).end();

      case 'MAIN_MENU':
        await sendMainMenuButtons(fromNumber, client.name);
        return res.status(200).end();

      default:
        twiml.message("Hello! Send 'Hi' to open the menu.");
        client.sessionState = 'MAIN_MENU';
    }

    await client.save();
    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).send("Error processing request");
  }
};

async function sendMainMenuButtons(to, name) {
  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: to,
      contentSid: process.env.TWILIO_MAIN_MENU_SID || 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      contentVariables: JSON.stringify({ "1": name })
    });
  } catch (err) {
    console.error("Failed to send buttons:", err);
  }
}