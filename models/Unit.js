const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  unitNumber: { type: String, required: true, trim: true }, // e.g., "A-101", "Shop-3"

  type: {
    type: String,
    enum: ["flat", "shop", "office", "other"],
    required: true
  },

  floor: { type: String, trim: true },

  // Linked tenant (regular User who joined via referral code)
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  isOccupied: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index to prevent duplicate unit numbers within a property
unitSchema.index({ property: 1, unitNumber: 1 }, { unique: true });

module.exports = mongoose.model("Unit", unitSchema);
