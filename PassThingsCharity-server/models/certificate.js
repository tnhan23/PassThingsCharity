const mongoose = require('mongoose');

/**
 * Certificate Schema
 * Records certificates issued to volunteers or donors upon completing campaign activities.
 */
const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
    },
    certificateType: {
      type: String,
      required: true,
      enum: ['VOLUNTEER', 'DONOR'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    pdfUrl: {
      type: String,
      trim: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);
