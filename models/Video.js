const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  videoUri: {
    type: String,
    required: true,
    trim: true
  },
  mimeType: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  }
}, {
  timestamps: true
});

// Indexes for better performance (key index already created by index: true on field)
videoSchema.index({ isActive: 1 });
videoSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Video", videoSchema);

