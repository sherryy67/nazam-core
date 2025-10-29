const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const OTP = require('../models/OTP');
const { sendSuccess, sendError } = require('../utils/response');
const ROLES = require('../constants/roles');
const smsService = require('../utils/smsService');
const emailService = require('../utils/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for vendor profile picture upload (using memory storage for S3 compatibility)
const upload = multer({ 
  storage: multer.memoryStorage(), // Use memory storage for S3 upload compatibility
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WebP) are allowed'));
    }
  }
});

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
        serviceId: req.body.serviceId,
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

    // For users, check if they are active
    if (role === ROLES.USER && !user.isActive) {
      return sendError(res, 403, 'Your account has been deactivated', 'USER_DEACTIVATED');
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
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'type', 'coveredCity', 'serviceId', 'countryCode', 'mobileNumber', 'idType', 'idNumber'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`, 'MISSING_REQUIRED_FIELDS');
    }

    // Check if vendor already exists with this email or mobile number
    const existingVendor = await Vendor.findOne({
      $or: [
        { email: req.body.email },
        { mobileNumber: req.body.mobileNumber }
      ]
    });

    if (existingVendor) {
      return sendError(res, 409, 'Vendor with this email or mobile number already exists', 'VENDOR_EXISTS');
    }

    // Validate serviceId exists and is active
    const Service = require('../models/Service');
    const service = await Service.findById(req.body.serviceId);
    if (!service || !service.isActive) {
      return sendError(res, 400, 'Invalid or inactive service', 'INVALID_SERVICE');
    }

    // Validate availabilitySchedule if provided
    if (req.body.availabilitySchedule) {
      const validDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      let availabilitySchedule = req.body.availabilitySchedule;
      
      // Try to parse if it's a JSON string
      if (typeof availabilitySchedule === 'string') {
        try {
          availabilitySchedule = JSON.parse(availabilitySchedule);
        } catch (error) {
          return sendError(res, 400, 'availabilitySchedule must be a valid JSON array', 'INVALID_AVAILABILITY_SCHEDULE');
        }
      }
      
      if (!Array.isArray(availabilitySchedule)) {
        return sendError(res, 400, 'availabilitySchedule must be an array. Received: ' + typeof availabilitySchedule, 'INVALID_AVAILABILITY_SCHEDULE');
      }
      
      for (const schedule of availabilitySchedule) {
        if (!schedule || typeof schedule !== 'object') {
          return sendError(res, 400, 'Each availability schedule item must be an object', 'INVALID_AVAILABILITY_SCHEDULE');
        }
        if (!schedule.dayOfWeek || !validDays.includes(schedule.dayOfWeek)) {
          return sendError(res, 400, `Invalid dayOfWeek in availabilitySchedule. Must be one of: ${validDays.join(', ')}`, 'INVALID_DAY_OF_WEEK');
        }
        if (!schedule.startTime || !timePattern.test(schedule.startTime)) {
          return sendError(res, 400, 'Invalid startTime format in availabilitySchedule (use HH:MM format like 09:00)', 'INVALID_START_TIME');
        }
        if (!schedule.endTime || !timePattern.test(schedule.endTime)) {
          return sendError(res, 400, 'Invalid endTime format in availabilitySchedule (use HH:MM format like 18:00)', 'INVALID_END_TIME');
        }
      }
      
      // Update req.body with parsed data
      req.body.availabilitySchedule = availabilitySchedule;
    }

    // Validate unavailableDates if provided
    if (req.body.unavailableDates) {
      let unavailableDates = req.body.unavailableDates;
      
      // Try to parse if it's a JSON string
      if (typeof unavailableDates === 'string') {
        try {
          unavailableDates = JSON.parse(unavailableDates);
        } catch (error) {
          return sendError(res, 400, 'unavailableDates must be a valid JSON array', 'INVALID_UNAVAILABLE_DATES');
        }
      }
      
      if (!Array.isArray(unavailableDates)) {
        return sendError(res, 400, 'unavailableDates must be an array. Received: ' + typeof unavailableDates, 'INVALID_UNAVAILABLE_DATES');
      }
      
      for (const unavailable of unavailableDates) {
        if (!unavailable || typeof unavailable !== 'object') {
          return sendError(res, 400, 'Each unavailable date item must be an object', 'INVALID_UNAVAILABLE_DATES');
        }
        if (!unavailable.date || isNaN(Date.parse(unavailable.date))) {
          return sendError(res, 400, 'Invalid date format in unavailableDates (use YYYY-MM-DD format)', 'INVALID_DATE_FORMAT');
        }
      }
      
      // Update req.body with parsed data
      req.body.unavailableDates = unavailableDates;
    }

    const vendorData = {
      type: req.body.type,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      coveredCity: req.body.coveredCity,
      serviceId: req.body.serviceId,
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
      vatRegistration: req.body.vatRegistration === 'true',
      collectTax: req.body.collectTax === 'true',
      availabilitySchedule: req.body.availabilitySchedule || [],
      unavailableDates: req.body.unavailableDates || []
    };

    // Handle profile picture upload to S3
    if (req.file) {
      try {
        console.log('Starting vendor profile picture upload...');
        console.log('File size:', req.file.size);
        console.log('File mimetype:', req.file.mimetype);
        console.log('File originalname:', req.file.originalname);
        
        // Upload to S3 using the same approach as service controller
        const fileContent = req.file.buffer; // Using buffer from memory storage
        const key = `vendor-profiles/${req.user.id}/${Date.now()}-${req.file.originalname}`;
        
        // Try to use AWS SDK v3, fallback to v2 if needed
        let s3Client, PutObjectCommand;
        
        try {
          const awsS3 = require('@aws-sdk/client-s3');
          s3Client = new awsS3.S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          });
          PutObjectCommand = awsS3.PutObjectCommand;
          console.log('Using AWS SDK v3 for vendor profile upload');
        } catch (error) {
          console.log('AWS SDK v3 not available for vendor profile upload, trying v2...');
          try {
            const AWS = require('aws-sdk');
            s3Client = new AWS.S3({
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              region: process.env.AWS_REGION || 'us-east-1'
            });
            console.log('Using AWS SDK v2 for vendor profile upload');
          } catch (v2Error) {
            console.error('AWS SDK not available for vendor profile upload:', v2Error);
            throw new Error('AWS SDK not available');
          }
        }
        
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: req.file.mimetype
        };
        
        console.log('Vendor profile upload params:', {
          Bucket: uploadParams.Bucket,
          Key: uploadParams.Key,
          ContentType: uploadParams.ContentType,
          BodySize: fileContent.length
        });
        
        let result;
        if (PutObjectCommand) {
          // AWS SDK v3
          const command = new PutObjectCommand(uploadParams);
          result = await s3Client.send(command);
        } else {
          // AWS SDK v2
          result = await s3Client.upload(uploadParams).promise();
        }
        
        console.log('Vendor profile S3 upload result:', result);
        
        // Construct the S3 URL
        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
        vendorData.profilePic = s3Url;
        
        console.log('Vendor profile S3 URL generated:', s3Url);
        
      } catch (s3Error) {
        console.error('Vendor profile S3 upload error:', s3Error);
        console.error('Error details:', {
          message: s3Error.message,
          code: s3Error.code,
          statusCode: s3Error.statusCode,
          requestId: s3Error.requestId
        });
        return sendError(res, 500, `Failed to upload profile picture: ${s3Error.message}`, 'S3_UPLOAD_FAILED');
      }
    }

    const vendor = await Vendor.create(vendorData);
    
    // Remove password from response
    const vendorResponse = vendor.toJSON();
    
    sendSuccess(res, 201, 'Vendor created successfully by admin', { vendor: vendorResponse });
  } catch (error) {
    // Clean up local file if error occurs
    if (req.file && require('fs').existsSync(req.file.path)) {
      require('fs').unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Get all vendors (Admin only)
// @route   GET /api/auth/admin/vendors
// @access  Private (Admin only)
const getAllVendors = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, type, coveredCity } = req.query;
    
    // Build query
    const query = {};
    
    // Add search filter
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add type filter
    if (type) {
      query.type = type;
    }
    
    // Add coveredCity filter
    if (coveredCity) {
      query.coveredCity = { $regex: coveredCity, $options: 'i' };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute queries in parallel
    const [vendors, totalCount] = await Promise.all([
      Vendor.find(query)
        .populate('serviceId', 'name description basePrice unitType')
        .select('-password') // Exclude password
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Vendor.countDocuments(query)
    ]);

    // Transform vendors to match frontend interface
    const transformedVendors = vendors.map(vendor => ({
      _id: vendor._id,
      type: vendor.type,
      company: vendor.company,
      firstName: vendor.firstName,
      lastName: vendor.lastName,
      coveredCity: vendor.coveredCity,
      serviceId: vendor.serviceId,
      gender: vendor.gender,
      dob: vendor.dob,
      privilege: vendor.privilege,
      profilePic: vendor.profilePic,
      countryCode: vendor.countryCode,
      mobileNumber: vendor.mobileNumber,
      email: vendor.email,
      experience: vendor.experience,
      bankName: vendor.bankName,
      branchName: vendor.branchName,
      bankAccountNumber: vendor.bankAccountNumber,
      iban: vendor.iban,
      idType: vendor.idType,
      idNumber: vendor.idNumber,
      personalIdNumber: vendor.personalIdNumber,
      address: vendor.address,
      country: vendor.country,
      city: vendor.city,
      pinCode: vendor.pinCode,
      serviceAvailability: vendor.serviceAvailability,
      vatRegistration: vendor.vatRegistration,
      collectTax: vendor.collectTax,
      approved: vendor.approved,
      role: vendor.role,
      createdAt: vendor.createdAt?.toISOString(),
      updatedAt: vendor.updatedAt?.toISOString()
    }));

    const response = {
      success: true,
      exception: null,
      description: 'All vendors retrieved successfully',
      content: {
        vendors: transformedVendors,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalVendors: totalCount,
          vendorsPerPage: limitNum,
          hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
          hasPrevPage: pageNum > 1
        }
      }
    };

    res.status(200).json(response);
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

// @desc    Send OTP to phone number or email
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res, next) => {
  try {
    const { phoneNumber, email } = req.body;

    // Validate that at least one contact method is provided
    if (!phoneNumber && !email) {
      return sendError(res, 400, 'Either phone number or email is required', 'MISSING_CONTACT_INFO');
    }

    // Validate phone number format if provided
    if (phoneNumber && !smsService.isValidUAEPhoneNumber(phoneNumber)) {
      return sendError(res, 400, 'Please provide a valid UAE phone number', 'INVALID_PHONE_NUMBER');
    }

    // Validate email format if provided
    if (email && !emailService.isValidEmail(email)) {
      return sendError(res, 400, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    // Note: We don't check for existing users here since we want to allow
    // contact verification before account creation

    // Generate OTP code
    const otpCode = smsService.generateOTP();
    
    // Set expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Prepare OTP record data
    const otpData = {
      code: otpCode,
      expiresAt
    };

    // Add contact method to OTP data
    if (phoneNumber) {
      otpData.phoneNumber = phoneNumber;
    }
    if (email) {
      otpData.email = email;
    }

    // Invalidate any existing OTPs for this contact method
    const query = { isUsed: false };
    if (phoneNumber) {
      query.phoneNumber = phoneNumber;
    }
    if (email) {
      query.email = email;
    }

    await OTP.updateMany(query, { isUsed: true });

    // Create new OTP record
    const otpRecord = await OTP.create(otpData);

    // Try to send OTP via both methods if both are provided
    let smsSuccess = false;
    let emailSuccess = false;
    let smsError = null;
    let emailError = null;

    // Send SMS if phone number is provided
    if (phoneNumber) {
      try {
        await smsService.sendOTP(phoneNumber, otpCode);
        smsSuccess = true;
      } catch (error) {
        smsError = error.message;
        console.error('SMS sending failed:', error.message);
      }
    }

    // Send email if email is provided
    if (email) {
      try {
        await emailService.sendOTP(email, otpCode);
        emailSuccess = true;
      } catch (error) {
        emailError = error.message;
        console.error('Email sending failed:', error.message);
      }
    }

    // Check if at least one method succeeded
    if (!smsSuccess && !emailSuccess) {
      // If both methods failed, delete the OTP record
      await OTP.findByIdAndDelete(otpRecord._id);
      
      let errorMessage = 'Failed to send OTP. ';
      if (phoneNumber && email) {
        errorMessage += `SMS error: ${smsError}. Email error: ${emailError}`;
      } else if (phoneNumber) {
        errorMessage += `SMS error: ${smsError}`;
      } else {
        errorMessage += `Email error: ${emailError}`;
      }
      
      return sendError(res, 500, errorMessage, 'OTP_SEND_FAILED');
    }

    // Prepare success response
    const responseData = {
      expiresIn: '5 minutes'
    };

    let successMessage = 'OTP sent successfully';

    if (phoneNumber && email) {
      // Both methods provided
      if (smsSuccess && emailSuccess) {
        successMessage = 'OTP sent successfully to both your phone number and email';
        responseData.phoneNumber = phoneNumber;
        responseData.email = email;
        responseData.sentVia = ['SMS', 'Email'];
      } else if (smsSuccess) {
        successMessage = 'OTP sent successfully to your phone number (email failed)';
        responseData.phoneNumber = phoneNumber;
        responseData.sentVia = ['SMS'];
        responseData.emailError = emailError;
      } else {
        successMessage = 'OTP sent successfully to your email (SMS failed)';
        responseData.email = email;
        responseData.sentVia = ['Email'];
        responseData.smsError = smsError;
      }
    } else if (phoneNumber) {
      // Only phone number provided
      successMessage = 'OTP sent successfully to your phone number';
      responseData.phoneNumber = phoneNumber;
      responseData.sentVia = ['SMS'];
    } else {
      // Only email provided
      successMessage = 'OTP sent successfully to your email';
      responseData.email = email;
      responseData.sentVia = ['Email'];
    }

    sendSuccess(res, 200, successMessage, responseData);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and register user
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
  try {
    const { phoneNumber, email, otpCode, name, password } = req.body;

    // Validate required fields
    if ((!phoneNumber && !email) || !otpCode) {
      return sendError(res, 400, 'Either phone number or email, and OTP code are required', 'MISSING_REQUIRED_FIELDS');
    }

    if (!name || !password) {
      return sendError(res, 400, 'Name and password are required for registration', 'MISSING_REGISTRATION_FIELDS');
    }

    // Validate UAE phone number format if provided
    if (phoneNumber && !smsService.isValidUAEPhoneNumber(phoneNumber)) {
      return sendError(res, 400, 'Please provide a valid UAE phone number', 'INVALID_PHONE_NUMBER');
    }

    // Validate email format if provided
    if (email && !emailService.isValidEmail(email)) {
      return sendError(res, 400, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    // Build query to find OTP record
    const otpQuery = {
      code: otpCode,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    };

    if (phoneNumber) {
      otpQuery.phoneNumber = phoneNumber;
    }
    if (email) {
      otpQuery.email = email;
    }

    // Find valid OTP record
    const otpRecord = await OTP.findOne(otpQuery);

    if (!otpRecord) {
      return sendError(res, 400, 'Invalid or expired OTP code', 'INVALID_OTP');
    }

    // Check if OTP has exceeded max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return sendError(res, 400, 'OTP code has exceeded maximum attempts', 'OTP_MAX_ATTEMPTS_EXCEEDED');
    }

    // Prepare user data
    const userData = {
      name,
      password,
      role: ROLES.USER,
      isOTPVerified: true
    };

    // Add contact information based on what was verified
    if (phoneNumber) {
      userData.phoneNumber = phoneNumber;
    }
    if (email) {
      userData.email = email;
    }

    // Check if user already exists with this phone number or email
    const existingUserQuery = {};
    if (phoneNumber && email) {
      existingUserQuery.$or = [
        { phoneNumber },
        { email }
      ];
    } else if (phoneNumber) {
      existingUserQuery.phoneNumber = phoneNumber;
    } else {
      existingUserQuery.email = email;
    }

    const existingUser = await User.findOne(existingUserQuery);

    if (existingUser) {
      return sendError(res, 409, 'User with this contact information already exists', 'USER_EXISTS');
    }

    // Mark OTP as used
    await otpRecord.markAsUsed();

    // Create new user
    const user = await User.create(userData);

    // Generate JWT token and send response
    sendTokenResponse(user, 201, res);
  } catch (error) {
    // If user creation fails, we should increment OTP attempts
    if (error.name === 'ValidationError' || error.code === 11000) {
      try {
        const otpQuery = {
          code: req.body.otpCode,
          isUsed: false
        };
        
        if (req.body.phoneNumber) {
          otpQuery.phoneNumber = req.body.phoneNumber;
        }
        if (req.body.email) {
          otpQuery.email = req.body.email;
        }
        
        const otpRecord = await OTP.findOne(otpQuery);
        
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
    const { phoneNumber, email } = req.body;

    // Validate that at least one contact method is provided
    if (!phoneNumber && !email) {
      return sendError(res, 400, 'Either phone number or email is required', 'MISSING_CONTACT_INFO');
    }

    // Validate phone number format if provided
    if (phoneNumber && !smsService.isValidUAEPhoneNumber(phoneNumber)) {
      return sendError(res, 400, 'Please provide a valid UAE phone number', 'INVALID_PHONE_NUMBER');
    }

    // Validate email format if provided
    if (email && !emailService.isValidEmail(email)) {
      return sendError(res, 400, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    // Note: We don't check for existing users here since we want to allow
    // contact verification before account creation

    // Generate new OTP code
    const otpCode = smsService.generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Prepare OTP record data
    const otpData = {
      code: otpCode,
      expiresAt
    };

    // Add contact method to OTP data
    if (phoneNumber) {
      otpData.phoneNumber = phoneNumber;
    }
    if (email) {
      otpData.email = email;
    }

    // Invalidate any existing OTPs for this contact method
    const query = { isUsed: false };
    if (phoneNumber) {
      query.phoneNumber = phoneNumber;
    }
    if (email) {
      query.email = email;
    }

    await OTP.updateMany(query, { isUsed: true });

    // Create new OTP record
    const otpRecord = await OTP.create(otpData);

    // Try to send OTP via both methods if both are provided
    let smsSuccess = false;
    let emailSuccess = false;
    let smsError = null;
    let emailError = null;

    // Send SMS if phone number is provided
    if (phoneNumber) {
      try {
        await smsService.sendOTP(phoneNumber, otpCode);
        smsSuccess = true;
      } catch (error) {
        smsError = error.message;
        console.error('SMS sending failed:', error.message);
      }
    }

    // Send email if email is provided
    if (email) {
      try {
        await emailService.sendOTP(email, otpCode);
        emailSuccess = true;
      } catch (error) {
        emailError = error.message;
        console.error('Email sending failed:', error.message);
      }
    }

    // Check if at least one method succeeded
    if (!smsSuccess && !emailSuccess) {
      // If both methods failed, delete the OTP record
      await OTP.findByIdAndDelete(otpRecord._id);
      
      let errorMessage = 'Failed to resend OTP. ';
      if (phoneNumber && email) {
        errorMessage += `SMS error: ${smsError}. Email error: ${emailError}`;
      } else if (phoneNumber) {
        errorMessage += `SMS error: ${smsError}`;
      } else {
        errorMessage += `Email error: ${emailError}`;
      }
      
      return sendError(res, 500, errorMessage, 'OTP_RESEND_FAILED');
    }

    // Prepare success response
    const responseData = {
      expiresIn: '5 minutes'
    };

    let successMessage = 'OTP resent successfully';

    if (phoneNumber && email) {
      // Both methods provided
      if (smsSuccess && emailSuccess) {
        successMessage = 'OTP resent successfully to both your phone number and email';
        responseData.phoneNumber = phoneNumber;
        responseData.email = email;
        responseData.sentVia = ['SMS', 'Email'];
      } else if (smsSuccess) {
        successMessage = 'OTP resent successfully to your phone number (email failed)';
        responseData.phoneNumber = phoneNumber;
        responseData.sentVia = ['SMS'];
        responseData.emailError = emailError;
      } else {
        successMessage = 'OTP resent successfully to your email (SMS failed)';
        responseData.email = email;
        responseData.sentVia = ['Email'];
        responseData.smsError = smsError;
      }
    } else if (phoneNumber) {
      // Only phone number provided
      successMessage = 'OTP resent successfully to your phone number';
      responseData.phoneNumber = phoneNumber;
      responseData.sentVia = ['SMS'];
    } else {
      // Only email provided
      successMessage = 'OTP resent successfully to your email';
      responseData.email = email;
      responseData.sentVia = ['Email'];
    }

    sendSuccess(res, 200, successMessage, responseData);
  } catch (error) {
    next(error);
  }
};

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate credentials
    if (!email || !password) {
      return sendError(res, 400, 'Please provide an email and password', 'MISSING_CREDENTIALS');
    }

    // Check for admin in Admin model
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if password matches
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    sendTokenResponse(admin, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new admin
// @route   POST /api/admin/create
// @access  Public
const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return sendError(res, 400, 'Name, email, and password are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Check if admin already exists with this email
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return sendError(res, 409, 'Admin with this email already exists', 'ADMIN_EXISTS');
    }

    // Create new admin
    const admin = await Admin.create({
      name,
      email,
      password,
      role: ROLES.ADMIN
    });

    // Remove password from response
    const adminResponse = admin.toJSON();

    sendSuccess(res, 201, 'Admin created successfully', { admin: adminResponse });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin activate user
// @route   PUT /api/admin/activate-user/:id
// @access  Private (Admin only)
const adminActivateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    sendSuccess(res, 200, 'User activated successfully', { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin deactivate user
// @route   PUT /api/admin/deactivate-user/:id
// @access  Private (Admin only)
const adminDeactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    sendSuccess(res, 200, 'User deactivated successfully', { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    sendSuccess(res, 200, 'Users retrieved successfully', { users });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP only (Step 2 of registration)
// @route   POST /api/auth/verify-otp-only
// @access  Public
const verifyOTPOnly = async (req, res, next) => {
  try {
    const { phoneNumber, email, otpCode } = req.body;

    // Validate required fields
    if ((!phoneNumber && !email) || !otpCode) {
      return sendError(res, 400, 'Either phone number or email, and OTP code are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate UAE phone number format if provided
    if (phoneNumber && !smsService.isValidUAEPhoneNumber(phoneNumber)) {
      return sendError(res, 400, 'Please provide a valid UAE phone number', 'INVALID_PHONE_NUMBER');
    }

    // Validate email format if provided
    if (email && !emailService.isValidEmail(email)) {
      return sendError(res, 400, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    // Build query to find OTP record
    const otpQuery = {
      code: otpCode,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    };

    if (phoneNumber) {
      otpQuery.phoneNumber = phoneNumber;
    }
    if (email) {
      otpQuery.email = email;
    }

    // Find valid OTP record
    const otpRecord = await OTP.findOne(otpQuery);

    if (!otpRecord) {
      return sendError(res, 400, 'Invalid or expired OTP code', 'INVALID_OTP');
    }

    // Check if OTP has exceeded max attempts
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return sendError(res, 400, 'OTP code has exceeded maximum attempts', 'OTP_MAX_ATTEMPTS_EXCEEDED');
    }

    // Mark OTP as used
    await otpRecord.markAsUsed();

    // Prepare response data
    const responseData = {
      verified: true,
      message: 'You can now proceed with account creation'
    };

    if (phoneNumber) {
      responseData.phoneNumber = phoneNumber;
    }
    if (email) {
      responseData.email = email;
    }

    // Return success - OTP is verified, user can now create account
    sendSuccess(res, 200, 'OTP verified successfully', responseData);
  } catch (error) {
    next(error);
  }
};

// @desc    Create user account (Step 3 of registration)
// @route   POST /api/auth/create-account
// @access  Public
const createAccount = async (req, res, next) => {
  try {
    const { phoneNumber, email, name, password } = req.body;

    // Validate required fields
    if ((!phoneNumber && !email) || !name || !password) {
      return sendError(res, 400, 'Either phone number or email, name, and password are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate UAE phone number format if provided
    if (phoneNumber && !smsService.isValidUAEPhoneNumber(phoneNumber)) {
      return sendError(res, 400, 'Please provide a valid UAE phone number', 'INVALID_PHONE_NUMBER');
    }

    // Validate email format if provided
    if (email && !emailService.isValidEmail(email)) {
      return sendError(res, 400, 'Please provide a valid email address', 'INVALID_EMAIL');
    }

    // Check if user already exists with this phone number or email
    const existingUserQuery = {};
    if (phoneNumber && email) {
      existingUserQuery.$or = [
        { phoneNumber },
        { email }
      ];
    } else if (phoneNumber) {
      existingUserQuery.phoneNumber = phoneNumber;
    } else {
      existingUserQuery.email = email;
    }

    const existingUser = await User.findOne(existingUserQuery);

    if (existingUser) {
      return sendError(res, 409, 'User with this contact information already exists', 'USER_EXISTS');
    }

    // Check if contact method was verified (OTP was used)
    const verifiedOTPQuery = { isUsed: true };
    if (phoneNumber) {
      verifiedOTPQuery.phoneNumber = phoneNumber;
    }
    if (email) {
      verifiedOTPQuery.email = email;
    }

    const verifiedOTP = await OTP.findOne(verifiedOTPQuery);

    if (!verifiedOTP) {
      return sendError(res, 400, 'Contact information must be verified with OTP before creating account', 'CONTACT_NOT_VERIFIED');
    }

    // Prepare user data
    const userData = {
      name,
      password,
      role: ROLES.USER,
      isOTPVerified: true
    };

    // Add contact information based on what was verified
    if (phoneNumber) {
      userData.phoneNumber = phoneNumber;
    }
    if (email) {
      userData.email = email;
    }

    // Create new user
    const user = await User.create(userData);

    // Generate JWT token and send response
    sendTokenResponse(user, 201, res);
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
  getAllVendors,
  sendOTP,
  verifyOTP,
  resendOTP,
  adminLogin,
  createAdmin,
  adminActivateUser,
  adminDeactivateUser,
  getAllUsers,
  verifyOTPOnly,
  createAccount,
  upload
};
