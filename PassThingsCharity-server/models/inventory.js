const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Station",
      required: true,
    },
    itemTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ItemType",
      required: true,
    },
    unit: {
      type: String,
      enum: ["KG", "PAIR", "BOX", "PACK", "PIECE"],
      required: true,
    },
    // Historical deficits remain visible during initialization; new issues cannot worsen them.
    quantity: { type: Number, default: 0, required: true },
  },
  { timestamps: true, versionKey: false },
);
schema.index(
  { stationId: 1, itemTypeId: 1, unit: 1 },
  { unique: true },
);
// Keep previous campaign-specific collection untouched during migration.
module.exports = mongoose.model("Inventory", schema, "stationInventories");
