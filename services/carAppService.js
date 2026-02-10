import { uploadToCloudinary } from '../utils/cloudinary.js';

export const handleCarAppService = async (client, mediaUrl, contentType, body) => {
    // 1. Initialize tempRequest properly
    if (!client.tempRequest) client.tempRequest = {};
    if (!client.tempRequest.mediaUrls) {
        client.tempRequest.mediaUrls = [];
    }

    const incomingText = body?.toLowerCase()?.trim();

    // 2. Handle the "Finish" triggers
    // We check this first. If the user types DONE or if they just send text without an image
    if (incomingText === 'done' || incomingText === '10') {
        if (client.tempRequest.mediaUrls.length === 0) {
            return { text: "⚠️ You haven't uploaded any documents yet. Please send photos of your Bank Statements, Payslips, and ID." };
        }
        return finishApplication(client);
    }

    // 3. Handle Image Uploads
    if (mediaUrl && contentType?.startsWith('image/')) {
        try {
            const imgUrl = await uploadToCloudinary(mediaUrl, `CAR_APP_${client.idNumber || client.phoneNumber}_${Date.now()}`);

            // Push to temp array
            client.tempRequest.mediaUrls.push(imgUrl);
            
            // Force Mongoose to see the change in the array
            client.markModified('tempRequest');

            const count = client.tempRequest.mediaUrls.length;

            // Auto-complete at 4 images (Bank x3 + ID) or just keep asking
            if (count >= 4) {
                return finishApplication(client);
            }

            return { 
                text: `📸 *Document Received!* (${count} total)\n\nPlease send the next photo. If you are finished, reply *DONE*.` 
            };
        } catch (error) {
            console.error("Car App Upload Error:", error);
            return { text: "⚠️ Error uploading photo. Please try again." };
        }
    }

    // 4. Fallback: If they sent text that wasn't 'done' while in this state
    return { text: "📸 Please upload your documents as *Photos*. Once finished, reply *DONE*." };
};

const finishApplication = (client) => {
    const count = client.tempRequest.mediaUrls.length;
    
    // Explicitly set the service type so saveRequestToDatabase knows what it is
    client.tempRequest.serviceType = 'CAR_APPLICATION';
    client.tempRequest.creditorName = 'Vehicle Finance Dept';

    // We do NOT clear mediaUrls here yet, because saveRequestToDatabase 
    // in the controller needs to read them from the snapshot right after this returns.
    
    return { 
        text: `Application submitted with ${count} documents.`, 
        action: 'COMPLETE' 
    };
};
