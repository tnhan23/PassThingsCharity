const mongoose = require('mongoose');
module.exports = mongoose.model('TransferEvidenceUpload', new mongoose.Schema({
  transferId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  shipmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  stage: { type: String, enum: ['DISPATCH', 'REPORT', 'RECEIVE'], required: true },
  imageUrl: { type: String, required: true, unique: true },
  publicId: { type: String, required: true },
}, { timestamps: true }));
