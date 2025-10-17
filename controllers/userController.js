const User = require('../models/User');
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
// @route   POST /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }
    
    // Prepare update data - only name and profilePic allowed
    const updateData = {};
    if (name) updateData.name = name;
    
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

module.exports = {
  getProfile,
  updateProfile,
  deleteProfilePicture,
  testS3,
  upload
};
