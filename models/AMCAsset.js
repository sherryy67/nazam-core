const mongoose = require("mongoose");

const amcAssetSchema = new mongoose.Schema(
  {
    // Asset information
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // Multiple images stored as array of objects
    images: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
      },
    ],

    // Reference to the parent AMC contract
    amcContract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AMCContract",
      required: true,
    },

    // Linked services with scheduling info
    // Each entry references an active Service (from catalog) or is a custom service
    linkedServices: [
      {
        service: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
        },
        isCustomService: { type: Boolean, default: false },
        serviceName: { type: String, required: true, trim: true },
        numberOfTimes: { type: Number, default: 1 },
        scheduledDates: [{ type: Date }],
      },
    ],
  },
  { timestamps: true }
);

// Index for efficient queries by contract
amcAssetSchema.index({ amcContract: 1 });

module.exports = mongoose.model("AMCAsset", amcAssetSchema);
