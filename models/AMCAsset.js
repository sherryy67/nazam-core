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

    // Linked service requests (from the same contract)
    linkedServices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceRequest",
      },
    ],
  },
  { timestamps: true }
);

// Index for efficient queries by contract
amcAssetSchema.index({ amcContract: 1 });

module.exports = mongoose.model("AMCAsset", amcAssetSchema);
