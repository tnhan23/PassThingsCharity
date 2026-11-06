const mongoose = require('mongoose');

/**
 * Campaign Transfer Item Schema
 * Itemized quantities of goods included in an inter-station transfer batch.
 */
const campaignTransferItemSchema = new mongoose.Schema(
  {
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignTransfer',
      required: true,
    },
    itemTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemType',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    unit: {
      type: String,
      required: true,
      enum: ['KG', 'PAIR', 'BOX', 'PACK', 'PIECE'],
      uppercase: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CampaignTransferItem', campaignTransferItemSchema);
