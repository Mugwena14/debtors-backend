import SibApiV3Sdk from '@getbrevo/brevo';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// New way to initialize the Brevo Client
let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Set the API Key
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, 
  process.env.BREVO_API_KEY
);

export default apiInstance;