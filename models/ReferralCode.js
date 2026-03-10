const mongoose = require("mongoose");
const crypto = require("crypto");

const referralCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },

  // Property owner who generated this code
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PropertyOwner",
    required: true
  },

  // Property this code is for
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  // Optional: link to a specific unit
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Unit",
    default: null
  },

  // Expiry
  expiresAt: { type: Date, required: true },

  // Usage tracking
  maxUses: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  usedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    usedAt: { type: Date, default: Date.now }
  }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Static method to generate a unique code
referralCodeSchema.statics.generateUniqueCode = async function() {
  let code;
  let exists = true;
  while (exists) {
    code = crypto.randomBytes(4).toString('hex').toUpperCase();
    exists = await this.findOne({ code });
  }
  return code;
};

// Check if code is valid (not expired, not maxed out, active)
referralCodeSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (new Date() > this.expiresAt) return false;
  if (this.usedCount >= this.maxUses) return false;
  return true;
};

module.exports = mongoose.model("ReferralCode", referralCodeSchema);
