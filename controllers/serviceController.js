const Service = require('../models/Service');
const Category = require('../models/Category');
const mongoose = require('mongoose');
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

// @desc    Create or update a service
// @route   POST /api/services
// @access  Admin only
const createService = async (req, res, next) => {
  try {
    const { 
      _id,
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
      subservice_type,
      isFeatured,
      timeBasedPricing,
      subServices
    } = req.body;

    // Check if this is an update operation
    let existingService = null;
    if (_id) {
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        return sendError(res, 400, 'Invalid service ID format', 'INVALID_SERVICE_ID');
      }
      existingService = await Service.findById(_id);
      if (!existingService) {
        return sendError(res, 404, 'Service not found', 'SERVICE_NOT_FOUND');
      }
    }

    // Validate required fields - basePrice is not required for Quotation services
    if (!name || !category_id || !min_time_required || !availability || !job_service_type) {
      return sendError(res, 400, 'Name, category_id, min_time_required, availability, and job_service_type are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate unitType requirements based on job_service_type
    if (job_service_type !== 'Quotation' && (!unitType || unitType.trim().length === 0)) {
      return sendError(res, 400, 'unitType is required for OnTime and Scheduled services', 'MISSING_UNIT_TYPE');
    }

    if (unitType && !['per_unit', 'per_hour'].includes(unitType)) {
      return sendError(res, 400, 'unitType must be either "per_unit" or "per_hour"', 'INVALID_UNIT_TYPE');
    }

    // Validate pricing inputs
    let parsedTimeBasedPricing = [];

    if (unitType === 'per_hour') {
      if (timeBasedPricing === undefined || timeBasedPricing === null || timeBasedPricing === '') {
        return sendError(res, 400, 'timeBasedPricing is required for per_hour services', 'MISSING_TIME_BASED_PRICING');
      }

      if (timeBasedPricing !== undefined && timeBasedPricing !== null && timeBasedPricing !== '') {
        try {
          const rawValue = typeof timeBasedPricing === 'string' ? JSON.parse(timeBasedPricing) : timeBasedPricing;

          if (!Array.isArray(rawValue) || rawValue.length === 0) {
            return sendError(res, 400, 'timeBasedPricing must be a non-empty array for per_hour services', 'INVALID_TIME_BASED_PRICING');
          }

          parsedTimeBasedPricing = rawValue.map((tier) => {
            if (!tier || typeof tier !== 'object') {
              throw new Error('Each pricing tier must be an object with hours and price');
            }

            const hours = Number(tier.hours);
            const price = Number(tier.price);

            if (!Number.isFinite(hours) || hours < 1) {
              throw new Error('Each pricing tier must include hours greater than or equal to 1');
            }

            if (!Number.isFinite(price) || price < 0) {
              throw new Error('Each pricing tier must include a non-negative price');
            }

            return { hours, price };
          }).sort((a, b) => a.hours - b.hours);
        } catch (error) {
          return sendError(res, 400, error.message || 'Invalid timeBasedPricing format', 'INVALID_TIME_BASED_PRICING');
        }
      }
    } else {
      // Non per_hour services rely on basePrice
      if (job_service_type !== 'Quotation' && (!basePrice || Number(basePrice) <= 0)) {
        return sendError(res, 400, 'basePrice is required and must be greater than 0 for OnTime and Scheduled services', 'INVALID_BASE_PRICE');
      }

      if (basePrice !== undefined && basePrice !== null && Number(basePrice) <= 0) {
        return sendError(res, 400, 'basePrice must be greater than 0 if provided', 'INVALID_BASE_PRICE');
      }

      if (timeBasedPricing !== undefined && timeBasedPricing !== null && timeBasedPricing !== '') {
        try {
          const rawValue = typeof timeBasedPricing === 'string' ? JSON.parse(timeBasedPricing) : timeBasedPricing;

          if (!Array.isArray(rawValue)) {
            throw new Error('timeBasedPricing must be an array when provided');
          }

          parsedTimeBasedPricing = rawValue.map((tier) => {
            if (!tier || typeof tier !== 'object') {
              throw new Error('Each pricing tier must be an object with hours and price');
            }

            const hours = Number(tier.hours);
            const price = Number(tier.price);

            if (!Number.isFinite(hours) || hours < 1) {
              throw new Error('Each pricing tier must include hours greater than or equal to 1');
            }

            if (!Number.isFinite(price) || price < 0) {
              throw new Error('Each pricing tier must include a non-negative price');
            }

            return { hours, price };
          }).sort((a, b) => a.hours - b.hours);
        } catch (error) {
          return sendError(res, 400, error.message || 'Invalid timeBasedPricing format', 'INVALID_TIME_BASED_PRICING');
        }
      }
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
      category_id,
      min_time_required: parseInt(min_time_required),
      availability: availabilityArray,
      job_service_type
    };

    // Only include description if provided
    if (description !== undefined && description !== null) {
      serviceData.description = description;
    }

    // Only set createdBy for new services
    if (!existingService) {
      serviceData.createdBy = req.user.id;
    }

    if (unitType) {
      serviceData.unitType = unitType;
    }

    if (unitType === 'per_hour') {
      delete serviceData.basePrice;
    } else if (basePrice !== undefined && basePrice !== null && basePrice !== '') {
      serviceData.basePrice = parseFloat(basePrice);
    }

    // Add conditional fields
    if (job_service_type === 'Quotation') {
      serviceData.order_name = order_name.trim();
    } else {
      serviceData.price_type = price_type;
      serviceData.subservice_type = subservice_type;
    }

    if (parsedTimeBasedPricing.length > 0) {
      serviceData.timeBasedPricing = parsedTimeBasedPricing;
    } else if (unitType === 'per_hour') {
      serviceData.timeBasedPricing = [];
    }

    if (typeof isFeatured !== 'undefined') {
      if (typeof isFeatured === 'string') {
        serviceData.isFeatured = isFeatured.toLowerCase() === 'true';
      } else {
        serviceData.isFeatured = Boolean(isFeatured);
      }
    }

    // Handle subServices array (optional nested sub-services)
    if (subServices !== undefined && subServices !== null) {
      // Parse subServices if it's a JSON string (from multipart/form-data)
      let parsedSubServices;
      try {
        parsedSubServices = typeof subServices === 'string' ? JSON.parse(subServices) : subServices;
      } catch (parseError) {
        return sendError(res, 400, 'subServices must be a valid JSON array', 'INVALID_SUBSERVICES');
      }
      
      if (!Array.isArray(parsedSubServices)) {
        return sendError(res, 400, 'subServices must be an array', 'INVALID_SUBSERVICES');
      }
      
      // Validate each sub-service
      for (const subService of parsedSubServices) {
        if (!subService.name || subService.name.trim().length === 0) {
          return sendError(res, 400, 'Each sub-service must have a name', 'INVALID_SUBSERVICE_NAME');
        }
        if (subService.rate === undefined || subService.rate === null || subService.rate < 0) {
          return sendError(res, 400, 'Each sub-service must have a non-negative rate', 'INVALID_SUBSERVICE_RATE');
        }
        if (subService.items !== undefined && subService.items < 1) {
          return sendError(res, 400, 'Sub-service items must be at least 1', 'INVALID_SUBSERVICE_ITEMS');
        }
        if (subService.max !== undefined && subService.max < 1) {
          return sendError(res, 400, 'Sub-service max must be at least 1', 'INVALID_SUBSERVICE_MAX');
        }
      }
      
      serviceData.subServices = parsedSubServices.map(sub => ({
        name: sub.name.trim(),
        items: sub.items !== undefined ? parseInt(sub.items) : 1,
        rate: parseFloat(sub.rate),
        max: sub.max !== undefined ? parseInt(sub.max) : 1
      }));
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

    let service;
    if (existingService) {
      // Update existing service
      service = await Service.findByIdAndUpdate(
        _id,
        serviceData,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email')
       .populate('category_id', 'name description');
      
      sendSuccess(res, 200, 'Service updated successfully', service);
    } else {
      // Create new service
      service = await Service.create(serviceData);
      sendCreated(res, 'Service created successfully', service);
    }
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
    const { category } = req.query;
    
    // Build query
    const query = { isActive: true };
    
    // Add category filter if provided
    if (category) {
      // Validate category_id if provided
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc || !categoryDoc.isActive) {
        return sendError(res, 400, 'Invalid or inactive category', 'INVALID_CATEGORY');
      }
      query.category_id = category;
    }

    const services = await Service.find(query)
      .populate('createdBy', 'name email')
      .populate('category_id', 'name description')
      .sort({ createdAt: -1 });

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
      timeBasedPricing: service.timeBasedPricing || [],
      isFeatured: service.isFeatured,
      subServices: service.subServices || [],
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
        total: transformedServices.length
      }
    };

    res.status(200).json(response);
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
      timeBasedPricing: service.timeBasedPricing || [],
      isFeatured: service.isFeatured,
      subServices: service.subServices || [],
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

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  All users
const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id)
      .populate('createdBy', 'name email')
      .populate('category_id', 'name description');

    if (!service || !service.isActive) {
      return sendError(res, 404, 'Service not found', 'SERVICE_NOT_FOUND');
    }

    // Transform service to match frontend interface
    const transformedService = {
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
      timeBasedPricing: service.timeBasedPricing || [],
      isFeatured: service.isFeatured,
      subServices: service.subServices || [],
      isActive: service.isActive,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString()
    };

    // Ensure subServices is always an array (for backward compatibility)
    if (!transformedService.subServices || !Array.isArray(transformedService.subServices)) {
      transformedService.subServices = [];
    }

    const response = {
      success: true,
      exception: null,
      description: 'Service retrieved successfully',
      content: {
        service: transformedService
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service (Admin only)
// @route   DELETE /api/services/:id
// @access  Admin only
const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id);

    if (!service) {
      return sendError(res, 404, 'Service not found', 'SERVICE_NOT_FOUND');
    }

    // Check if service is being used by any service requests
    const ServiceRequest = require('../models/ServiceRequest');
    const requestsUsingService = await ServiceRequest.countDocuments({ service_id: id });

    if (requestsUsingService > 0) {
      return sendError(res, 400, `Cannot delete service. It is being used by ${requestsUsingService} service request(s)`, 'SERVICE_IN_USE');
    }

    // Soft delete by setting isActive to false
    await Service.findByIdAndUpdate(id, { isActive: false });

    const response = {
      success: true,
      exception: null,
      description: 'Service deleted successfully',
      content: {
        service: {
          _id: service._id,
          name: service.name,
          isActive: false
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active services (Public endpoint)
// @route   GET /api/services/active
// @access  Public
const getAllActiveServices = async (req, res, next) => {
  try {
    const services = await Service.find({ isActive: true })
      .populate('createdBy', 'name email')
      .populate('category_id', 'name description')
      .sort({ createdAt: -1 });

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
      timeBasedPricing: service.timeBasedPricing || [],
      subServices: service.subServices || [],
      isActive: service.isActive,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString()
    }));

    const response = {
      success: true,
      exception: null,
      description: 'All active services retrieved successfully',
      content: {
        services: transformedServices,
        total: transformedServices.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get sub-services for a specific service
// @route   GET /api/services/:id/sub-services
// @access  All users
const getServiceSubServices = async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await Service.findById(id)
      .populate('category_id', 'name description');

    if (!service || !service.isActive) {
      return sendError(res, 404, 'Service not found', 'SERVICE_NOT_FOUND');
    }

    // Return the subServices array from the service
    const response = {
      success: true,
      exception: null,
      description: 'Sub-services retrieved successfully',
      content: {
        serviceId: service._id,
        serviceName: service.name,
        subServices: service.subServices || []
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
  getServiceById,
  deleteService,
  getAllActiveServices,
  getServiceSubServices,
  // New: Get only services of the "INTERIOR RENOVATION" category (public)
  getHomeCategoryServices: async (req, res, next) => {
    try {
      // Find the "INTERIOR RENOVATION" category
      const category = await Category.findOne({
        name: { $regex: /^INTERIOR RENOVATION$/i },
        isActive: true
      });

      if (!category) {
        return sendSuccess(res, 200, 'INTERIOR RENOVATION category not found', []);
      }

      const services = await Service.find({ category_id: category._id, isActive: true })
        .sort({ createdAt: -1 })
        .select({ _id: 1, name: 1, service_icon: 1, basePrice: 1, unitType: 1, timeBasedPricing: 1 })
        .lean();

      const result = services.map(svc => {
        const tiers = Array.isArray(svc.timeBasedPricing) ? svc.timeBasedPricing : [];
        const perHourPrice = svc.unitType === 'per_hour' && tiers.length > 0
          ? tiers.reduce((min, tier) => {
            if (!tier || typeof tier.price !== 'number') return min;
            if (min === null || tier.price < min) {
              return tier.price;
            }
            return min;
          }, null)
          : null;

        return {
          id: svc._id,
          name: svc.name,
          icon: svc.service_icon || null,
          price: perHourPrice !== null ? perHourPrice : svc.basePrice,
          unitType: svc.unitType,
          timeBasedPricing: tiers
        };
      });

      return sendSuccess(res, 200, 'INTERIOR RENOVATION category services retrieved successfully', result);
    } catch (error) {
      next(error);
    }
  },
  upload
};
