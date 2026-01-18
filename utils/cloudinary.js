import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (fileUrl, publicId) => {
  try {
    const authenticatedUrl = fileUrl.replace(
      'https://',
      `https://${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}@`
    );

    const result = await cloudinary.uploader.upload(authenticatedUrl, {
      public_id: publicId,
      resource_type: 'auto',
      folder: 'debtors_documents'
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error Details:", error);
    throw new Error("Failed to upload document to cloud storage.");
  }
};