const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  phoneNumber: {
    type: String,
    default: '',
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
  },
  role: {
    type: Number,
    required: [true, 'Role code is required'],
  },
  roleRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Role reference is required'],
  },
  permissionOverrides: {
    grant: [{
      type: String,
      trim: true,
    }],
    revoke: [{
      type: String,
      trim: true,
    }],
  },
  department: {
    type: String,
    default: '',
  },
  assignedCity: {
    type: String,
    default: '',
  },
  assignedZone: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
  },
  lastLogin: {
    type: Date,
  },
  profilePic: {
    type: String,
    default: '',
  },
}, { timestamps: true });

// Hash password before saving
staffSchema.pre('save', async function (next) {
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
staffSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
staffSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Transform JSON output to exclude password
staffSchema.methods.toJSON = function () {
  const staffObject = this.toObject();
  delete staffObject.password;
  return staffObject;
};

// Indexes
staffSchema.index({ email: 1 });
staffSchema.index({ role: 1 });
staffSchema.index({ roleRef: 1 });

module.exports = mongoose.model('Staff', staffSchema);
