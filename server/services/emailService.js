const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const baseStyle = `font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#fff;border-radius:12px;`;

const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"TeleSync" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your TeleSync Verification Code',
    html: `
      <div style="${baseStyle}">
        <h2 style="color:#3b82f6;margin-bottom:8px;">TeleSync</h2>
        <p style="color:#94a3b8;">Your email verification code is:</p>
        <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#fff;margin:24px 0;text-align:center;">${otp}</div>
        <p style="color:#94a3b8;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>`,
  });
};

const sendPasswordResetEmail = async (email, resetUrl) => {
  await transporter.sendMail({
    from: `"TeleSync" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset Your TeleSync Password',
    html: `
      <div style="${baseStyle}">
        <h2 style="color:#3b82f6;margin-bottom:8px;">TeleSync</h2>
        <p style="color:#94a3b8;">You requested a password reset. Click the button below:</p>
        <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#3b82f6;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:13px;">This link expires in <strong>15 minutes</strong>. If you didn't request this, ignore this email.</p>
        <p style="color:#475569;font-size:12px;margin-top:16px;word-break:break-all;">${resetUrl}</p>
      </div>`,
  });
};

module.exports = { sendOtpEmail, sendPasswordResetEmail };
