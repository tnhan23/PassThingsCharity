const mongoose = require('mongoose');

const appAttestChallengeSchema = new mongoose.Schema({
  challenge: { type: String, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

appAttestChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AppAttestChallenge', appAttestChallengeSchema);
