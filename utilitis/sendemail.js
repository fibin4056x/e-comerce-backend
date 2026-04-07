const nodemailer = require("nodemailer");

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    const error = new Error("SMTP configuration is missing");
    error.statusCode = 500;
    throw error;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 10000,
  });
};

/* =========================
   SEND EMAIL
========================= */
const sendEmail = async (to, subject, text) => {
  try {
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: `"Your App" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

  } catch (error) {
    const sendError = new Error("Email sending failed");
    sendError.statusCode = error.statusCode || 502;
    throw sendError;
  }
};

module.exports = sendEmail;
