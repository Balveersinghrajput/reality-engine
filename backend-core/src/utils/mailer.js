const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // smtp.gmail.com
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,                     // false for port 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,     // your gmail
    pass: process.env.SMTP_PASS,     // 16-char app password
  },
});

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"RealityEngine" <${process.env.SMTP_USER}>`,
    to: toEmail,                     // sends to THE USER'S email, not yours
    subject: 'Your RealityEngine verification code',
    html: `
      <div style="font-family: sans-serif; background: #000; color: #fff; padding: 40px; max-width: 480px; margin: auto; border-radius: 16px;">
        <h1 style="font-size: 28px; font-weight: 900; margin-bottom: 4px;">
          Reality<span style="color: #3b82f6;">Engine</span>
        </h1>
        <p style="color: #666; margin-top: 0; margin-bottom: 32px; font-size: 13px; letter-spacing: 2px; text-transform: uppercase;">Verification Code</p>
        <p style="color: #aaa; font-size: 14px; margin-bottom: 24px;">
          Use the code below to verify your email. It expires in <strong style="color:#fff">10 minutes</strong>.
        </p>
        <div style="background: #111; border: 1px solid #222; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #3b82f6;">${otp}</span>
        </div>
        <p style="color: #555; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };