const crypto = require('crypto');

const windowMs = 2 * 60 * 1000;

function signingRequired() {
  return process.env.APP_SIGNING_REQUIRED === 'true' && Boolean(process.env.APP_SIGNING_SECRET);
}

function bodyBytes(req) {
  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length) return req.rawBody;
  const files = req.get('x-app-files');
  return Buffer.from(files || '', 'utf8');
}

function expectedSignature(req) {
  const time = req.get('x-app-time') || '';
  const bodyHash = crypto.createHash('sha256').update(bodyBytes(req)).digest('hex');
  const payload = `${time}\n${req.method.toUpperCase()}\n${req.originalUrl}\n${bodyHash}`;
  return crypto.createHmac('sha256', process.env.APP_SIGNING_SECRET).update(payload).digest('hex');
}

function requireAppSignature(req, res, next) {
  if (!signingRequired()) return next();
  if (req.method === 'GET' && req.path === '/') return next();

  const time = Number(req.get('x-app-time'));
  const given = req.get('x-app-sign') || '';
  if (!Number.isFinite(time) || Math.abs(Date.now() - time) > windowMs || !/^[a-f0-9]{64}$/.test(given)) {
    return res.status(401).json({ error: 'Chỉ app Pass Things Charity được gọi máy chủ.' });
  }

  const expected = expectedSignature(req);
  const match = crypto.timingSafeEqual(Buffer.from(given, 'hex'), Buffer.from(expected, 'hex'));
  if (!match) {
    return res.status(401).json({ error: 'Chỉ app Pass Things Charity được gọi máy chủ.' });
  }
  return next();
}

module.exports = { requireAppSignature };
