const mongoose=require('mongoose')
const organizationSchema=new mongoose.Schema(
    {
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
submittedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true,
},
isVerified: {
  type: Boolean,
  default: false,
},
    },
    { timestamps: true }
)
module.exports=mongoose.model('Organization',organizationSchema)