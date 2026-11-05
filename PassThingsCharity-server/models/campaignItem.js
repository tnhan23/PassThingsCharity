const mongoose = require('mongoose');

/**
 * Campaign Item Schema
 * Defines targeted items and required quantities for a specific relief campaign.
 */
const campaignItemSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    itemTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemType',
      required: true,
    },
    targetQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    currentQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
  },
  { timestamps: true }
);

campaignItemSchema.index({ campaignId: 1, itemTypeId: 1 }, { unique: true });

module.exports = mongoose.model('CampaignItem', campaignItemSchema);
