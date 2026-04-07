const nodemailer = require("nodemailer");

/* =========================
   VALIDATE ENV
========================= */
if (!process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS) {
  throw new Error("SMTP configuration is missing");
}

/* =========================
   SINGLE TRANSPORTER (REUSE)
========================= */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000, // 10s
});

/* =========================
   SEND EMAIL
========================= */
const sendEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
      from: `"Your App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    return info;

  } catch (error) {
    // DO NOT swallow error
    throw new Error("Email sending failed");
  }
};

module.exports = sendEmail;