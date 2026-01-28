import ServiceRequest from '../models/serviceRequest.js';

export const handleFileUpdateService = async (client, incomingMsg) => {
    switch (client.sessionState) {
        case 'MAIN_MENU':
        case 'SERVICES_MENU':
            const activeFiles = await ServiceRequest.find({ clientId: client._id })
                .sort({ createdAt: -1 })
                .limit(3);

            if (activeFiles.length === 0) {
                return { 
                    text: "🔍 We couldn't find any active files linked to your ID.\n\nWould you like to start a new service? (Reply *0* for Menu)" 
                };
            }

            let fileList = "📂 *Your Active Files:*\n\n";
            activeFiles.forEach((file, index) => {
                const date = new Date(file.createdAt).toLocaleDateString();
                fileList += `${index + 1}. *${file.serviceType}*\n   Status: ${file.status || 'Processing'}\n   Opened: ${date}\n\n`;
            });

            client.sessionState = 'AWAITING_FILE_UPDATE_QUERY';
            return { 
                text: `${fileList}Do you have a specific question for the Admin regarding these files? Please type it below.` 
            };

        case 'AWAITING_FILE_UPDATE_QUERY':
            client.tempRequest = {
                serviceType: 'ADMIN_SUPPORT_QUERY',
                userQuery: incomingMsg,
                lastActivity: new Date()
            };
            
            return { 
                text: "✅ Thank you. Your message has been logged and assigned to an Admin. They will review your file and reply to you shortly.",
                action: 'COMPLETE' 
            };

        default:
            return { text: "Something went wrong. Reply *0* to restart." };
    }
};