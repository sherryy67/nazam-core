const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phoneNumber: { 
    type: String, 
    required: true,
    index: true
  },
  code: { 
    type: String, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-delete expired OTPs
  },
  attempts: { 
    type: Number, 
    default: 0 
  },
  maxAttempts: { 
    type: Number, 
    default: 3 
  },
  isUsed: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

// Index for efficient queries
otpSchema.index({ phoneNumber: 1, isUsed: 1 });

// Method to check if OTP is valid
otpSchema.methods.isValid = function() {
  return !this.isUsed && 
         this.attempts < this.maxAttempts && 
         this.expiresAt > new Date();
};

// Method to mark OTP as used
otpSchema.methods.markAsUsed = function() {
  this.isUsed = true;
  return this.save();
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = function() {
  this.attempts += 1;
  return this.save();
};

module.exports = mongoose.model("OTP", otpSchema);
