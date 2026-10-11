const mongoose=require('mongoose')
const stationSchema =new mongoose.Schema(
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
    isActive: {
      type: Boolean,
      default: false,
    },
    },
     { timestamps: true }
)
module.exports=mongoose.model('Station',stationSchema)