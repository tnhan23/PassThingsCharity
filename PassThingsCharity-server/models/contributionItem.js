const mongoose = require('mongoose');

/**
 * Contribution Item Schema
 * Itemized breakdown of goods received within a single donation.
 */
const contributionItemSchema = new mongoose.Schema(
  {
    contributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contribution',
      required: true,
    },
    campaignItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignItem',
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
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContributionItem', contributionItemSchema);
