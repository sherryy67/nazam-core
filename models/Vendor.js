const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ROLES = require("../constants/roles");

const vendorSchema = new mongoose.Schema({
  type: { type: String, enum: ["corporate", "individual"], required: true },
  company: { type: String }, // only if corporate
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  coveredCity: { type: String, required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true }, // reference to Service model
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  dob: { type: Date },
  privilege: { type: String, enum: ["Beginner", "Experienced", "Professional"], default: "Beginner" },
  profilePic: { type: String }, // file path or URL
  countryCode: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  experience: { type: Number },
  bankName: { type: String },
  branchName: { type: String },
  bankAccountNumber: { type: String },
  iban: { type: String },
  idType: { type: String, enum: ["Passport", "EmiratesID", "NationalID"], required: true },
  idNumber: { type: String, required: true },
  personalIdNumber: { type: String },
  address: { type: String },
  country: { type: String },
  city: { type: String },
  pinCode: { type: String },
  serviceAvailability: { type: String, enum: ["Full-time", "Part-time"], default: "Full-time" },
  vatRegistration: { type: Boolean, default: false },
  collectTax: { type: Boolean, default: false },
  approved: { type: Boolean, default: false }, // must be approved by admin
  role: { type: Number, enum: [ROLES.VENDOR], default: ROLES.VENDOR }
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

// Transform JSON output to exclude password
vendorSchema.methods.toJSON = function() {
  const vendorObject = this.toObject();
  delete vendorObject.password;
  return vendorObject;
};

module.exports = mongoose.model("Vendor", vendorSchema);
