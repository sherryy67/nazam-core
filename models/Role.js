const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: [true, 'Role slug is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  code: {
    type: Number,
    required: [true, 'Role code is required'],
    unique: true,
  },
  description: {
    type: String,
    default: '',
  },
  permissions: [{
    type: String,
    trim: true,
  }],
  isSystem: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Index for fast lookups
roleSchema.index({ slug: 1 });
roleSchema.index({ code: 1 });

module.exports = mongoose.model('Role', roleSchema);
