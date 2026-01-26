import SibApiV3Sdk from '@getbrevo/brevo';
import dotenv from 'dotenv';

// Load envs
dotenv.config();

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// set the API Key
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, 
  process.env.BREVO_API_KEY
);

export default apiInstance;