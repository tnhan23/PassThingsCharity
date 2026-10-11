const mongoose=require('mongoose');
const stationstaffSchema=new mongoose.Schema(
    {
        stationId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Station',
            required:true,
        },
         userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
    },
        assignedAt: {
         type: Date,
        default: Date.now,
      }, 
    },
     { versionKey: false }
);
stationstaffSchema.index(
  { stationId: 1, userId: 1 },
  { unique: true }
);
module.exports = mongoose.model(
  'StationStaff',
  stationstaffSchema,
);