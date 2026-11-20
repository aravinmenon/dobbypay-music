// test_office365_email.js
// Triggers a live test email to aravinmenon000@gmail.com via Office 365 SMTP

import nodemailer from 'nodemailer';

const SMTP_CONFIG = {
  host: 'smtp.office365.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: 'aetinssmtp@kgisl.com',
    pass: 'Trigger@12345'
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000
};

const RECIPIENT = 'aravinmenon000@gmail.com';

async function sendTestEmail() {
  console.log('\n================================================================');
  console.log('📧 OFFICE 365 SMTP TEST EMAIL DISPATCH');
  console.log('================================================================');
  console.log('• SMTP Host    :', SMTP_CONFIG.host);
  console.log('• Port         :', SMTP_CONFIG.port);
  console.log('• Sender Email :', SMTP_CONFIG.auth.user);
  console.log('• Recipient    :', RECIPIENT);
  console.log('----------------------------------------------------------------');

  try {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    console.log('⏳ Verifying SMTP Connection to Office 365...');
    await transporter.verify();
    console.log('✅ SMTP Connection & Authentication Successful!');

    console.log(`\n⏳ Sending test email to ${RECIPIENT}...`);

    const mailOptions = {
      from: '"DobbyPay Music Cloud" <aetinssmtp@kgisl.com>',
      replyTo: 'aetinssmtp@kgisl.com',
      to: RECIPIENT,
      subject: '🎵 Test Email: DobbyPay Music Office 365 SMTP Integration',
      text: `Hello Aravin,\n\nThis is a real-time test email triggered from your DobbyPay Music application using Office 365 SMTP (smtp.office365.com:587).\n\nSender: aetinssmtp@kgisl.com\nRecipient: ${RECIPIENT}\nStatus: Delivered successfully.\n\nBest regards,\nDobbyPay Music Cloud Team`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #0c0d12; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #FF6B00; margin: 0; font-size: 24px;">🎵 DobbyPay Music Cloud</h1>
            <p style="color: #a1a1aa; font-size: 13px; margin-top: 5px;">Office 365 SMTP Verification Notice</p>
          </div>
          
          <div style="background-color: #181920; border: 1px solid #27272a; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #22c55e; margin-top: 0; font-size: 18px;">✅ SMTP Connection Verified</h2>
            <p style="color: #e4e4e7; font-size: 14px; line-height: 1.6;">
              Hello <strong>Aravin</strong>,<br><br>
              This is a live confirmation email triggered from your application using your Office 365 SMTP relay.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #a1a1aa; margin-top: 15px;">
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #27272a;"><strong>SMTP Host:</strong></td>
                <td style="padding: 6px 0; border-bottom: 1px solid #27272a; color: #fff;">smtp.office365.com (Port 587)</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #27272a;"><strong>Sender:</strong></td>
                <td style="padding: 6px 0; border-bottom: 1px solid #27272a; color: #fff;">aetinssmtp@kgisl.com</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #27272a;"><strong>Recipient:</strong></td>
                <td style="padding: 6px 0; border-bottom: 1px solid #27272a; color: #22c55e;">${RECIPIENT}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0;"><strong>Timestamp:</strong></td>
                <td style="padding: 6px 0; color: #fff;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; font-size: 12px; color: #71717a;">
            DobbyPay Music Cloud © 2026. All rights reserved.
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('\n🎉 TEST EMAIL SUCCESSFULLY DISPATCHED!');
    console.log('• Message ID :', info.messageId);
    console.log('• Response   :', info.response);
    console.log(`• Status     : Delivered to ${RECIPIENT}`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ SMTP DISPATCH FAILED:');
    console.error('• Error Code    :', err.code);
    console.error('• Error Command :', err.command);
    console.error('• Message       :', err.message);
    if (err.response) {
      console.error('• SMTP Response :', err.response);
    }
    console.log('================================================================\n');
  }
}

sendTestEmail();
