export const handlePrescriptionService = async (client, incomingMsg, buttonPayload) => {
  const disqualificationMsg = "⚠️ *Status: Not Eligible*\n\nBased on your answer, this debt has not prescribed. A debt only prescribes if 3 years have passed without payment, arrangements, or summons.\n\nReply *0* for the Main Menu.";

  // Handle variations of YES/NO
  const userChoice = (buttonPayload || incomingMsg || '').toUpperCase().trim();
  const isYes = ['YES', 'YEA', 'YUP', '1'].includes(userChoice);
  const isNo = ['NO', 'NAH', 'N', '2'].includes(userChoice);

  switch (client.sessionState) {
    case 'AWAITING_PRES_CREDITOR':
      client.tempRequest.creditorName = incomingMsg;
      client.sessionState = 'AWAITING_LAST_PAYMENT_DATE';
      client.markModified('tempRequest'); 
      return { 
        text: `Got it: *${incomingMsg}*.\n\nApproximately how many years has it been since your *last payment*? (e.g., 2, 4, 10)` 
      };

    case 'AWAITING_LAST_PAYMENT_DATE':
      const years = parseInt(incomingMsg);
      if (isNaN(years) || years < 3) {
        client.sessionState = 'MAIN_MENU';
        return { text: disqualificationMsg };
      }
      client.sessionState = 'AWAITING_PAYMENT_ARRANGEMENT';
      return { 
        text: "In the past 3 years, did you make any *payment arrangements* with the creditor?\n\nReply *YES* or *NO*."
      };

    case 'AWAITING_PAYMENT_ARRANGEMENT':
      if (isYes) {
        client.sessionState = 'MAIN_MENU';
        return { text: disqualificationMsg };
      }
      client.sessionState = 'AWAITING_ANY_PAYMENTS';
      return { 
        text: "Did you make *any payments* toward this account in the last 3 years?\n\nReply *YES* or *NO*."
      };

    case 'AWAITING_ANY_PAYMENTS':
      if (isYes) {
        client.sessionState = 'MAIN_MENU';
        return { text: disqualificationMsg };
      }
      client.sessionState = 'AWAITING_SUMMONS';
      return { 
        text: "Have you ever received a *legal summons* for this specific debt?\n\nReply *YES* or *NO*."
      };

    case 'AWAITING_SUMMONS':
      if (isYes) {
        client.sessionState = 'MAIN_MENU';
        return { text: disqualificationMsg };
      }
      
      const sName = client.tempRequest.serviceType?.replace(/_/g, ' ') || "Prescription Letter";
      
      client.markModified('tempRequest');
      return { 
        text: `Based on your answers, your debt with *${client.tempRequest.creditorName}* appears to have prescribed. Our team will get back to you shortly.`, 
        action: 'COMPLETE' 
      };

    default:
      return null;
  }
};