const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    family: 4,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
});

async function sendMail(to, subject, html) {
    return transporter.sendMail({
        from: `"PassThingsCharity" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
    });
}

module.exports = { sendMail };
