const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ROLES = require("../constants/roles");

const propertyOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  country: { type: String, trim: true },
  profilePic: { type: String },

  // Commission from Zushh for tenant referrals
  commissionPercentage: { type: Number, required: true, min: 0, max: 100, default: 0 },

  // ID verification
  idType: { type: String, enum: ["Passport", "EmiratesID", "NationalID"] },
  idNumber: { type: String },

  isActive: { type: Boolean, default: true },
  role: { type: Number, enum: [ROLES.PROPERTY_OWNER], default: ROLES.PROPERTY_OWNER },

  // Created by admin
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
}, { timestamps: true });

// Hash password before saving
propertyOwnerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password
propertyOwnerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT
propertyOwnerSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Exclude password from JSON
propertyOwnerSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("PropertyOwner", propertyOwnerSchema);
