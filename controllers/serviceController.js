const Service = require('../models/Service');
const Category = require('../models/Category');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');
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
  console.log('Using AWS SDK v3 for services');
} catch (error) {
  console.log('AWS SDK v3 not available for services, trying v2...');
  try {
    const AWS = require('aws-sdk');
    s3Client = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    console.log('Using AWS SDK v2 for services');
  } catch (v2Error) {
    console.error('AWS SDK not available for services:', v2Error);
  }
}

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for service image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'service-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
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

// @desc    Create a new service
// @route   POST /api/services
// @access  Admin only
const createService = async (req, res, next) => {
  try {
    const { 
      name, 
      description, 
      basePrice, 
      unitType,
      category_id,
      min_time_required,
      availability,
      job_service_type,
      order_name,
      price_type,
      subservice_type
    } = req.body;

    // Validate required fields
    if (!name || !basePrice || !unitType || !category_id || !min_time_required || !availability || !job_service_type) {
      return sendError(res, 400, 'Name, basePrice, unitType, category_id, min_time_required, availability, and job_service_type are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate unitType
    if (!['per_unit', 'per_hour'].includes(unitType)) {
      return sendError(res, 400, 'unitType must be either "per_unit" or "per_hour"', 'INVALID_UNIT_TYPE');
    }

    // Validate basePrice
    if (basePrice <= 0) {
      return sendError(res, 400, 'basePrice must be greater than 0', 'INVALID_BASE_PRICE');
    }

    // Validate category exists
    const category = await Category.findById(category_id);
    if (!category || !category.isActive) {
      return sendError(res, 400, 'Invalid or inactive category', 'INVALID_CATEGORY');
    }

    // Validate job_service_type
    if (!['OnTime', 'Scheduled', 'Quotation'].includes(job_service_type)) {
      return sendError(res, 400, 'job_service_type must be OnTime, Scheduled, or Quotation', 'INVALID_JOB_SERVICE_TYPE');
    }

    // Validate availability
    const validDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const availabilityArray = Array.isArray(availability) ? availability : [availability];
    if (!availabilityArray.every(day => validDays.includes(day))) {
      return sendError(res, 400, 'Invalid availability days. Must be Sun, Mon, Tue, Wed, Thu, Fri, or Sat', 'INVALID_AVAILABILITY');
    }

    // Conditional validation based on job_service_type
    if (job_service_type === 'Quotation') {
      if (!order_name || order_name.trim().length === 0) {
        return sendError(res, 400, 'Order name is required for Quotation services', 'MISSING_ORDER_NAME');
      }
    } else {
      if (!price_type || !['30min', '1hr', '1day', 'fixed'].includes(price_type)) {
        return sendError(res, 400, 'price_type is required and must be 30min, 1hr, 1day, or fixed', 'INVALID_PRICE_TYPE');
      }
      if (!subservice_type || !['single', 'multiple'].includes(subservice_type)) {
        return sendError(res, 400, 'subservice_type is required and must be single or multiple', 'INVALID_SUBSERVICE_TYPE');
      }
    }

    const serviceData = {
      name,
      description,
      basePrice: parseFloat(basePrice),
      unitType,
      category_id,
      min_time_required: parseInt(min_time_required),
      availability: availabilityArray,
      job_service_type,
      createdBy: req.user.id
    };

    // Add conditional fields
    if (job_service_type === 'Quotation') {
      serviceData.order_name = order_name.trim();
    } else {
      serviceData.price_type = price_type;
      serviceData.subservice_type = subservice_type;
    }

    // Handle service image upload if provided
    if (req.file) {
      try {
        console.log('Starting service image upload...');
        console.log('File path:', req.file.path);
        console.log('File size:', req.file.size);
        console.log('File mimetype:', req.file.mimetype);
        
        // Upload to S3
        const fileContent = fs.readFileSync(req.file.path);
        const key = `service-images/${req.user.id}/${req.file.filename}`;
        
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: req.file.mimetype
        };
        
        console.log('Service upload params:', {
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
        
        console.log('Service S3 upload result:', result);
        
        // Construct the S3 URL
        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
        serviceData.imageUri = s3Url;
        serviceData.service_icon = s3Url;
        
        console.log('Service S3 URL generated:', s3Url);
        
        // Delete local file after S3 upload
        fs.unlinkSync(req.file.path);
        console.log('Service local file deleted successfully');
        
      } catch (s3Error) {
        console.error('Service S3 upload error:', s3Error);
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
        return sendError(res, 500, `Failed to upload service image: ${s3Error.message}`, 'S3_UPLOAD_FAILED');
      }
    }

    const service = await Service.create(serviceData);

    sendCreated(res, 'Service created successfully', service);
  } catch (error) {
    // Clean up local file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Get all active services
// @route   GET /api/services
// @access  All users
const getServices = async (req, res, next) => {
  try {
    const services = await Service.find({ isActive: true })
      .populate('createdBy', 'name email')
      .populate('category_id', 'name')
      .sort({ createdAt: -1 });

    sendSuccess(res, 200, 'Services retrieved successfully', services);
  } catch (error) {
    next(error);
  }
};

// @desc    Get services with pagination and optional category filter
// @route   POST /api/services/paginated
// @access  All users
const getServicesPaginated = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category_id, 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.body;

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1) {
      return sendError(res, 400, 'Page number must be greater than 0', 'INVALID_PAGE');
    }
    
    if (limitNum < 1 || limitNum > 100) {
      return sendError(res, 400, 'Limit must be between 1 and 100', 'INVALID_LIMIT');
    }

    // Build query
    const query = { isActive: true };
    if (category_id) {
      // Validate category_id if provided
      const category = await Category.findById(category_id);
      if (!category || !category.isActive) {
        return sendError(res, 400, 'Invalid or inactive category', 'INVALID_CATEGORY');
      }
      query.category_id = category_id;
    }

    // Calculate skip value
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute queries in parallel
    const [services, totalCount] = await Promise.all([
      Service.find(query)
        .populate('createdBy', 'name email')
        .populate('category_id', 'name description')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Service.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Transform services to match frontend interface
    const transformedServices = services.map(service => ({
      _id: service._id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      unitType: service.unitType,
      imageUri: service.imageUri,
      service_icon: service.service_icon,
      category_id: service.category_id,
      min_time_required: service.min_time_required,
      availability: service.availability,
      job_service_type: service.job_service_type,
      order_name: service.order_name,
      price_type: service.price_type,
      subservice_type: service.subservice_type,
      isActive: service.isActive,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString()
    }));

    const response = {
      success: true,
      exception: null,
      description: 'Services retrieved successfully',
      content: {
        services: transformedServices,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createService,
  getServices,
  getServicesPaginated,
  upload
};
