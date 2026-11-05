const mongoose = require('mongoose');
const eventSchema = new mongoose.Schema({
  stage: { type: String, enum: ['DISPATCH', 'REPORT', 'RECEIVE'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrls: { type: [String], required: true },
  note: String,
  at: { type: Date, default: Date.now },
  quantities: [{ transferItemId: mongoose.Schema.Types.ObjectId, quantity: Number, _id: false }],
}, { _id: false });
const schema = new mongoose.Schema({
  transferId: { type: mongoose.Schema.Types.ObjectId, ref: 'CampaignTransfer', required: true, index: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskAssignment', required: true },
  carrierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['ASSIGNED', 'DISPATCHED', 'REPORTED', 'PARTIAL', 'RECEIVED'], default: 'ASSIGNED' },
  items: [{
    transferItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'CampaignTransferItem', required: true },
    quantity: { type: Number, required: true, min: 0.01 },
    reportedQuantity: { type: Number, default: 0, min: 0 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    _id: false,
  }],
  evidence: [eventSchema],
}, { timestamps: true });
schema.index({ transferId: 1, assignmentId: 1 }, { unique: true });
module.exports = mongoose.model('TransferShipment', schema);
