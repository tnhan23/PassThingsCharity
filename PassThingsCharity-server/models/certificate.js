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
      enum: ['VOLUNTEER', 'DONOR', 'MILESTONE'],
    },
    milestonePoints: {
      type: Number,
      min: 1,
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

certificateSchema.index(
  { userId: 1, milestonePoints: 1 },
  { unique: true, partialFilterExpression: { milestonePoints: { $type: 'number' } } }
);

module.exports = mongoose.model('Certificate', certificateSchema);
