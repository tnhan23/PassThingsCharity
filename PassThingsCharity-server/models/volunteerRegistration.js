const mongoose = require('mongoose');

/**
 * Volunteer Registration Schema
 * Manages user sign-ups and approval status for campaign workforce participation.
 */
const volunteerRegistrationSchema = new mongoose.Schema(
  {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
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
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

volunteerRegistrationSchema.index({ campaignId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('VolunteerRegistration', volunteerRegistrationSchema);
