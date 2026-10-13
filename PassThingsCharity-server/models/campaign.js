const mongoose = require('mongoose');

/**
 * Campaign Schema
 * Represents a time-bound relief campaign (typically 5-7 days window).
 */
const campaignSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
