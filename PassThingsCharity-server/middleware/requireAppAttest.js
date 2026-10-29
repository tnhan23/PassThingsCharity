const crypto = require('crypto');
const { verifyAssertion, verifyAttestation } = require('node-app-attest');
const AppAttestChallenge = require('../models/appAttestChallenge');
const AppAttestKey = require('../models/appAttestKey');

function attestRequired() {
  return process.env.APP_ATTEST_REQUIRED === 'true';
}

function appleIds() {
  return {
    bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER || 'vn.passdo.app',
    teamIdentifier: process.env.IOS_TEAM_IDENTIFIER || '2AX99GD7R5',
    allowDevelopmentEnvironment: process.env.IOS_ALLOW_DEVELOPMENT_ENVIRONMENT !== 'false',
  };
}

function rejected(res, code) {
  const error = code === 'app_attest_unknown'
    ? 'App cần xác nhận lại với Apple.'
    : 'Chỉ app Pass Things Charity trên iPhone được gọi máy chủ.';
  return res.status(401).json({ code, error });
}

async function takeChallenge(id) {
  if (!id || !/^[a-f0-9]{24}$/i.test(String(id))) return null;
  const doc = await AppAttestChallenge.findOneAndDelete({
    _id: id,
    expiresAt: { $gt: new Date() },
  });
  return doc ? doc.challenge : null;
}

async function issueChallenge(req, res) {
  const challenge = crypto.randomBytes(32).toString('base64url');
  const doc = await AppAttestChallenge.create({
    challenge,
    expiresAt: new Date(Date.now() + 2 * 60 * 1000),
  });
  res.json({ id: String(doc._id), challenge });
}

async function attest(req, res) {
  const keyId = req.body?.keyId;
  const attestation = req.body?.attestation;
  const challenge = await takeChallenge(req.body?.challengeId);
  if (!keyId || !attestation || !challenge) {
    return res.status(400).json({ error: 'Thiếu chứng nhận của app.' });
  }
  try {
    const result = verifyAttestation({
      attestation: Buffer.from(attestation, 'base64'),
      challenge,
      keyId,
      ...appleIds(),
    });
    await AppAttestKey.findOneAndUpdate(
      { keyId },
      { publicKey: result.publicKey, signCount: 0 },
      { upsert: true },
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error('App Attest từ chối chứng nhận:', error.message);
    return rejected(res, 'app_attest');
  }
}

async function requireAppAttest(req, res, next) {
  if (!attestRequired()) return next();
  if (req.method === 'GET' && req.path === '/') return next();
  if (req.path.startsWith('/app-attest/')) return next();

  const keyId = req.get('x-app-attest-key');
  const assertion = req.get('x-app-attest-assertion');
  const challenge = await takeChallenge(req.get('x-app-attest-challenge'));
  if (!keyId || !assertion || !challenge) return rejected(res, 'app_attest');

  const stored = await AppAttestKey.findOne({ keyId });
  if (!stored) return rejected(res, 'app_attest_unknown');

  try {
    const result = verifyAssertion({
      assertion: Buffer.from(assertion, 'base64'),
      payload: challenge,
      publicKey: stored.publicKey,
      bundleIdentifier: appleIds().bundleIdentifier,
      teamIdentifier: appleIds().teamIdentifier,
      signCount: stored.signCount,
    });
    stored.signCount = result.signCount;
    await stored.save();
    return next();
  } catch (error) {
    console.error('App Attest từ chối chữ ký:', error.message);
    return rejected(res, 'app_attest');
  }
}

module.exports = { issueChallenge, attest, requireAppAttest };
