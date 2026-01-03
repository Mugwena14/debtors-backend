import SibApiV3Sdk from '@getbrevo/brevo';
import dotenv from 'dotenv';
dotenv.config();

const brevoClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = brevoClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

export const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
export default apiInstance;