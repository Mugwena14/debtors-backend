import ServiceRequest from '../models/serviceRequest.js';

export const handleFileUpdateService = async (client, incomingMsg) => {
    switch (client.sessionState) {
        case 'MAIN_MENU':
        case 'SERVICES_MENU':
        case 'AWAITING_FILE_UPDATE_INFO':
            // Fetch the 3 most recent active files for this client
            const activeFiles = await ServiceRequest.find({ clientId: client._id })
                .sort({ createdAt: -1 })
                .limit(3);

            if (activeFiles.length === 0) {
                client.sessionState = 'MAIN_MENU'; 
                return { 
                    text: "🔍 We couldn't find any active files linked to your profile.\n\nWould you like to start a new service? (Reply *0* for Menu)" 
                };
            }

            let fileList = "📂 *Your Active Files Status:*\n\n";
            activeFiles.forEach((file, index) => {
                const date = new Date(file.createdAt).toLocaleDateString();
                const type = file.serviceType.replace(/_/g, ' ');
                fileList += `${index + 1}. *${type}*\n   Status: ${file.status || 'Processing'}\n   Opened: ${date}\n\n`;
            });

            // Set state back to MAIN_MENU so any reply (like '0') works immediately
            client.sessionState = 'MAIN_MENU';
            
            return { 
                text: `${fileList}------------------------------\n💡 Reply *0* to return to the Main Menu.` 
            };

        default:
            client.sessionState = 'MAIN_MENU';
            return { text: "⚠️ Session timeout or error. Reply *0* to return to the Main Menu." };
    }
};