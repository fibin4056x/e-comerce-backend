const nodemailer = require("nodemailer");

const getTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const missingEnv = [
    ["SMTP_HOST", SMTP_HOST],
    ["SMTP_PORT", SMTP_PORT],
    ["SMTP_USER", SMTP_USER],
    ["SMTP_PASS", SMTP_PASS],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingEnv.length > 0) {
    const error = new Error(
      `SMTP configuration is missing: ${missingEnv.join(", ")}`
    );
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
