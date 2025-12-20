const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const Address = require('../models/Address');
const { sendSuccess, sendError } = require('../utils/response');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Try to use AWS SDK v3, fallback to v2 if needed
let s3Client, PutObjectCommand, DeleteObjectCommand;

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
  DeleteObjectCommand = awsS3.DeleteObjectCommand;
  console.log('Using AWS SDK v3');
} catch (error) {
  console.log('AWS SDK v3 not available, trying v2...');
  try {
    const AWS = require('aws-sdk');
    s3Client = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    console.log('Using AWS SDK v2');
  } catch (v2Error) {
    console.error('AWS SDK not available:', v2Error);
    throw new Error('AWS SDK not properly configured');
  }
}

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed'));
    }
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let user = await User.findById(userId).select('-password');

    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    if (user) {
      const defaultAddress = await Address.findOne({ user: userId, isDefault: true });
      user = user.toObject();
      if (defaultAddress) {
        user.address = `${defaultAddress.addressLine1}${defaultAddress.addressLine2 ? ', ' + defaultAddress.addressLine2 : ''}${defaultAddress.city ? ', ' + defaultAddress.city : ''}${defaultAddress.emirate ? ', ' + defaultAddress.emirate : ''}${defaultAddress.country ? ', ' + defaultAddress.country : ''}`;
        user.defaultAddress = defaultAddress;
      } else {
        user.defaultAddress = null;
      }
    }

    sendSuccess(res, 200, 'User profile retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   POST /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email, phoneNumber } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUserWithEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUserWithEmail) {
        return sendError(res, 400, 'Email is already in use by another user', 'EMAIL_ALREADY_EXISTS');
      }
      updateData.email = email;
    }
    if (phoneNumber) {
      // Check if phone number is already taken by another user
      const existingUserWithPhone = await User.findOne({ phoneNumber, _id: { $ne: userId } });
      if (existingUserWithPhone) {
        return sendError(res, 400, 'Phone number is already in use by another user', 'PHONE_ALREADY_EXISTS');
      }
      updateData.phoneNumber = phoneNumber;
    }

    // Handle profile picture upload if provided
    if (req.file) {
      try {
        console.log('Starting S3 upload...');
        console.log('File path:', req.file.path);
        console.log('File size:', req.file.size);
        console.log('File mimetype:', req.file.mimetype);

        // Upload to S3
        const fileContent = fs.readFileSync(req.file.path);
        const key = `profile-pictures/${userId}/${req.file.filename}`;

        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: req.file.mimetype
        };

        console.log('Upload params:', {
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

        console.log('S3 upload result:', result);

        // Construct the S3 URL
        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
        updateData.profilePic = s3Url;

        console.log('S3 URL generated:', s3Url);

        // Delete local file after S3 upload
        fs.unlinkSync(req.file.path);
        console.log('Local file deleted successfully');

      } catch (s3Error) {
        console.error('S3 upload error:', s3Error);
        console.error('Error details:', {
          message: s3Error.message,
          code: s3Error.code,
          statusCode: s3Error.statusCode,
          requestId: s3Error.requestId
        });

        // Clean up local file if S3 upload fails
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(res, 500, `Failed to upload profile picture: ${s3Error.message}`, 'S3_UPLOAD_FAILED');
      }
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (updatedUser) {
      const defaultAddress = await Address.findOne({ user: userId, isDefault: true });
      const userObj = updatedUser.toObject();
      if (defaultAddress) {
        userObj.address = `${defaultAddress.addressLine1}${defaultAddress.addressLine2 ? ', ' + defaultAddress.addressLine2 : ''}${defaultAddress.city ? ', ' + defaultAddress.city : ''}${defaultAddress.emirate ? ', ' + defaultAddress.emirate : ''}${defaultAddress.country ? ', ' + defaultAddress.country : ''}`;
        userObj.defaultAddress = defaultAddress;
      } else {
        userObj.defaultAddress = null;
      }

      sendSuccess(res, 200, 'Profile updated successfully', { user: userObj });
    } else {
      sendSuccess(res, 200, 'Profile updated successfully', { user: updatedUser });
    }
  } catch (error) {
    // Clean up local file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Delete user profile picture
// @route   DELETE /api/users/profile/picture
// @access  Private
const deleteProfilePicture = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    // Delete from S3 if profile picture exists
    if (user.profilePic) {
      try {
        const key = user.profilePic.split('/').slice(-2).join('/'); // Extract key from URL
        const deleteParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key
        };

        if (DeleteObjectCommand) {
          // AWS SDK v3
          const command = new DeleteObjectCommand(deleteParams);
          await s3Client.send(command);
        } else {
          // AWS SDK v2
          await s3Client.deleteObject(deleteParams).promise();
        }
      } catch (s3Error) {
        console.error('Error deleting from S3:', s3Error);
        // Continue with database update even if S3 deletion fails
      }
    }

    // Update user profile to remove profile picture
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: "" },
      { new: true }
    ).select('-password');

    sendSuccess(res, 200, 'Profile picture deleted successfully', { user: updatedUser });
  } catch (error) {
    next(error);
  }
};

