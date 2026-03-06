const https = require('https');

async function sendOtpEmail(toEmail, otp) {
  const payload = JSON.stringify({
    sender: { name: 'RealityEngine', email: 'balveersinghrajput2004@gmail.com' },
    to: [{ email: toEmail }],
    subject: 'Your RealityEngine verification code',
    htmlContent: `
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

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Brevo error ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { sendOtpEmail };