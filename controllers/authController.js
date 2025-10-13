const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
const { sendSuccess, sendError } = require('../utils/response');
const ROLES = require('../constants/roles');
const smsService = require('../utils/smsService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { role } = req.body;

    // Only allow user and vendor registration through this endpoint
    if (role === ROLES.ADMIN) {
      return sendError(res, 403, 'Admin registration not allowed through this endpoint', 'ADMIN_REGISTRATION_FORBIDDEN');
    }

    let user;
    
    if (role === ROLES.VENDOR) {
      // Create vendor with all required fields
      const vendorData = {
        type: req.body.type,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        coveredCity: req.body.coveredCity,
        jobService: req.body.jobService,
        countryCode: req.body.countryCode,
        mobileNumber: req.body.mobileNumber,
        email: req.body.email,
        password: req.body.password,
        idType: req.body.idType,
        idNumber: req.body.idNumber,
        // Optional fields
        company: req.body.company,
        gender: req.body.gender,
        dob: req.body.dob,
        privilege: req.body.privilege,
        profilePic: req.body.profilePic,
        experience: req.body.experience,
        bankName: req.body.bankName,
        branchName: req.body.branchName,
        bankAccountNumber: req.body.bankAccountNumber,
        iban: req.body.iban,
        personalIdNumber: req.body.personalIdNumber,
        address: req.body.address,
        country: req.body.country,
        city: req.body.city,
        pinCode: req.body.pinCode,
        serviceAvailability: req.body.serviceAvailability,
        vatRegistration: req.body.vatRegistration,
        collectTax: req.body.collectTax
      };

      user = await Vendor.create(vendorData);
    } else {
      // Create regular user
      const { name, email, phoneNumber, password } = req.body;
      user = await User.create({
        name,
        email,
        phoneNumber,
        password,
        role: ROLES.USER
      });
    }

    // Generate JWT token and send response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, phoneNumber, password, role } = req.body;

    // Validate credentials based on role
    if (role === ROLES.USER) {
      // For users, use phone number instead of email
      if (!phoneNumber || !password) {
        return sendError(res, 400, 'Please provide a phone number and password', 'MISSING_CREDENTIALS');
      }
    } else {
      // For vendors and admins, use email
      if (!email || !password) {
        return sendError(res, 400, 'Please provide an email and password', 'MISSING_CREDENTIALS');
      }
    }

    let user;
    let userModel;

    // Determine which model to use based on role
    if (role === ROLES.ADMIN) {
      userModel = Admin;
    } else if (role === ROLES.VENDOR) {
      userModel = Vendor;
    } else {
      userModel = User;
    }

    // Check for user in the appropriate model with appropriate field
    if (role === ROLES.USER) {
      user = await userModel.findOne({ phoneNumber }).select('+password');
    } else {
      user = await userModel.findOne({ email }).select('+password');
    }

    if (!user) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // For vendors, check if they are approved
    if (role === ROLES.VENDOR && !user.approved) {
      return sendError(res, 403, 'Your vendor account is pending approval', 'VENDOR_NOT_APPROVED');
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  sendSuccess(res, 200, 'User logged out successfully');
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    let user;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get user from appropriate model based on role
    if (userRole === ROLES.ADMIN) {
      user = await Admin.findById(userId);
    } else if (userRole === ROLES.VENDOR) {
      user = await Vendor.findById(userId);
    } else {
      user = await User.findById(userId);
    }

    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    sendSuccess(res, 200, 'User profile retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email
    };

    let user;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Update user in appropriate model based on role
    if (userRole === ROLES.ADMIN) {
      user = await Admin.findByIdAndUpdate(userId, fieldsToUpdate, {
        new: true,
        runValidators: true
      });
    } else if (userRole === ROLES.VENDOR) {
      // For vendors, allow updating more fields
      const vendorFields = {
        ...fieldsToUpdate,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        coveredCity: req.body.coveredCity,
        jobService: req.body.jobService,
        mobileNumber: req.body.mobileNumber,
        address: req.body.address,
        city: req.body.city,
        country: req.body.country
      };
      
      user = await Vendor.findByIdAndUpdate(userId, vendorFields, {
        new: true,
        runValidators: true
      });
    } else {
      user = await User.findByIdAndUpdate(userId, fieldsToUpdate, {
        new: true,
        runValidators: true
      });
    }

    sendSuccess(res, 200, 'User details updated successfully', { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    let user;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get user from appropriate model based on role
    if (userRole === ROLES.ADMIN) {
      user = await Admin.findById(userId).select('+password');
    } else if (userRole === ROLES.VENDOR) {
      user = await Vendor.findById(userId).select('+password');
    } else {
      user = await User.findById(userId).select('+password');
    }

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return sendError(res, 401, 'Current password is incorrect', 'INCORRECT_PASSWORD');
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Admin create vendor
// @route   POST /api/auth/admin/create-vendor
// @access  Private (Admin only)
const adminCreateVendor = async (req, res, next) => {
  try {
    const vendorData = {
      type: req.body.type,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      coveredCity: req.body.coveredCity,
      jobService: req.body.jobService,
      countryCode: req.body.countryCode,
      mobileNumber: req.body.mobileNumber,
      email: req.body.email,
      password: req.body.password,
      idType: req.body.idType,
      idNumber: req.body.idNumber,
      approved: true, // Admin created vendors are auto-approved
      // Optional fields
      company: req.body.company,
      gender: req.body.gender,
      dob: req.body.dob,
      privilege: req.body.privilege,
      profilePic: req.body.profilePic,
      experience: req.body.experience,
      bankName: req.body.bankName,
      branchName: req.body.branchName,
      bankAccountNumber: req.body.bankAccountNumber,
      iban: req.body.iban,
      personalIdNumber: req.body.personalIdNumber,
      address: req.body.address,
      country: req.body.country,
      city: req.body.city,
      pinCode: req.body.pinCode,
      serviceAvailability: req.body.serviceAvailability,
      vatRegistration: req.body.vatRegistration,
      collectTax: req.body.collectTax
    };

    const vendor = await Vendor.create(vendorData);
    sendSuccess(res, 201, 'Vendor created successfully by admin', { vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin approve vendor
// @route   PUT /api/auth/admin/approve-vendor/:id
// @access  Private (Admin only)
const adminApproveVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );

    if (!vendor) {
      return sendError(res, 404, 'Vendor not found', 'VENDOR_NOT_FOUND');
    }

    sendSuccess(res, 200, 'Vendor approved successfully', { vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin reject vendor
// @route   PUT /api/auth/admin/reject-vendor/:id
// @access  Private (Admin only)
const adminRejectVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { approved: false },
      { new: true }
    );

    if (!vendor) {
      return sendError(res, 404, 'Vendor not found', 'VENDOR_NOT_FOUND');
    }

    sendSuccess(res, 200, 'Vendor rejected successfully', { vendor });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending vendors
// @route   GET /api/auth/admin/pending-vendors
// @access  Private (Admin only)
const getPendingVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find({ approved: false });
    sendSuccess(res, 200, 'Pending vendors retrieved successfully', { vendors });
  } catch (error) {
    next(error);
  }
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.generateAuthToken();

  const userData = {
    id: user._id,
    email: user.email,
    role: user.role
  };

  // Add role-specific fields
  if (user.role === ROLES.VENDOR) {
    userData.firstName = user.firstName;
    userData.lastName = user.lastName;
    userData.type = user.type;
    userData.approved = user.approved;
    userData.jobService = user.jobService;
    userData.coveredCity = user.coveredCity;
  } else if (user.role === ROLES.ADMIN) {
    userData.name = user.name;
  } else {
    userData.name = user.name;
  }

  sendSuccess(res, statusCode, 'Login successful', {
    access_token: token,
    user: userData
  });
};

// @desc    Send OTP to phone number
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    // Validate phone number
    if (!phoneNumber) {
      return sendError(res, 400, 'Phone number is required', 'MISSING_PHONE_NUMBER');
    }

    // Validate UAE phone number format
    if (!smsService.isValidUAEPhoneNumber(phoneNumber)) {
      return sendError(res, 400, 'Please provide a valid UAE phone number', 'INVALID_PHONE_NUMBER');
    }

    // Check if user already exists with this phone number
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return sendError(res, 409, 'User with this phone number already exists', 'USER_EXISTS');
    }

    // Generate OTP code
    const otpCode = smsService.generateOTP();
    
    // Set expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate any existing OTPs for this phone number
    await OTP.updateMany(
      { phoneNumber, isUsed: false },
      { isUsed: true }
    );

    // Create new OTP record
    const otpRecord = await OTP.create({
      phoneNumber,
      code: otpCode,
      expiresAt
    });

    // Send SMS
    try {
      await smsService.sendOTP(phoneNumber, otpCode);
      
      sendSuccess(res, 200, 'OTP sent successfully to your phone number', {
        phoneNumber,
        expiresIn: '5 minutes'
      });
    } catch (smsError) {
      // If SMS fails, delete the OTP record
      await OTP.findByIdAndDelete(otpRecord._id);
      
      return sendError(res, 500, 'Failed to send OTP. Please try again.', 'SMS_SEND_FAILED');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and register user
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { phoneNumber, otpCode, name, email, password } = req.body;

    // Validate required fields
    if (!phoneNumber || !otpCode) {
      return sendError(res, 400, 'Phone number and OTP code are required', 'MISSING_REQUIRED_FIELDS');
    }

    if (!name || !email || !password) {
      return sendError(res, 400, 'Name, email, and password are required for registration', 'MISSING_REGISTRATION_FIELDS');
    }

    // Validate UAE phone number format
    if (!smsService.isValidUAEPhoneNumber(phoneNumber)) {
      return sendError(res, 400, 'Please provide a valid UAE phone number', 'INVALID_PHONE_NUMBER');
    }

    // Find valid OTP record
    const otpRecord = await OTP.findOne({
      phoneNumber,
      code: otpCode,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return sendError(res, 400, 'Invalid or expired OTP code', 'INVALID_OTP');
    }

    // Check if OTP has exceeded max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return sendError(res, 400, 'OTP code has exceeded maximum attempts', 'OTP_MAX_ATTEMPTS_EXCEEDED');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { phoneNumber },
        { email }
      ]
    });

    if (existingUser) {
      return sendError(res, 409, 'User with this phone number or email already exists', 'USER_EXISTS');
    }

    // Mark OTP as used
    await otpRecord.markAsUsed();

    // Create new user
    const user = await User.create({
      name,
      email,
      phoneNumber,
      password,
      role: ROLES.USER
    });

    // Generate JWT token and send response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    // If user creation fails, we should increment OTP attempts
    if (error.name === 'ValidationError' || error.code === 11000) {
      try {
        const otpRecord = await OTP.findOne({
          phoneNumber: req.body.phoneNumber,
          code: req.body.otpCode,
          isUsed: false
        });
        
        if (otpRecord) {
          await otpRecord.incrementAttempts();
        }
      } catch (otpError) {
        console.error('Error updating OTP attempts:', otpError);
      }
    }
    
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    // Validate phone number
    if (!phoneNumber) {
      return sendError(res, 400, 'Phone number is required', 'MISSING_PHONE_NUMBER');
    }

    // Validate UAE phone number format
    if (!smsService.isValidUAEPhoneNumber(phoneNumber)) {
      return sendError(res, 400, 'Please provide a valid UAE phone number', 'INVALID_PHONE_NUMBER');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return sendError(res, 409, 'User with this phone number already exists', 'USER_EXISTS');
    }

    // Generate new OTP code
    const otpCode = smsService.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Invalidate any existing OTPs for this phone number
    await OTP.updateMany(
      { phoneNumber, isUsed: false },
      { isUsed: true }
    );

    // Create new OTP record
    const otpRecord = await OTP.create({
      phoneNumber,
      code: otpCode,
      expiresAt
    });

    // Send SMS
    try {
      await smsService.sendOTP(phoneNumber, otpCode);
      
      sendSuccess(res, 200, 'OTP resent successfully to your phone number', {
        phoneNumber,
        expiresIn: '5 minutes'
      });
    } catch (smsError) {
      // If SMS fails, delete the OTP record
      await OTP.findByIdAndDelete(otpRecord._id);
      
      return sendError(res, 500, 'Failed to resend OTP. Please try again.', 'SMS_SEND_FAILED');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  adminCreateVendor,
  adminApproveVendor,
  adminRejectVendor,
  getPendingVendors,
  sendOTP,
  verifyOTP,
  resendOTP
};