// @desc    Test S3 configuration
// @route   GET /api/users/test-s3
// @access  Private
const testS3 = async (req, res, next) => {
  try {
    console.log('Testing S3 configuration...');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_S3_BUCKET_NAME:', process.env.AWS_S3_BUCKET_NAME);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set');
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set');

    // Test S3 connection
    const testParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: 'test-connection.txt',
      Body: 'Test connection',
      ContentType: 'text/plain'
    };

    let result;
    if (PutObjectCommand) {
      // AWS SDK v3
      const command = new PutObjectCommand(testParams);
      result = await s3Client.send(command);
    } else {
      // AWS SDK v2
      result = await s3Client.upload(testParams).promise();
    }

    console.log('S3 test successful:', result);

    sendSuccess(res, 200, 'S3 configuration test successful', {
      sdkVersion: PutObjectCommand ? 'v3' : 'v2',
      bucket: process.env.AWS_S3_BUCKET_NAME,
      region: process.env.AWS_REGION,
      result: result
    });

  } catch (error) {
    console.error('S3 test failed:', error);
    sendError(res, 500, `S3 test failed: ${error.message}`, 'S3_TEST_FAILED');
  }
};

// @desc    Update user password
// @route   PUT /api/users/update-password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current password and new password are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return sendError(res, 400, 'New password must be at least 6 characters long', 'INVALID_PASSWORD_LENGTH');
    }

    // Find user with password field
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    // Check if current password is correct
    const isPasswordMatch = await user.comparePassword(currentPassword);

    if (!isPasswordMatch) {
      return sendError(res, 401, 'Current password is incorrect', 'INCORRECT_PASSWORD');
    }

    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      return sendError(res, 400, 'New password must be different from current password', 'SAME_PASSWORD');
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    sendSuccess(res, 200, 'Password updated successfully', {
      message: 'Password has been updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's order history (service request history)
// @route   GET /api/users/orders
// @access  Private
const getUserOrderHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, request_type, page = 1, limit = 10 } = req.query;

    // Get authenticated user's email and phone number
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    // Build query to match user's email or phone number
    const query = {
      $or: [
        { user_email: user.email.toLowerCase() },
        { user_phone: user.phoneNumber }
      ]
    };

    // Apply optional filters
    if (status) {
      if (!['Pending', 'Assigned', 'Accepted', 'Completed', 'Cancelled'].includes(status)) {
        return sendError(res, 400, 'Invalid status. Must be Pending, Assigned, Accepted, Completed, or Cancelled', 'INVALID_STATUS');
      }
      query.status = status;
    }

    if (request_type) {
      if (!['Quotation', 'OnTime', 'Scheduled'].includes(request_type)) {
        return sendError(res, 400, 'Invalid request type. Must be Quotation, OnTime, or Scheduled', 'INVALID_REQUEST_TYPE');
      }
      query.request_type = request_type;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute queries in parallel
    const [serviceRequests, totalCount] = await Promise.all([
      ServiceRequest.find(query)
        .populate('service_id', 'name description basePrice unitType timeBasedPricing')
        .populate('category_id', 'name description')
        .populate('vendor', 'firstName lastName email mobileNumber coveredCity')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ServiceRequest.countDocuments(query)
    ]);

    // Transform service requests for response
    const transformedRequests = serviceRequests.map(request => ({
      _id: request._id,
      user_name: request.user_name,
      user_phone: request.user_phone,
      user_email: request.user_email,
      address: request.address,
      service_id: request.service_id,
      service_name: request.service_name,
      category_id: request.category_id,
      category_name: request.category_name,
      request_type: request.request_type,
      requested_date: request.requested_date ? request.requested_date.toISOString() : null,
      message: request.message,
      status: request.status,
      vendor: request.vendor,
      unit_type: request.unit_type,
      unit_price: request.unit_price,
      number_of_units: request.number_of_units,
      total_price: request.total_price,
      selectedSubServices: request.selectedSubServices || [],
      paymentMethod: request.paymentMethod,
      createdAt: request.createdAt ? request.createdAt.toISOString() : null,
      updatedAt: request.updatedAt ? request.updatedAt.toISOString() : null
    }));

    sendSuccess(res, 200, 'Order history retrieved successfully', {
      orders: transformedRequests,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  deleteProfilePicture,
  updatePassword,
  getUserOrderHistory,
  testS3,
  upload
};
