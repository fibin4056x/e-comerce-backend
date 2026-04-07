const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  try {
    console.log("📤  Preparing to send email...");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,     // e.g. smtp.gmail.com / smtp.zoho.com / smtp.mailtrap.io
      port: process.env.SMTP_PORT,     // 587 (TLS) or 465 (SSL)
      secure: process.env.SMTP_PORT == 465, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Your App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    console.log("✅ Email sent:", info.messageId);

  } catch (error) {
    console.error("❌ EMAIL ERROR:", error);
  }
};

module.exports = sendEmail;