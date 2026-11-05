const mongoose = require('mongoose');

/**
 * Campaign Schema
 * Represents a time-bound relief campaign (typically 5-7 days window).
 */
const campaignSchema = new mongoose.Schema(
  {
    results: {
      type: new mongoose.Schema({
        summary: { type: String, required: true, trim: true },
        images: [{ type: String }],
        handovers: [{
          recipientName: { type: String, required: true, trim: true },
          recipientRole: { type: String, trim: true, default: '' },
          recipientAddress: { type: String, required: true, trim: true },
          completedAt: { type: Date, required: true },
          items: [{
            itemTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemType', required: true },
            quantity: { type: Number, required: true, min: 0.00000001 },
            unit: { type: String, required: true, enum: ['KG', 'PAIR', 'BOX', 'PACK', 'PIECE'] },
          }],
          imageUrls: [{ type: String }],
        }],
        publishedAt: { type: Date, required: true },
        updatedAt: { type: Date, required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      }, { _id: false }),
      default: null,
    },
    imageUrl: { type: String, trim: true, default: null },
    imagePublicId: { type: String, default: null },
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
