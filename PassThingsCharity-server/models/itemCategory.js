const mongoose = require('mongoose');

/**
 * Item Category Schema
 * Represents standard item categories (e.g., Clothing, Food, Living Supplies).
 */
const itemCategorySchema = new mongoose.Schema(
  {
    imageUrl: { type: String, trim: true, default: null },
    imagePublicId: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

module.exports = mongoose.model('ItemCategory', itemCategorySchema);
