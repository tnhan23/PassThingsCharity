const mongoose = require('mongoose')
const stationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: String,
      required: true,
      trim: true,
    },
    longitude: {
      type: String,
      required: true,
      trim: true,
    },
    openingTime: {
      type: String,
      trim: true,
      default: '08:00',
    },
    closingTime: {
      type: String,
      trim: true,
      default: '17:00',
    },
    isActive: {
      type: Boolean,
      default: false,
    },
       managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
)
module.exports = mongoose.model('Station', stationSchema)