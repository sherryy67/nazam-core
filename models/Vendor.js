const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ROLES = require("../constants/roles");

const vendorSchema = new mongoose.Schema({
  type: { type: String, enum: ["corporate", "individual"], required: true },

  // Corporate relationship fields
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company"
  }, // Reference to company if corporate staff
  isStaff: { type: Boolean, default: false }, // True if this vendor is staff of a corporate vendor

  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  coveredCity: { type: String, required: true },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true
  }, // primary service the vendor handles
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  privilege: { type: String, enum: ["Beginner", "Experienced", "Professional"], default: "Beginner" },
  profilePic: { type: String }, // file path or URL
  countryCode: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  experience: { type: Number },

  // Enhanced Banking Information
  bankingInfo: {
    bankName: { type: String },
    branchName: { type: String },
    bankAccountNumber: { type: String },
    iban: { type: String },
    vatRegistration: { type: Boolean, default: false },
    collectTax: { type: Boolean, default: false },
    bankingVerified: { type: Boolean, default: false }, // Admin verification status
    verifiedAt: { type: Date },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin"
    }
  },

  // KYC Information
  kycInfo: {
    idType: { type: String, enum: ["Passport", "EmiratesID", "NationalID"], required: true },
    idNumber: { type: String, required: true },
    personalIdNumber: { type: String },
    // Document uploads
    idDocumentFront: { type: String }, // File path/URL for front of ID
    idDocumentBack: { type: String }, // File path/URL for back of ID
    personalPhoto: { type: String }, // File path/URL for personal photo
    additionalDocuments: [{ type: String }], // Array of additional document paths/URLs

    kycStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    kycSubmittedAt: { type: Date },
    kycVerifiedAt: { type: Date },
    kycVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin"
    },
    kycRejectionReason: { type: String }
  },

  address: { type: String },
  country: { type: String },
  city: { type: String },
  pinCode: { type: String },
  serviceAvailability: { type: String, enum: ["Full-time", "Part-time"], default: "Full-time" },

  // Vendor Status
  approved: { type: Boolean, default: false }, // must be approved by admin
  active: { type: Boolean, default: true }, // vendor can temporarily deactivate
  blocked: { type: Boolean, default: false }, // admin can block vendor

  // Deactivation tracking (vendor-initiated)
  inactiveReason: { type: String },
  inactiveAt: { type: Date },

  // Blocking tracking (admin-initiated)
  blockedReason: { type: String },
  blockedAt: { type: Date },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  },

  role: { type: Number, enum: [ROLES.VENDOR], default: ROLES.VENDOR },
  
  // Availability tracking for service assignment
  availabilitySchedule: [{
    dayOfWeek: { 
      type: String, 
      enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      required: true 
    },
    startTime: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
        message: 'Start time must be in HH:MM format (24-hour)'
      }
    },
    endTime: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'End time must be in HH:MM format (24-hour)'
      }
    }
  }],
  unavailableDates: [{
    date: { type: Date, required: true },
    reason: { type: String }
  }]
}, { timestamps: true });

// Hash password before saving
vendorSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
vendorSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
vendorSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email, 
      role: this.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// KYC Management Methods
vendorSchema.methods.submitKYC = function(documents) {
  this.kycInfo = {
    ...this.kycInfo,
    ...documents,
    kycStatus: "pending",
    kycSubmittedAt: new Date()
  };
  return this.save();
};

vendorSchema.methods.verifyKYC = function(adminId, status, rejectionReason = null) {
  this.kycInfo.kycStatus = status;
  this.kycInfo.kycVerifiedAt = new Date();
  this.kycInfo.kycVerifiedBy = adminId;

  if (status === "rejected" && rejectionReason) {
    this.kycInfo.kycRejectionReason = rejectionReason;
  }

  return this.save();
};

// Banking Management Methods
vendorSchema.methods.updateBankingInfo = function(bankingData) {
  this.bankingInfo = {
    ...this.bankingInfo,
    ...bankingData,
    bankingVerified: false // Reset verification when banking info is updated
  };
  return this.save();
};

vendorSchema.methods.verifyBankingInfo = function(adminId) {
  this.bankingInfo.bankingVerified = true;
  this.bankingInfo.verifiedAt = new Date();
  this.bankingInfo.verifiedBy = adminId;
  return this.save();
};

// Vendor Status Management
vendorSchema.methods.approveVendor = function(adminId) {
  this.approved = true;
  return this.save();
};

vendorSchema.methods.blockVendor = function(adminId, reason) {
  this.blocked = true;
  this.blockedReason = reason;
  this.blockedAt = new Date();
  this.blockedBy = adminId;
  return this.save();
};

vendorSchema.methods.unblockVendor = function() {
  this.blocked = false;
  this.blockedReason = null;
  this.blockedAt = null;
  this.blockedBy = null;
  return this.save();
};

vendorSchema.methods.deactivateVendor = function(reason) {
  this.active = false;
  this.inactiveReason = reason;
  this.inactiveAt = new Date();
  return this.save();
};

vendorSchema.methods.activateVendor = function() {
  this.active = true;
  this.inactiveReason = null;
  this.inactiveAt = null;
  return this.save();
};

// Check if vendor is available for service assignment
vendorSchema.methods.isAvailableForAssignment = function() {
  return this.approved && this.active && !this.blocked && this.kycInfo.kycStatus === "approved";
};

// Transform JSON output to exclude sensitive information
vendorSchema.methods.toJSON = function() {
  const vendorObject = this.toObject();
  delete vendorObject.password;

  // Don't expose sensitive banking info to non-admin users
  if (vendorObject.bankingInfo) {
    // Keep only non-sensitive banking info for vendors
    const { bankName, bankingVerified } = vendorObject.bankingInfo;
    vendorObject.bankingInfo = { bankName, bankingVerified };
  }

  return vendorObject;
};

// Admin JSON view with full details
vendorSchema.methods.toAdminJSON = function() {
  const vendorObject = this.toObject();
  delete vendorObject.password;
  return vendorObject;
};

module.exports = mongoose.model("Vendor", vendorSchema);


