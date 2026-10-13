const mongoose = require('mongoose');

/**
 * Achievement Schema
 * Defines system badges and milestone achievements.
 */
const achievementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    badgeIconUrl: {
      type: String,
      trim: true,
    },
    criteriaType: {
      type: String,
      required: true,
      enum: ['DONATION_COUNT', 'DONATION_WEIGHT_KG', 'VOLUNTEER_HOURS', 'CAMPAIGN_COUNT', 'POINTS_ACCUMULATED'],
    },
    criteriaValue: {
      type: Number,
      required: true,
      min: 1,
    },
    pointsReward: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Achievement', achievementSchema);
