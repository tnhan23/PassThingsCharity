const mongoose = require('mongoose');

/**
 * Item Type Schema
 * Represents specific item classifications with mandatory standard units (KG, PAIR, BOX, PACK).
 */
const itemTypeSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, trim: true, default: null },
    imagePublicId: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
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
      enum: ['KG', 'PAIR', 'BOX', 'PACK', 'PIECE'],
      uppercase: true,
    },
    pointsPerUnit: {
      type: Number,
      default: 0,
      min: 0,
      validate: Number.isInteger,
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
