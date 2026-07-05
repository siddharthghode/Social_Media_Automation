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

const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: `"TeleSync" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Your TeleSync Verification Code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#fff;border-radius:12px;">
        <h2 style="color:#3b82f6;margin-bottom:8px;">TeleSync</h2>
        <p style="color:#94a3b8;">Your email verification code is:</p>
        <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#fff;margin:24px 0;text-align:center;">
          ${otp}
        </div>
        <p style="color:#94a3b8;font-size:13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };
