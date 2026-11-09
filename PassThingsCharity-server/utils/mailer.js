const nodemailer = require('nodemailer');

function transport(port, secure) {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port,
        secure,
        requireTLS: !secure,
        family: 4,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
        },
        connectionTimeout: 12000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
    });
}

const ports = [transport(587, false), transport(465, true)];

async function sendMail(to, subject, html) {
    const message = {
        from: `"PassThingsCharity" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
    };
    let lastError;
    for (const transporter of ports) {
        try {
            return await transporter.sendMail(message);
        } catch (error) {
            lastError = error;
            console.error('mail-fail', error.code || '', error.responseCode || '');
        }
    }
    throw lastError;
}

module.exports = { sendMail };
