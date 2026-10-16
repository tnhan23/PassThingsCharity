const mongoose = require('mongoose');

/**
 * Task Schema
 * Represents specific operational jobs (e.g. sorting clothes, packing boxes) needed at intake stations.
 */
const taskSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CampaignTransfer',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    recruitmentStatus: {
      type: String,
      enum: ['NOT_OPEN', 'OPEN', 'FILLED', 'CLOSED'],
      default: 'NOT_OPEN',
    },
    requiredVolunteers: {
      type: Number,
      default: 0,
      min: 0,
    },
    volunteerDeadline: {
      type: Date,
    },
    rewardPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
