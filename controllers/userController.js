const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Configure AWS S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }
    
    sendSuccess(res, 200, 'User profile retrieved successfully', { user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }
    
    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    // Handle profile picture upload if provided
    if (req.file) {
      try {
        // Upload to S3
        const fileContent = fs.readFileSync(req.file.path);
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `profile-pictures/${userId}/${req.file.filename}`,
          Body: fileContent,
          ContentType: req.file.mimetype,
          ACL: 'public-read'
        };
        
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        
        // Construct the S3 URL
        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/profile-pictures/${userId}/${req.file.filename}`;
        updateData.profilePic = s3Url;
        
        // Delete local file after S3 upload
        fs.unlinkSync(req.file.path);
      } catch (s3Error) {
        // Clean up local file if S3 upload fails
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return sendError(res, 500, 'Failed to upload profile picture', 'S3_UPLOAD_FAILED');
      }
    }
    
    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    sendSuccess(res, 200, 'Profile updated successfully', { user: updatedUser });
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
        const command = new DeleteObjectCommand(deleteParams);
        await s3Client.send(command);
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

module.exports = {
  getProfile,
  updateProfile,
  deleteProfilePicture,
  upload
};
