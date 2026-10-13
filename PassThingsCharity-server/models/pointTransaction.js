const mongoose = require('mongoose');

/**
 * Point Transaction Schema
 * Records point transactions for donors and volunteers upon verified contribution or completed task.
 */
const pointTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['DONATION', 'VOLUNTEER_TASK', 'BONUS', 'SYSTEM'],
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PointTransaction', pointTransactionSchema);
