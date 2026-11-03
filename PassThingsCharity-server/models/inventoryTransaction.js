const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  itemTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemType', required: true },
  unit: { type: String, required: true },
  type: { type: String, enum: ['OPENING', 'DONATION_IN', 'DONATION_REVERSAL', 'TRANSFER_OUT', 'TRANSFER_IN', 'RELIEF_OUT'], required: true },
  quantityDelta: { type: Number, required: true },
  balanceBefore: { type: Number, required: true },
  balanceAfter: { type: Number, required: true },
  counterpartyStationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', default: null },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  sourceType: { type: String, enum: ['OPENING', 'CONTRIBUTION', 'TRANSFER', 'DISTRIBUTION'], required: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  sourceCode: String,
  previousStatus: String,
  status: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  description: { type: String, required: true },
}, { timestamps: true, versionKey: false });
schema.index({ stationId: 1, createdAt: -1, _id: -1 });
schema.index({ campaignId: 1, sourceId: 1 });
module.exports = mongoose.model('InventoryTransaction', schema, 'inventoryTransactions');
