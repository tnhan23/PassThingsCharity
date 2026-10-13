const mongoose = require('mongoose');

/**
 * Item Category Schema
 * Represents standard item categories (e.g., Clothing, Food, Living Supplies).
 */
const itemCategorySchema = new mongoose.Schema(
  {
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
