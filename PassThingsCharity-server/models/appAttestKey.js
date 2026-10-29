const mongoose = require('mongoose');

const appAttestKeySchema = new mongoose.Schema({
  keyId: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  signCount: { type: Number, required: true, default: 0 },
}, { versionKey: false, timestamps: true });

module.exports = mongoose.model('AppAttestKey', appAttestKeySchema);
