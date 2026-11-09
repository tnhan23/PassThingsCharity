const mongoose = require('mongoose');

/**
 * Task Application Schema
 * Represents a volunteer's application to participate in an open operational task.
 */
const taskApplicationSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, trim: true, default: null },
    imagePublicId: { type: String, default: null },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

taskApplicationSchema.index({ taskId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('TaskApplication', taskApplicationSchema);
