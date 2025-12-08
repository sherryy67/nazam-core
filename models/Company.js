const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ROLES = require("../constants/roles");

const companySchema = new mongoose.Schema({
  // Company Basic Information
  companyName: { type: String, required: true, unique: true },
  registrationNumber: { type: String, required: true, unique: true },
  taxId: { type: String },
  industry: { type: String },
  description: { type: String },

  // Company Contact Information
  email: { type: String, required: true, unique: true },
  countryCode: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  phoneNumber: { type: String },

  // Company Address
  address: { type: String, required: true },
  country: { type: String, required: true },
  city: { type: String, required: true },
  pinCode: { type: String, required: true },

  // Company Admin/Owner
  adminFirstName: { type: String, required: true },
  adminLastName: { type: String, required: true },
  adminEmail: { type: String, required: true },
  adminPassword: { type: String, required: true },

  // Company Banking Information
  bankingInfo: {
    bankName: { type: String },
    branchName: { type: String },
    bankAccountNumber: { type: String },
    iban: { type: String },
    vatRegistration: { type: Boolean, default: false },
    collectTax: { type: Boolean, default: false },
    bankingVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin"
    }
  },

  // Company KYC Information
  kycInfo: {
    businessLicense: { type: String }, // File path/URL
    taxCertificate: { type: String }, // File path/URL
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

  // Staff Management
  staffVendors: [{
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor"
    },
    addedAt: { type: Date, default: Date.now },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company" // Self-reference for admin who added
    }
  }],

  // Company Status
  approved: { type: Boolean, default: false },
  blocked: { type: Boolean, default: false },
  blockedReason: { type: String },
  blockedAt: { type: Date },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  },

  role: { type: Number, enum: [ROLES.COMPANY_ADMIN], default: ROLES.COMPANY_ADMIN }
}, { timestamps: true });

// Hash admin password before saving
companySchema.pre('save', async function(next) {
  if (!this.isModified('adminPassword')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.adminPassword = await bcrypt.hash(this.adminPassword, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare admin password method
companySchema.methods.compareAdminPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.adminPassword);
};

// Generate JWT token for company admin
companySchema.methods.generateAuthToken = function() {
  return jwt.sign(
    {
      id: this._id,
      email: this.adminEmail,
      role: this.role,
      companyId: this._id
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// KYC Management Methods
companySchema.methods.submitKYC = function(documents) {
  this.kycInfo = {
    ...this.kycInfo,
    ...documents,
    kycStatus: "pending",
    kycSubmittedAt: new Date()
  };
  return this.save();
};

companySchema.methods.verifyKYC = function(adminId, status, rejectionReason = null) {
  this.kycInfo.kycStatus = status;
  this.kycInfo.kycVerifiedAt = new Date();
  this.kycInfo.kycVerifiedBy = adminId;

  if (status === "rejected" && rejectionReason) {
    this.kycInfo.kycRejectionReason = rejectionReason;
  }

  return this.save();
};

// Banking Management Methods
companySchema.methods.updateBankingInfo = function(bankingData) {
  this.bankingInfo = {
    ...this.bankingInfo,
    ...bankingData,
    bankingVerified: false
  };
  return this.save();
};

companySchema.methods.verifyBankingInfo = function(adminId) {
  this.bankingInfo.bankingVerified = true;
  this.bankingInfo.verifiedAt = new Date();
  this.bankingInfo.verifiedBy = adminId;
  return this.save();
};

// Staff Management Methods
companySchema.methods.addStaffVendor = function(vendorId) {
  // Check if vendor is already staff
  const existingStaff = this.staffVendors.find(
    staff => staff.vendorId.toString() === vendorId.toString()
  );

  if (!existingStaff) {
    this.staffVendors.push({
      vendorId: vendorId,
      addedBy: this._id
    });
  }

  return this.save();
};

companySchema.methods.removeStaffVendor = function(vendorId) {
  this.staffVendors = this.staffVendors.filter(
    staff => staff.vendorId.toString() !== vendorId.toString()
  );
  return this.save();
};

// Company Status Management
companySchema.methods.approveCompany = function(adminId) {
  this.approved = true;
  return this.save();
};

companySchema.methods.blockCompany = function(adminId, reason) {
  this.blocked = true;
  this.blockedReason = reason;
  this.blockedAt = new Date();
  this.blockedBy = adminId;
  return this.save();
};

companySchema.methods.unblockCompany = function() {
  this.blocked = false;
  this.blockedReason = null;
  this.blockedAt = null;
  this.blockedBy = null;
  return this.save();
};

// Transform JSON output to exclude sensitive information
companySchema.methods.toJSON = function() {
  const companyObject = this.toObject();
  delete companyObject.adminPassword;

  // Don't expose sensitive banking info
  if (companyObject.bankingInfo) {
    const { bankName, bankingVerified } = companyObject.bankingInfo;
    companyObject.bankingInfo = { bankName, bankingVerified };
  }

  return companyObject;
};

// Admin JSON view with full details
companySchema.methods.toAdminJSON = function() {
  const companyObject = this.toObject();
  delete companyObject.adminPassword;
  return companyObject;
};

module.exports = mongoose.model("Company", companySchema);
