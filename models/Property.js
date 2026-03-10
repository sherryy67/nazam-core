const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g., "Sunrise Tower"
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  country: { type: String, trim: true },

  type: {
    type: String,
    enum: ["residential", "commercial", "mixed"],
    required: true
  },

  // Building owner (PROPERTY_OWNER role)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PropertyOwner",
    required: true
  },

  // Total units in property
  totalUnits: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },

  // Created by admin
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
}, { timestamps: true });

module.exports = mongoose.model("Property", propertySchema);
