const Video = require('../models/Video');
const mongoose = require('mongoose');
const { sendSuccess, sendError, sendCreated, sendNotFoundError } = require('../utils/response');
const { createS3Client, getCredentials } = require('../config/s3-final');
const { Upload } = require('@aws-sdk/lib-storage');

// Helper function to determine media type from mimetype
const getMediaType = (mimeType) => {
  if (!mimeType) return 'unknown';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'unknown';
};

// @desc    Create or update a video (if _id is provided, update; otherwise create)
// @route   POST /api/admin/videos
// @access  Admin only
const createVideo = async (req, res, next) => {
  try {
    const { _id, key, title, description, isActive } = req.body;
    const isUpdate = _id && mongoose.Types.ObjectId.isValid(_id);

    // Validate required fields
    if (!key) {
      return sendError(res, 400, 'Key is required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate key format (lowercase, alphanumeric and hyphens/underscores)
    const keyRegex = /^[a-z0-9_-]+$/;
    if (!keyRegex.test(key.trim().toLowerCase())) {
      return sendError(res, 400, 'Key must contain only lowercase letters, numbers, hyphens, and underscores', 'INVALID_KEY_FORMAT');
    }

    // For creation, video file is required; for update, video file is optional
    if (!isUpdate && !req.file) {
      return sendError(res, 400, 'Video file is required for video creation', 'MISSING_FILE');
    }

    // Check if key already exists (for new videos or when updating key)
    const normalizedKey = key.trim().toLowerCase();
    const existingVideoWithKey = await Video.findOne({ key: normalizedKey });
    
    if (existingVideoWithKey) {
      // If updating, allow if it's the same video
      if (isUpdate && existingVideoWithKey._id.toString() === _id) {
        // Same video, key unchanged - OK
      } else {
        // Different video with same key - conflict
        return sendError(res, 400, `A video with key "${normalizedKey}" already exists`, 'DUPLICATE_KEY');
      }
    }

    // Handle S3 upload if video file is provided
    let videoUri;
    let mimeType;
    if (req.file) {
      try {
        const s3Client = createS3Client();
        const credentials = getCredentials();
        
        // Store mimetype
        mimeType = req.file.mimetype;
        
        // Generate unique key with timestamp and original filename for videos folder
        const timestamp = Date.now();
        const fileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
        const key = `videos/${timestamp}-${fileName}`;

        console.log('Uploading media to S3:', {
          bucket: credentials.bucketName,
          key: key,
          region: credentials.region,
          fileSize: req.file.buffer.length,
          mimeType: mimeType
        });

        // Upload file to S3
        const upload = new Upload({
          client: s3Client,
          params: {
            Bucket: credentials.bucketName,
            Key: key,
            Body: req.file.buffer,
            ContentType: mimeType,
          },
        });

        const result = await upload.done();
        videoUri = result.Location;
        
        console.log('Media S3 Upload successful:', videoUri);
      } catch (uploadError) {
        console.error('S3 Upload Error Details:', {
          name: uploadError.name,
          message: uploadError.message,
          code: uploadError.$metadata?.httpStatusCode,
          requestId: uploadError.$metadata?.requestId
        });
        
        // Handle specific AWS errors with detailed messages
        if (uploadError.name === 'CredentialsProviderError' || uploadError.name === 'InvalidUserID.NotFound') {
          return sendError(res, 500, 'AWS credentials are invalid. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.', 'S3_UPLOAD_ERROR');
        } else if (uploadError.name === 'NoSuchBucket') {
          return sendError(res, 500, `S3 bucket '${process.env.AWS_S3_BUCKET_NAME}' does not exist. Please create the bucket or check the bucket name.`, 'S3_UPLOAD_ERROR');
        } else if (uploadError.name === 'AccessDenied') {
          return sendError(res, 500, 'Access denied to S3 bucket. Please check your IAM user permissions for S3 access.', 'S3_UPLOAD_ERROR');
        } else if (uploadError.name === 'InvalidAccessKeyId') {
          return sendError(res, 500, 'Invalid AWS Access Key ID. Please check your AWS_ACCESS_KEY_ID in your .env file.', 'S3_UPLOAD_ERROR');
        } else if (uploadError.name === 'SignatureDoesNotMatch') {
          return sendError(res, 500, 'Invalid AWS Secret Access Key. Please check your AWS_SECRET_ACCESS_KEY in your .env file.', 'S3_UPLOAD_ERROR');
        } else if (uploadError.name === 'TokenRefreshRequired') {
          return sendError(res, 500, 'AWS credentials have expired. Please refresh your credentials.', 'S3_UPLOAD_ERROR');
        } else if (uploadError.message && uploadError.message.includes('Resolved credential object is not valid')) {
          return sendError(res, 500, 'AWS credentials are not properly configured. Please check your .env file and ensure all AWS variables are set correctly.', 'S3_UPLOAD_ERROR');
        }
        
        // Generic error
        const errorMessage = uploadError.message || 'Failed to upload file to S3';
        return sendError(res, 500, `Failed to upload file to S3: ${errorMessage}`, 'S3_UPLOAD_ERROR');
      }
    }

    // Prepare video data
    const videoData = {
      key: normalizedKey,
      title: title ? title.trim() : undefined,
      description: description ? description.trim() : undefined,
      isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true
    };

    // Add videoUri and mimeType only if file was uploaded
    if (videoUri) {
      videoData.videoUri = videoUri;
      videoData.mimeType = mimeType;
    }

    // Add createdBy for new videos
    if (!isUpdate) {
      videoData.createdBy = req.user.id;
    }

    let video;

    if (isUpdate) {
      // Update existing video
      const existingVideo = await Video.findById(_id);
      if (!existingVideo) {
        return sendNotFoundError(res, 'Video not found');
      }

      video = await Video.findByIdAndUpdate(
        _id,
        videoData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new video
      video = await Video.create(videoData);
    }

    // Populate createdBy for response
    await video.populate('createdBy', 'name email');

    const transformedVideo = {
      _id: video._id,
      key: video.key,
      videoUri: video.videoUri,
      mimeType: video.mimeType || null,
      type: getMediaType(video.mimeType),
      title: video.title || null,
      description: video.description || null,
      isActive: video.isActive,
      createdBy: video.createdBy,
      createdAt: video.createdAt?.toISOString(),
      updatedAt: video.updatedAt?.toISOString()
    };

    const message = isUpdate 
      ? 'Media updated successfully' 
      : 'Media created successfully';
    
    const statusCode = isUpdate ? 200 : 201;
    const responseMethod = isUpdate ? sendSuccess : sendCreated;

    return responseMethod(res, statusCode, message, {
      video: transformedVideo
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return sendError(res, 400, 'A video with this key already exists', 'DUPLICATE_KEY');
    }
    next(error);
  }
};

// @desc    Get all videos (Admin only)
// @route   GET /api/admin/videos
// @access  Admin only
const getAllVideos = async (req, res, next) => {
  try {
    const { isActive } = req.query;

    // Build query
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    const videos = await Video.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const transformedVideos = videos.map(video => ({
      _id: video._id,
      key: video.key,
      videoUri: video.videoUri,
      mimeType: video.mimeType || null,
      type: getMediaType(video.mimeType),
      title: video.title || null,
      description: video.description || null,
      isActive: video.isActive,
      createdBy: video.createdBy,
      createdAt: video.createdAt?.toISOString(),
      updatedAt: video.updatedAt?.toISOString()
    }));

    return sendSuccess(res, 200, 'Media retrieved successfully', {
      videos: transformedVideos,
      total: transformedVideos.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get video by key (Public endpoint for customers)
// @route   GET /api/videos/:key
// @access  Public
const getVideoByKey = async (req, res, next) => {
  try {
    const { key } = req.params;

    if (!key) {
      return sendError(res, 400, 'Video key is required', 'MISSING_KEY');
    }

    const normalizedKey = key.trim().toLowerCase();

    const video = await Video.findOne({ 
      key: normalizedKey,
      isActive: true 
    })
      .populate('createdBy', 'name email')
      .lean();

    if (!video) {
      return sendNotFoundError(res, 'Video not found');
    }

    const transformedVideo = {
      _id: video._id,
      key: video.key,
      videoUri: video.videoUri,
      mimeType: video.mimeType || null,
      type: getMediaType(video.mimeType),
      title: video.title || null,
      description: video.description || null,
      isActive: video.isActive,
      createdBy: video.createdBy,
      createdAt: video.createdAt?.toISOString(),
      updatedAt: video.updatedAt?.toISOString()
    };

    return sendSuccess(res, 200, 'Media retrieved successfully', {
      video: transformedVideo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get video by ID (Admin only)
// @route   GET /api/admin/videos/:id
// @access  Admin only
const getVideoById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid video ID', 'INVALID_VIDEO_ID');
    }

    const video = await Video.findById(id)
      .populate('createdBy', 'name email')
      .lean();

    if (!video) {
      return sendNotFoundError(res, 'Video not found');
    }

    const transformedVideo = {
      _id: video._id,
      key: video.key,
      videoUri: video.videoUri,
      mimeType: video.mimeType || null,
      type: getMediaType(video.mimeType),
      title: video.title || null,
      description: video.description || null,
      isActive: video.isActive,
      createdBy: video.createdBy,
      createdAt: video.createdAt?.toISOString(),
      updatedAt: video.updatedAt?.toISOString()
    };

    return sendSuccess(res, 200, 'Media retrieved successfully', {
      video: transformedVideo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a video
// @route   DELETE /api/admin/videos/:id
// @access  Admin only
const deleteVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate video ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid video ID', 'INVALID_VIDEO_ID');
    }

    // Find video before deletion (to get videoUri for potential S3 cleanup)
    const video = await Video.findById(id);

    if (!video) {
      return sendNotFoundError(res, 'Video not found');
    }

    // Delete video
    await Video.findByIdAndDelete(id);

    // Note: You may want to delete the file from S3 here
    // For now, we'll just log the videoUri
    console.log('Video deleted, video URI was:', video.videoUri);

    return sendSuccess(res, 200, 'Video deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVideo,
  getAllVideos,
  getVideoByKey,
  getVideoById,
  deleteVideo
};

