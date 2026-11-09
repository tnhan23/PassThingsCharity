const https = require('https');

function sendMail(to, subject, html) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return Promise.reject(new Error('RESEND_API_KEY missing'));
    }

    const from = process.env.RESEND_FROM || 'Pass Things <onboarding@resend.dev>';
    const payload = JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
    });

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: 'api.resend.com',
                path: '/emails',
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: 15000,
            },
            (res) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => {
                    let body = {};
                    try {
                        body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
                    } catch {
                        body = {};
                    }
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(body);
                        return;
                    }
                    const error = new Error('resend-fail');
                    error.code = body.name || res.statusCode;
                    console.error('mail-fail', error.code || '');
                    reject(error);
                });
            }
        );

        req.on('timeout', () => {
            req.destroy();
            const error = new Error('resend-timeout');
            error.code = 'ETIMEDOUT';
            console.error('mail-fail', error.code);
            reject(error);
        });
        req.on('error', (error) => {
            console.error('mail-fail', error.code || '');
            reject(error);
        });
        req.write(payload);
        req.end();
    });
}

module.exports = { sendMail };
