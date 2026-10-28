const mongoose = require('mongoose');

/**
 * Task Assignment Schema
 * Manages allocation of tasks to staff or volunteers, time tracking and attendance.
 */
const taskAssignmentSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assigneeType: {
      type: String,
      enum: ['STAFF', 'VOLUNTEER'],
      required: true,
    },
    status: {
      type: String,
      enum: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'ASSIGNED',
    },
    hoursSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    completionNote: {
      type: String,
      trim: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

taskAssignmentSchema.index({ taskId: 1, assigneeId: 1 }, { unique: true });

module.exports = mongoose.model('TaskAssignment', taskAssignmentSchema);
