import twilio from 'twilio';
const clientSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(clientSid, authToken);

export const handlePrescriptionService = async (client, incomingMsg, buttonPayload) => {
  const disqualificationMsg = "⚠️ *Status: Not Eligible*\n\nBased on your answer, this debt has not prescribed. A debt only prescribes if 3 years have passed without payment, payment arrangements, or legal summons. Unfortunately, we cannot assist with a Prescription Letter for this account.";

  switch (client.sessionState) {
    case 'AWAITING_PRES_CREDITOR':
      client.tempRequest.creditorName = incomingMsg;
      client.sessionState = 'AWAITING_LAST_PAYMENT_DATE';
      return { text: `Got it: *${incomingMsg}*.\n\nApproximately how many years has it been since your *last payment* towards this account? (e.g., 2, 4, 10)` };

    case 'AWAITING_LAST_PAYMENT_DATE':
      const years = parseInt(incomingMsg);
      if (isNaN(years) || years < 3) {
        client.sessionState = 'MAIN_MENU';
        return { text: "⚠️ We can only assist if the last payment was *more than 3 years ago*. " + disqualificationMsg };
      }
      client.sessionState = 'AWAITING_PAYMENT_ARRANGEMENT';
      return { 
        text: "In the past 3 years, did you make any *payment arrangements* with the creditor or a debt collector?",
        action: 'SEND_YES_NO_BUTTONS' 
      };

    case 'AWAITING_PAYMENT_ARRANGEMENT':
      if (buttonPayload === 'YES') {
        client.sessionState = 'MAIN_MENU';
        return { text: disqualificationMsg };
      }
      client.sessionState = 'AWAITING_ANY_PAYMENTS';
      return { 
        text: "Did you make *any payments* at all toward this account in the last 3 years?",
        action: 'SEND_YES_NO_BUTTONS' 
      };

    case 'AWAITING_ANY_PAYMENTS':
      if (buttonPayload === 'YES') {
        client.sessionState = 'MAIN_MENU';
        return { text: disqualificationMsg };
      }
      client.sessionState = 'AWAITING_SUMMONS';
      return { 
        text: "Have you ever received a *legal summon/s* for this specific debt?",
        action: 'SEND_YES_NO_BUTTONS' 
      };

    case 'AWAITING_SUMMONS':
      if (buttonPayload === 'YES') {
        client.sessionState = 'MAIN_MENU';
        return { text: disqualificationMsg };
      }
      
      const finalMsg = `🎉 *Great News!*\n\nBased on your answers, your debt with *${client.tempRequest.creditorName}* appears to have prescribed. \n\nOur admin team will prepare the necessary legal letters and contact you shortly to finalize the process.`;
      
      client.sessionState = 'MAIN_MENU';
      client.tempRequest = { creditorName: '' };
      return { text: finalMsg, action: 'COMPLETE' };

    default:
      return null;
  }
};