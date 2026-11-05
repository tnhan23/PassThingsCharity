const mongoose = require('mongoose');

/**
 * Campaign Station Schema
 * Associates participating intake stations with a specific campaign.
 */
const campaignStationSchema = new mongoose.Schema(
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
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false }
);

campaignStationSchema.index({ campaignId: 1, stationId: 1 }, { unique: true });

module.exports = mongoose.model('CampaignStation', campaignStationSchema);
