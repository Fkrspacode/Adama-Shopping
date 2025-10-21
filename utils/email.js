// utils/email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendAlertEmail = (subject, message) => {
  const mailOptions = {
    from: `"Admin Alert" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: subject,
    text: message
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error('Email send error:', err);
    else console.log('Alert email sent:', info.response);
  });
};

module.exports = { sendAlertEmail };
