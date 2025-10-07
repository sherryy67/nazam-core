const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g. AC Cleaning
  description: { type: String },
  basePrice: { type: Number, required: true },  // price per unit/hour
  unitType: { type: String, enum: ["per_unit", "per_hour"], required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
}, { timestamps: true });

module.exports = mongoose.model("Service", serviceSchema);
