const Banner = require('../models/Banner');
const Service = require('../models/Service');
const mongoose = require('mongoose');
const { sendSuccess, sendError, sendCreated, sendNotFoundError } = require('../utils/response');

// @desc    Create or update a banner (if _id is provided, update; otherwise create)
// @route   POST /api/banner
// @access  Admin only
const createBanner = async (req, res, next) => {
  try {
    const { _id, service, discountPercentage, mediaType, platform } = req.body;
    const isUpdate = _id && mongoose.Types.ObjectId.isValid(_id);

    // Validate required fields
    if (!service) {
      return sendError(res, 400, 'Service is required', 'MISSING_REQUIRED_FIELDS');
    }

    if (!discountPercentage) {
      return sendError(res, 400, 'Discount percentage is required', 'MISSING_REQUIRED_FIELDS');
    }

    if (!mediaType) {
      return sendError(res, 400, 'Media type is required', 'MISSING_REQUIRED_FIELDS');
    }

    // For creation, file is required; for update, file is optional
    if (!isUpdate && !req.file) {
      return sendError(res, 400, 'Media file is required for banner creation', 'MISSING_FILE');
    }

    // Validate discount percentage range
    const discount = parseFloat(discountPercentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      return sendError(res, 400, 'Discount percentage must be between 0 and 100', 'INVALID_DISCOUNT');
    }

    // Validate media type
    if (!['image', 'video'].includes(mediaType)) {
      return sendError(res, 400, 'Media type must be either "image" or "video"', 'INVALID_MEDIA_TYPE');
    }

    // Validate platform array
    let platformArray = ['both'];
    if (platform) {
      if (typeof platform === 'string') {
        platformArray = [platform];
      } else if (Array.isArray(platform)) {
        platformArray = platform;
      }
      
      // Validate platform values
      const validPlatforms = ['mobile', 'web', 'both'];
      const invalidPlatforms = platformArray.filter(p => !validPlatforms.includes(p));
      if (invalidPlatforms.length > 0) {
        return sendError(res, 400, `Invalid platform values: ${invalidPlatforms.join(', ')}`, 'INVALID_PLATFORM');
      }
    }

    // Handle S3 upload if file is provided
    let mediaUrl;
    if (req.file) {
      // Handle S3 upload if using memory storage (AWS SDK v3 fallback)
      if (req.file.location) {
        // File already uploaded via multer-s3 (AWS SDK v2)
        mediaUrl = req.file.location;
      } else if (req.file.buffer) {
        // Upload to S3 manually using AWS SDK v3
        // Try to get upload function from the upload middleware module
        const uploadModule = require('../middlewares/uploadBanner');
        if (uploadModule.uploadToS3) {
          try {
            mediaUrl = await uploadModule.uploadToS3(req.file);
          } catch (uploadError) {
            console.error('S3 upload error:', uploadError);
            return sendError(res, 500, 'Failed to upload file to S3', 'S3_UPLOAD_ERROR');
          }
        } else {
          // Fallback: use existing S3 upload utility
          const { uploadToS3 } = require('../config/s3');
          try {
            mediaUrl = await uploadToS3(req.file);
          } catch (uploadError) {
            console.error('S3 upload error:', uploadError);
            return sendError(res, 500, 'Failed to upload file to S3', 'S3_UPLOAD_ERROR');
          }
        }
      } else {
        return sendError(res, 400, 'File upload failed or S3 configuration missing', 'UPLOAD_ERROR');
      }
    }

    // Validate service exists
    if (!mongoose.Types.ObjectId.isValid(service)) {
      return sendError(res, 400, 'Invalid service ID', 'INVALID_SERVICE_ID');
    }

    const serviceExists = await Service.findById(service);
    if (!serviceExists) {
      return sendError(res, 404, 'Service not found', 'SERVICE_NOT_FOUND');
    }

    // Prepare banner data
    const bannerData = {
      service: service,
      discountPercentage: discount,
      mediaType: mediaType,
      platform: platformArray,
      isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' || req.body.isActive === true : true
    };

    // Add mediaUrl only if file was uploaded
    if (mediaUrl) {
      bannerData.mediaUrl = mediaUrl;
    }

    let banner;

    if (isUpdate) {
      // Update existing banner
      const existingBanner = await Banner.findById(_id);
      if (!existingBanner) {
        return sendNotFoundError(res, 'Banner not found');
      }

      // Keep existing sortOrder for updates (don't change it)
      bannerData.sortOrder = existingBanner.sortOrder;

      banner = await Banner.findByIdAndUpdate(
        _id,
        bannerData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new banner - auto-assign sortOrder
      // Get the highest sortOrder and add 1
      const maxSortOrderBanner = await Banner.findOne()
        .sort({ sortOrder: -1 })
        .select('sortOrder')
        .lean();

      const nextSortOrder = maxSortOrderBanner 
        ? (maxSortOrderBanner.sortOrder || 0) + 1 
        : 0;

      bannerData.sortOrder = nextSortOrder;
      banner = await Banner.create(bannerData);
    }

    // Populate service for response
    await banner.populate('service', 'name description basePrice service_icon');

    const transformedBanner = {
      _id: banner._id,
      service: banner.service,
      discountPercentage: banner.discountPercentage,
      mediaUrl: banner.mediaUrl,
      mediaType: banner.mediaType,
      platform: banner.platform,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      createdAt: banner.createdAt?.toISOString(),
      updatedAt: banner.updatedAt?.toISOString()
    };

    const message = isUpdate 
      ? 'Banner updated successfully' 
      : 'Banner created successfully';
    
    const statusCode = isUpdate ? 200 : 201;
    const responseMethod = isUpdate ? sendSuccess : sendCreated;

    return responseMethod(res, statusCode, message, {
      banner: transformedBanner
    });
  } catch (error) {
    // Clean up uploaded file if banner creation/update fails
    if (req.file && req.file.location) {
      // Note: File is already uploaded to S3, you may want to delete it here
      // For now, we'll just log the error
      console.error('Banner operation failed, file uploaded to:', req.file.location);
    }
    next(error);
  }
};

// @desc    Get all banners
// @route   GET /api/banner
// @access  Public
const getBanners = async (req, res, next) => {
  try {
    const { isActive, platform } = req.query;

    // Build query
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    if (platform) {
      query.platform = { $in: [platform, 'both'] };
    }

    const banners = await Banner.find(query)
      .populate('service', 'name description basePrice service_icon unitType timeBasedPricing')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    const transformedBanners = banners.map(banner => ({
      _id: banner._id,
      service: banner.service,
      discountPercentage: banner.discountPercentage,
      mediaUrl: banner.mediaUrl,
      mediaType: banner.mediaType,
      platform: banner.platform,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      createdAt: banner.createdAt?.toISOString(),
      updatedAt: banner.updatedAt?.toISOString()
    }));

    return sendSuccess(res, 200, 'Banners retrieved successfully', {
      banners: transformedBanners,
      total: transformedBanners.length
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update banner sort order
// @route   PATCH /api/banner/sort-order
// @access  Admin only
const updateSortOrder = async (req, res, next) => {
  try {
    const { bannerId, sortOrder } = req.body;

    // Validate required fields
    if (!bannerId) {
      return sendError(res, 400, 'Banner ID is required', 'MISSING_REQUIRED_FIELDS');
    }

    if (sortOrder === undefined || sortOrder === null) {
      return sendError(res, 400, 'Sort order is required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate banner ID
    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return sendError(res, 400, 'Invalid banner ID', 'INVALID_BANNER_ID');
    }

    // Validate sort order is a number
    const order = parseInt(sortOrder);
    if (isNaN(order)) {
      return sendError(res, 400, 'Sort order must be a number', 'INVALID_SORT_ORDER');
    }

    // Find and update banner
    const banner = await Banner.findByIdAndUpdate(
      bannerId,
      { sortOrder: order },
      { new: true, runValidators: true }
    )
      .populate('service', 'name description basePrice service_icon');

    if (!banner) {
      return sendNotFoundError(res, 'Banner not found');
    }

    const transformedBanner = {
      _id: banner._id,
      service: banner.service,
      discountPercentage: banner.discountPercentage,
      mediaUrl: banner.mediaUrl,
      mediaType: banner.mediaType,
      platform: banner.platform,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      createdAt: banner.createdAt?.toISOString(),
      updatedAt: banner.updatedAt?.toISOString()
    };

    return sendSuccess(res, 200, 'Banner sort order updated successfully', {
      banner: transformedBanner
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a banner
// @route   DELETE /api/banner/:bannerId
// @access  Admin only
const deleteBanner = async (req, res, next) => {
  try {
    const { bannerId } = req.params;

    // Validate banner ID
    if (!mongoose.Types.ObjectId.isValid(bannerId)) {
      return sendError(res, 400, 'Invalid banner ID', 'INVALID_BANNER_ID');
    }

    // Find banner before deletion (to get mediaUrl for potential S3 cleanup)
    const banner = await Banner.findById(bannerId);

    if (!banner) {
      return sendNotFoundError(res, 'Banner not found');
    }

    // Delete banner
    await Banner.findByIdAndDelete(bannerId);

    // Note: You may want to delete the file from S3 here
    // For now, we'll just log the mediaUrl
    console.log('Banner deleted, media URL was:', banner.mediaUrl);

    return sendSuccess(res, 200, 'Banner deleted successfully', null);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBanner,
  getBanners,
  updateSortOrder,
  deleteBanner
};

