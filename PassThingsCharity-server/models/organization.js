const mongoose = require('mongoose')
const organizationSchema = new mongoose.Schema(
  {
    logoUrl: { type: String, trim: true, default: null },
    imagePublicId: { type: String, default: null },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phone: String,
    email: String,
    description: {
      type: String,
      trim: true,
      default: '',
    },
    operatingArea: {
      type: String,
      trim: true,
      default: '',
    },
    idCardNumber: {
      type: String,
      trim: true,
      default: '',
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
)
module.exports = mongoose.model('Organization', organizationSchema)