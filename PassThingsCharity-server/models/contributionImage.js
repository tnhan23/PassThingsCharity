const mongoose = require('mongoose');

/**
 * Contribution Image Schema
 * Stores photo verification URLs for intake donations.
 */
const contributionImageSchema = new mongoose.Schema(
  {
    contributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contribution',
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContributionImage', contributionImageSchema);
