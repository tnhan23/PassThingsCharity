const mongoose = require('mongoose');

/**
 * Campaign Transfer Schema
 * Manages inter-station logistics transfers of goods for a relief campaign.
 */
const campaignTransferSchema = new mongoose.Schema(
  {
    workflowVersion: { type: Number, default: 1 },
    approvalStatus: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    approvalNote: String,
    sourceAssignedAt: Date,
    destinationAssignedAt: Date,
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
    },
    fromStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    toStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    responsibleUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PREPARING', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    transportMethod: {
      type: String,
      trim: true,
    },
    transportNote: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, toJSON: { transform(doc, ret) {
    delete ret.workflowVersion;
    delete ret.createdShiftScheduleId;
    return ret;
  } } }
);

module.exports = mongoose.model('CampaignTransfer', campaignTransferSchema);
