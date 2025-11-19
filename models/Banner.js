const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  mediaUrl: {
    type: String,
    required: true,
    trim: true
  },
  mediaType: {
    type: String,
    enum: ["image", "video"],
    required: true
  },
  platform: {
    type: [String],
    enum: ["mobile", "web", "both"],
    default: ["both"]
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
bannerSchema.index({ service: 1 });
bannerSchema.index({ isActive: 1 });
bannerSchema.index({ sortOrder: 1 });
bannerSchema.index({ platform: 1 });

module.exports = mongoose.model("Banner", bannerSchema);

