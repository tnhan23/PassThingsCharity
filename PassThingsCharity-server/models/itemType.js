const mongoose = require('mongoose');

/**
 * Item Type Schema
 * Represents specific item classifications with mandatory standard units (KG, PAIR, BOX, PACK).
 */
const itemTypeSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ItemCategory',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      enum: ['KG', 'PAIR', 'BOX', 'PACK'],
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ItemType', itemTypeSchema);
