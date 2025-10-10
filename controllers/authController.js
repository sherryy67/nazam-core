const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const { sendSuccess, sendError } = require('../utils/response');
const ROLES = require('../constants/roles');

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
    const { email, password, role } = req.body;

    // Validate email & password
    if (!email || !password) {
      return sendError(res, 400, 'Please provide an email and password', 'MISSING_CREDENTIALS');
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

    // Check for user in the appropriate model
    user = await userModel.findOne({ email }).select('+password');

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
  getPendingVendors
};
