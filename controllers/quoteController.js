import apiInstance from "../config/brevo.js";

export const handleQuoteRequest = async (req, res) => {
  try {
    // Corrected destructuring to match your frontend payload
    const { name, email, phone, service, whatsaap, message } = req.body;

    // Use the specific WhatsApp field for the link, fallback to phone if whatsaap is empty
    const whatsappTarget = whatsaap || phone;
    const cleanWhatsApp = whatsappTarget ? whatsappTarget.replace(/\D/g, '') : '';
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

    // Process attachments (ID Copy) from Multer
    const attachments = req.files?.length
      ? req.files.map((file) => ({
          name: file.originalname,
          content: file.buffer.toString("base64"),
        }))
      : null;

    // -------------------
    // 1. Admin Email (Internal Lead)
    // -------------------
    const adminEmail = {
      sender: { email: process.env.ADMIN_EMAIL, name: "MKH Web Portal" },
      to: [{ email: process.env.ADMIN_EMAIL }],
      subject: `New Lead: ${name} — ${service}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px; border: 1px solid #eee; padding:20px; color:#11013d; background-color: #ffffff;">
          <h2 style="color:#0033A1; border-bottom: 2px solid #00B4D8; padding-bottom:10px; margin-top:0;">New Lead Received</h2>
          
          <div style="background-color: #f4f7f9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Client Name:</strong> ${name}</p>
            <p style="margin: 5px 0;"><strong>Service Requested:</strong> <span style="color:#00B4D8; font-weight:bold;">${service}</span></p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Phone Number:</strong> ${phone}</p>
            <p style="margin: 5px 0;"><strong>WhatsApp Number:</strong> ${whatsaap || 'Same as phone'}</p>
            ${message ? `<p style="margin: 5px 0;"><strong>Message:</strong> ${message}</p>` : ""}
          </div>

          <p style="font-weight: bold; color: #0033A1; margin-bottom: 15px;">Quick Actions:</p>
          
          <div style="margin-bottom: 20px;">
            <a href="tel:${cleanPhone}" style="display:inline-block; padding:12px 20px; background-color:#0033A1; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:5px; margin-right:10px; margin-bottom:10px;">
               📞 Call Phone
            </a>
            
            <a href="https://wa.me/${cleanWhatsApp}" style="display:inline-block; padding:12px 20px; background-color:#25D366; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:5px; margin-right:10px; margin-bottom:10px;">
               💬 WhatsApp
            </a>

            <a href="mailto:${email}" style="display:inline-block; padding:12px 20px; background-color:#00B4D8; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:5px; margin-bottom:10px;">
               ✉️ Email
            </a>
          </div>

          <p style="font-size:11px; color:#999; border-top: 1px solid #eee; padding-top:10px; margin-top:20px;">
            Note: If the client uploaded an ID copy, it is attached to this email.
          </p>
        </div>
      `,
      attachment: attachments,
    };

    await apiInstance.sendTransacEmail(adminEmail);

    // -------------------
    // 2. Client Confirmation Email
    // -------------------
    await apiInstance.sendTransacEmail({
      sender: { email: process.env.ADMIN_EMAIL, name: "MKH Debtors Associates" },
      to: [{ email: email }],
      subject: "Confirmation: Your Credit Consultation Request",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; max-width:600px; background-color: #f9f9f9; padding:20px; color:#333;">
          <div style="text-align:center; margin-bottom:20px;">
             <h2 style="color:#0033A1; margin:0;">Thank you, ${name}!</h2>
             <p style="color:#00B4D8; font-weight:bold; margin-top:5px;">Your financial freedom journey starts here.</p>
          </div>
          
          <p>Hello,</p>
          <p>We have successfully received your request for <strong>${service}</strong>. Our team will contact you shortly on <strong>${phone}</strong> or via WhatsApp.</p>
          
          <div style="background:#fff; padding:15px; border-left:4px solid #00B4D8; margin:20px 0;">
             <p style="margin:0; font-weight:bold;">What's Next?</p>
             <ul style="margin:10px 0; padding-left:20px;">
                <li>A consultant from our Pretoria or Burgersfort office will review your file.</li>
                <li>Keep your ID copy and a consultaion fee of R350 for the consultation.</li>
             </ul>
          </div>

          <p>Regards,<br><strong>MKH Debtors Associates Team</strong></p>
          <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;">
          <p style="font-size:11px; color:#888; text-align:center;">Regulated by the National Credit Act | POPI Act Compliant</p>
        </div>
      `,
    });

    res.json({ success: true, message: "Lead sent to admin and client confirmed." });
  } catch (error) {
    console.error("Brevo Error:", error.response?.data || error);
    res.status(500).json({ success: false, error: "System failed to send emails." });
  }
};
