const mongoose = require('mongoose');

/**
 * Relief Distribution Item Schema
 * Itemized quantities of goods distributed to recipient representatives.
 */
const reliefDistributionItemSchema = new mongoose.Schema(
  {
    distributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReliefDistribution',
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

module.exports = mongoose.model('ReliefDistributionItem', reliefDistributionItemSchema);
