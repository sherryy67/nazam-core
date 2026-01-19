const Service = require("../models/Service");
const Category = require("../models/Category");
const Banner = require("../models/Banner");
const mongoose = require("mongoose");
const { sendSuccess, sendError, sendCreated } = require("../utils/response");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Try to use AWS SDK v3, fallback to v2 if needed
let s3Client, PutObjectCommand, DeleteObjectCommand;

try {
  const awsS3 = require("@aws-sdk/client-s3");
  s3Client = new awsS3.S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  PutObjectCommand = awsS3.PutObjectCommand;
  DeleteObjectCommand = awsS3.DeleteObjectCommand;
  console.log("Using AWS SDK v3 for services");
} catch (error) {
  console.log("AWS SDK v3 not available for services, trying v2...");
  try {
    const AWS = require("aws-sdk");
    s3Client = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || "us-east-1",
    });
    console.log("Using AWS SDK v2 for services");
  } catch (v2Error) {
    console.error("AWS SDK not available for services:", v2Error);
  }
}

// Ensure uploads directory exists
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for service image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "service-" +
        file.fieldname +
        "-" +
        uniqueSuffix +
        path.extname(file.originalname)
    );
  },
});

// Update multer fileFilter to allow images and videos for thumbnail
const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
const allowedVideoTypes = /mp4|mov|avi|wmv|webm|mkv/;
const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
  "video/webm",
  "video/x-matroska",
];

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow serviceImage, thumbnail, service_icon, and thumbnailUri file fields
    const allowedFieldNames = [
      "serviceImage",
      "thumbnail",
      "service_icon",
      "thumbnailUri",
    ];
    if (!allowedFieldNames.includes(file.fieldname)) {
      return cb(
        new Error(
          `Unexpected file field: ${
            file.fieldname
          }. Allowed fields: ${allowedFieldNames.join(", ")}`
        )
      );
    }

    const extname =
      allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
      allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Only image (JPEG, JPG, PNG, GIF, WebP) and video (MP4, MOV, AVI, WMV, WebM, MKV) files are allowed"
        )
      );
    }
  },
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
      availability,
      job_service_type,
      price_type,
      subservice_type,
      isFeatured,
      timeBasedPricing,
      subServices,
      serviceType,
      badge,
      termsCondition,
      service_icon,
      thumbnailUri,
      minAdvanceHours,
      isSubservice,
    } = req.body;

    // Check if this is an update operation
    let existingService = null;
    if (_id) {
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        return sendError(
          res,
          400,
          "Invalid service ID format",
          "INVALID_SERVICE_ID"
        );
      }
      existingService = await Service.findById(_id);
      if (!existingService) {
        return sendError(res, 404, "Service not found", "SERVICE_NOT_FOUND");
      }
    }

    // Validate required fields - basePrice is not required for Quotation services
    // For new services, serviceType is required. For updates, use existing value if not provided
    if (
      !name ||
      !category_id ||
      !availability ||
      !job_service_type
    ) {
      return sendError(
        res,
        400,
        "Name, category_id, availability, and job_service_type are required",
        "MISSING_REQUIRED_FIELDS"
      );
    }

    // Handle serviceType - has default value "residential" in model, but validate if provided
    let finalServiceType = serviceType;

    if (existingService && !serviceType) {
      // Use existing serviceType if not provided in update
      finalServiceType = existingService.serviceType || "residential";
    } else if (!serviceType) {
      // Use default for new services if not provided
      finalServiceType = "residential";
    }

    // Validate serviceType if provided
    if (
      finalServiceType &&
      !["residential", "commercial"].includes(finalServiceType)
    ) {
      return sendError(
        res,
        400,
        'serviceType must be either "residential" or "commercial"',
        "INVALID_SERVICE_TYPE"
      );
    }

    // Validate unitType requirements based on job_service_type
    if (
      job_service_type !== "Quotation" &&
      (!unitType || unitType.trim().length === 0)
    ) {
      return sendError(
        res,
        400,
        "unitType is required for OnTime and Scheduled services",
        "MISSING_UNIT_TYPE"
      );
    }

    if (unitType && !["per_unit", "per_hour"].includes(unitType)) {
      return sendError(
        res,
        400,
        'unitType must be either "per_unit" or "per_hour"',
        "INVALID_UNIT_TYPE"
      );
    }

    // Validate pricing inputs
    let parsedTimeBasedPricing = [];

    if (unitType === "per_hour") {
      if (
        timeBasedPricing === undefined ||
        timeBasedPricing === null ||
        timeBasedPricing === ""
      ) {
        return sendError(
          res,
          400,
          "timeBasedPricing is required for per_hour services",
          "MISSING_TIME_BASED_PRICING"
        );
      }

      if (
        timeBasedPricing !== undefined &&
        timeBasedPricing !== null &&
        timeBasedPricing !== ""
      ) {
        try {
          const rawValue =
            typeof timeBasedPricing === "string"
              ? JSON.parse(timeBasedPricing)
              : timeBasedPricing;

          if (!Array.isArray(rawValue) || rawValue.length === 0) {
            return sendError(
              res,
              400,
              "timeBasedPricing must be a non-empty array for per_hour services",
              "INVALID_TIME_BASED_PRICING"
            );
          }

          parsedTimeBasedPricing = rawValue
            .map((tier) => {
              if (!tier || typeof tier !== "object") {
                throw new Error(
                  "Each pricing tier must be an object with hours and price"
                );
              }

              const hours = Number(tier.hours);
              const price = Number(tier.price);

              if (!Number.isFinite(hours) || hours < 1) {
                throw new Error(
                  "Each pricing tier must include hours greater than or equal to 1"
                );
              }

              if (!Number.isFinite(price) || price < 0) {
                throw new Error(
                  "Each pricing tier must include a non-negative price"
                );
              }

              return { hours, price };
            })
            .sort((a, b) => a.hours - b.hours);
        } catch (error) {
          return sendError(
            res,
            400,
            error.message || "Invalid timeBasedPricing format",
            "INVALID_TIME_BASED_PRICING"
          );
        }
      }
    } else {
      // Non per_hour services rely on basePrice
      if (
        job_service_type !== "Quotation" &&
        (!basePrice || Number(basePrice) <= 0)
      ) {
        return sendError(
          res,
          400,
          "basePrice is required and must be greater than 0 for OnTime and Scheduled services",
          "INVALID_BASE_PRICE"
        );
      }

      if (
        basePrice !== undefined &&
        basePrice !== null &&
        Number(basePrice) <= 0
      ) {
        return sendError(
          res,
          400,
          "basePrice must be greater than 0 if provided",
          "INVALID_BASE_PRICE"
        );
      }

      if (
        timeBasedPricing !== undefined &&
        timeBasedPricing !== null &&
        timeBasedPricing !== ""
      ) {
        try {
          const rawValue =
            typeof timeBasedPricing === "string"
              ? JSON.parse(timeBasedPricing)
              : timeBasedPricing;

          if (!Array.isArray(rawValue)) {
            throw new Error("timeBasedPricing must be an array when provided");
          }

          parsedTimeBasedPricing = rawValue
            .map((tier) => {
              if (!tier || typeof tier !== "object") {
                throw new Error(
                  "Each pricing tier must be an object with hours and price"
                );
              }

              const hours = Number(tier.hours);
              const price = Number(tier.price);

              if (!Number.isFinite(hours) || hours < 1) {
                throw new Error(
                  "Each pricing tier must include hours greater than or equal to 1"
                );
              }

              if (!Number.isFinite(price) || price < 0) {
                throw new Error(
                  "Each pricing tier must include a non-negative price"
                );
              }

              return { hours, price };
            })
            .sort((a, b) => a.hours - b.hours);
        } catch (error) {
          return sendError(
            res,
            400,
            error.message || "Invalid timeBasedPricing format",
            "INVALID_TIME_BASED_PRICING"
          );
        }
      }
    }

    // Validate category exists
    const category = await Category.findById(category_id);
    if (!category || !category.isActive) {
      return sendError(
        res,
        400,
        "Invalid or inactive category",
        "INVALID_CATEGORY"
      );
    }

    // Validate job_service_type
    if (!["OnTime", "Scheduled", "Quotation"].includes(job_service_type)) {
      return sendError(
        res,
        400,
        "job_service_type must be OnTime, Scheduled, or Quotation",
        "INVALID_JOB_SERVICE_TYPE"
      );
    }

    // Validate availability
    const validDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const availabilityArray = Array.isArray(availability)
      ? availability
      : [availability];
    if (!availabilityArray.every((day) => validDays.includes(day))) {
      return sendError(
        res,
        400,
        "Invalid availability days. Must be Sun, Mon, Tue, Wed, Thu, Fri, or Sat",
        "INVALID_AVAILABILITY"
      );
    }

    // Conditional validation based on job_service_type
    if (job_service_type !== "Quotation") {
      if (
        !price_type ||
        !["30min", "1hr", "1day", "fixed"].includes(price_type)
      ) {
        return sendError(
          res,
          400,
          "price_type is required and must be 30min, 1hr, 1day, or fixed",
          "INVALID_PRICE_TYPE"
        );
      }
      if (
        !subservice_type ||
        !["single", "multiple"].includes(subservice_type)
      ) {
        return sendError(
          res,
          400,
          "subservice_type is required and must be single or multiple",
          "INVALID_SUBSERVICE_TYPE"
        );
      }
    }

    const serviceData = {
      name,
      category_id,
      availability: availabilityArray,
      job_service_type,
      serviceType: finalServiceType,
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

    if (unitType === "per_hour") {
      delete serviceData.basePrice;
    } else if (
      basePrice !== undefined &&
      basePrice !== null &&
      basePrice !== ""
    ) {
      serviceData.basePrice = parseFloat(basePrice);
    }

    // Add conditional fields
    if (job_service_type !== "Quotation") {
      serviceData.price_type = price_type;
      serviceData.subservice_type = subservice_type;
    }

    if (parsedTimeBasedPricing.length > 0) {
      serviceData.timeBasedPricing = parsedTimeBasedPricing;
    } else if (unitType === "per_hour") {
      serviceData.timeBasedPricing = [];
    }

    if (typeof isFeatured !== "undefined") {
      if (typeof isFeatured === "string") {
        serviceData.isFeatured = isFeatured.toLowerCase() === "true";
      } else {
        serviceData.isFeatured = Boolean(isFeatured);
      }
    }

    // Handle minAdvanceHours
    if (
      minAdvanceHours !== undefined &&
      minAdvanceHours !== null &&
      minAdvanceHours !== ""
    ) {
      serviceData.minAdvanceHours = parseInt(minAdvanceHours);
    }

    // Handle badge field - optional, defaults to empty string
    // Allow users to set empty string when updating
    if (badge !== undefined && badge !== null) {
      serviceData.badge = String(badge).trim();
    } else if (!existingService) {
      // Set default empty string for new services
      serviceData.badge = "";
    }
    // For updates, if badge is not provided, it will keep the existing value

    // Handle termsCondition field - optional, stores HTML content
    // Allow users to set empty string when updating
    if (termsCondition !== undefined && termsCondition !== null) {
      serviceData.termsCondition = String(termsCondition);
    } else if (!existingService) {
      // Set default empty string for new services
      serviceData.termsCondition = "";
    }
    // For updates, if termsCondition is not provided, it will keep the existing value

    // Handle isSubservice parameter - if false, clear subServices array
    if (isSubservice !== undefined && isSubservice !== null) {
      const isSubserviceBool = typeof isSubservice === 'string'
        ? isSubservice.toLowerCase() === 'true'
        : Boolean(isSubservice);

      if (!isSubserviceBool) {
        // Clear subServices array when isSubservice is false
        serviceData.subServices = [];
      }
    }

    // Handle subServices array (optional nested sub-services)
    // Only process if isSubservice is not explicitly set to false
    const shouldProcessSubServices = isSubservice === undefined ||
      isSubservice === null ||
      (typeof isSubservice === 'string' ? isSubservice.toLowerCase() === 'true' : Boolean(isSubservice));

    if (shouldProcessSubServices && subServices !== undefined && subServices !== null) {
      // Parse subServices if it's a JSON string (from multipart/form-data)
      let parsedSubServices;
      try {
        parsedSubServices =
          typeof subServices === "string"
            ? JSON.parse(subServices)
            : subServices;
      } catch (parseError) {
        return sendError(
          res,
          400,
          "subServices must be a valid JSON array",
          "INVALID_SUBSERVICES"
        );
      }

      if (!Array.isArray(parsedSubServices)) {
        return sendError(
          res,
          400,
          "subServices must be an array",
          "INVALID_SUBSERVICES"
        );
      }

      // Validate each sub-service
      for (const subService of parsedSubServices) {
        if (!subService.name || subService.name.trim().length === 0) {
          return sendError(
            res,
            400,
            "Each sub-service must have a name",
            "INVALID_SUBSERVICE_NAME"
          );
        }
        if (
          subService.rate === undefined ||
          subService.rate === null ||
          subService.rate < 0
        ) {
          return sendError(
            res,
            400,
            "Each sub-service must have a non-negative rate",
            "INVALID_SUBSERVICE_RATE"
          );
        }
        if (subService.items !== undefined && subService.items < 1) {
          return sendError(
            res,
            400,
            "Sub-service items must be at least 1",
            "INVALID_SUBSERVICE_ITEMS"
          );
        }
        if (subService.max !== undefined && subService.max < 1) {
          return sendError(
            res,
            400,
            "Sub-service max must be at least 1",
            "INVALID_SUBSERVICE_MAX"
          );
        }
      }

      serviceData.subServices = parsedSubServices.map((sub) => ({
        name: sub.name.trim(),
        items: sub.items !== undefined ? parseInt(sub.items) : 1,
        rate: parseFloat(sub.rate),
        max: sub.max !== undefined ? parseInt(sub.max) : 1,
      }));
    }

    // Handle service image upload if provided (serviceImage field)
    if (req.files && req.files.serviceImage && req.files.serviceImage[0]) {
      try {
        const serviceImageFile = req.files.serviceImage[0];
        console.log("Starting service image upload...");
        console.log("File path:", serviceImageFile.path);
        console.log("File size:", serviceImageFile.size);
        console.log("File mimetype:", serviceImageFile.mimetype);

        // Upload to S3
        const fileContent = fs.readFileSync(serviceImageFile.path);
        const key = `service-images/${req.user.id}/${serviceImageFile.filename}`;

        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: serviceImageFile.mimetype,
        };

        console.log("Service upload params:", {
          Bucket: uploadParams.Bucket,
          Key: uploadParams.Key,
          ContentType: uploadParams.ContentType,
          BodySize: fileContent.length,
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

        console.log("Service S3 upload result:", result);

        // Construct the S3 URL
        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${
          process.env.AWS_REGION || "us-east-1"
        }.amazonaws.com/${key}`;
        serviceData.imageUri = s3Url;
        serviceData.service_icon = s3Url;

        console.log("Service S3 URL generated:", s3Url);

        // Delete local file after S3 upload
        fs.unlinkSync(serviceImageFile.path);
        console.log("Service local file deleted successfully");
      } catch (s3Error) {
        console.error("Service S3 upload error:", s3Error);
        console.error("Error details:", {
          message: s3Error.message,
          code: s3Error.code,
          statusCode: s3Error.statusCode,
          requestId: s3Error.requestId,
        });

        // Clean up local file if S3 upload fails
        if (serviceImageFile && fs.existsSync(serviceImageFile.path)) {
          fs.unlinkSync(serviceImageFile.path);
        }
        return sendError(
          res,
          500,
          `Failed to upload service image: ${s3Error.message}`,
          "S3_UPLOAD_FAILED"
        );
      }
    }

    // Handle service_icon file upload if provided (alternative to serviceImage)
    if (
      req.files &&
      req.files.service_icon &&
      req.files.service_icon[0] &&
      !serviceData.service_icon
    ) {
      try {
        const serviceIconFile = req.files.service_icon[0];
        console.log("Starting service icon upload...");

        const fileContent = fs.readFileSync(serviceIconFile.path);
        const key = `service-icons/${req.user.id}/${serviceIconFile.filename}`;

        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: serviceIconFile.mimetype,
        };

        let result;
        if (PutObjectCommand) {
          const command = new PutObjectCommand(uploadParams);
          result = await s3Client.send(command);
        } else {
          result = await s3Client.upload(uploadParams).promise();
        }

        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${
          process.env.AWS_REGION || "us-east-1"
        }.amazonaws.com/${key}`;
        serviceData.service_icon = s3Url;

        fs.unlinkSync(serviceIconFile.path);
        console.log("Service icon uploaded successfully");
      } catch (s3Error) {
        console.error("Service icon S3 upload error:", s3Error);
        if (
          req.files.service_icon &&
          fs.existsSync(req.files.service_icon[0].path)
        ) {
          fs.unlinkSync(req.files.service_icon[0].path);
        }
        return sendError(
          res,
          500,
          `Failed to upload service icon: ${s3Error.message}`,
          "S3_UPLOAD_FAILED"
        );
      }
    }

    // Handle thumbnail upload (image or video)
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      try {
        const thumbnailFile = req.files.thumbnail[0];
        console.log("Starting thumbnail upload...");

        const fileContent = fs.readFileSync(thumbnailFile.path);
        const key = `service-thumbnails/${req.user.id}/${thumbnailFile.filename}`;
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: thumbnailFile.mimetype,
        };

        let result;
        if (PutObjectCommand) {
          const command = new PutObjectCommand(uploadParams);
          result = await s3Client.send(command);
        } else {
          result = await s3Client.upload(uploadParams).promise();
        }

        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${
          process.env.AWS_REGION || "us-east-1"
        }.amazonaws.com/${key}`;
        serviceData.thumbnailUri = s3Url;

        fs.unlinkSync(thumbnailFile.path);
        console.log("Thumbnail uploaded successfully");
      } catch (s3Error) {
        console.error("Thumbnail S3 upload error:", s3Error);
        if (thumbnailFile && fs.existsSync(thumbnailFile.path)) {
          fs.unlinkSync(thumbnailFile.path);
        }
        return sendError(
          res,
          500,
          `Failed to upload thumbnail: ${s3Error.message}`,
          "S3_UPLOAD_FAILED"
        );
      }
    }

    // Handle thumbnailUri file upload if provided (alternative to thumbnail)
    if (
      req.files &&
      req.files.thumbnailUri &&
      req.files.thumbnailUri[0] &&
      !serviceData.thumbnailUri
    ) {
      try {
        const thumbnailUriFile = req.files.thumbnailUri[0];
        console.log("Starting thumbnail URI upload...");

        const fileContent = fs.readFileSync(thumbnailUriFile.path);
        const key = `service-thumbnails/${req.user.id}/${thumbnailUriFile.filename}`;

        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: fileContent,
          ContentType: thumbnailUriFile.mimetype,
        };

        let result;
        if (PutObjectCommand) {
          const command = new PutObjectCommand(uploadParams);
          result = await s3Client.send(command);
        } else {
          result = await s3Client.upload(uploadParams).promise();
        }

        const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${
          process.env.AWS_REGION || "us-east-1"
        }.amazonaws.com/${key}`;
        serviceData.thumbnailUri = s3Url;

        fs.unlinkSync(thumbnailUriFile.path);
        console.log("Thumbnail URI uploaded successfully");
      } catch (s3Error) {
        console.error("Thumbnail URI S3 upload error:", s3Error);
        if (
          req.files.thumbnailUri &&
          fs.existsSync(req.files.thumbnailUri[0].path)
        ) {
          fs.unlinkSync(req.files.thumbnailUri[0].path);
        }
        return sendError(
          res,
          500,
          `Failed to upload thumbnail URI: ${s3Error.message}`,
          "S3_UPLOAD_FAILED"
        );
      }
    }

    // Handle service_icon and thumbnailUri from request body if not set by file uploads
    if (
      service_icon &&
      service_icon.trim().length > 0 &&
      !serviceData.service_icon
    ) {
      serviceData.service_icon = service_icon.trim();
    }

    if (
      thumbnailUri &&
      thumbnailUri.trim().length > 0 &&
      !serviceData.thumbnailUri
    ) {
      serviceData.thumbnailUri = thumbnailUri.trim();
    }

    let service;
    if (existingService) {
      // Update existing service
      service = await Service.findByIdAndUpdate(_id, serviceData, {
        new: true,
        runValidators: true,
      })
        .populate("createdBy", "name email")
        .populate("category_id", "name description");

      sendSuccess(res, 200, "Service updated successfully", service);
    } else {
      // Create new service
      service = await Service.create(serviceData);
      sendCreated(res, "Service created successfully", service);
    }
  } catch (error) {
    // Clean up local file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Get all services (admin gets all, others get only active)
// @route   GET /api/services
// @access  All users
const getServices = async (req, res, next) => {
  try {
    const { category, keywords, page, limit, isActive } = req.query;
    const ROLES = require("../constants/roles");
    const isAdmin = req.user && req.user.role === ROLES.ADMIN;

    // Build query - admin sees all services (with optional filter), others see only active
    const query = {};
    if (isAdmin) {
      // Admin can filter by isActive status (true, false, or all if not provided)
      if (isActive !== undefined) {
        query.isActive = isActive === "true";
      }
    } else {
      // Non-admin users only see active services
      query.isActive = true;
    }

    // Add category filter if provided
    if (category) {
      // Validate category_id if provided
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc || !categoryDoc.isActive) {
        return sendError(
          res,
          400,
          "Invalid or inactive category",
          "INVALID_CATEGORY"
        );
      }
      query.category_id = category;
    }

    // Add keywords search if provided (search in name only)
    if (keywords && keywords.trim().length > 0) {
      query.name = new RegExp(keywords.trim(), "i");
    }

    // Parse pagination parameters
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 0; // 0 means no limit (return all)

    // Validate pagination parameters
    if (pageNum < 1) {
      return sendError(
        res,
        400,
        "Page number must be greater than 0",
        "INVALID_PAGE"
      );
    }

    if (limitNum < 0 || limitNum > 100) {
      return sendError(
        res,
        400,
        "Limit must be between 0 and 100",
        "INVALID_LIMIT"
      );
    }

    // Calculate skip value for pagination
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

    // Execute queries
    let servicesQuery = Service.find(query)
      .populate("createdBy", "name email")
      .populate("category_id", "name description")
      .sort({ createdAt: -1 });

    // Apply pagination if limit is provided
    if (limitNum > 0) {
      servicesQuery = servicesQuery.skip(skip).limit(limitNum);
    }

    const [services, totalCount] = await Promise.all([
      servicesQuery,
      Service.countDocuments(query),
    ]);

    // Transform services to match frontend interface
    const transformedServices = services.map((service) => ({
      _id: service._id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      unitType: service.unitType,
      imageUri: service.imageUri,
      service_icon: service.service_icon,
      thumbnailUri: service.thumbnailUri,
      category_id: service.category_id,
      availability: service.availability,
      job_service_type: service.job_service_type,
      price_type: service.price_type,
      subservice_type: service.subservice_type,
      timeBasedPricing: service.timeBasedPricing || [],
      isFeatured: service.isFeatured,
      isMarketingService: service.isMarketingService,
      serviceType: service.serviceType,
      badge: service.badge || "",
      termsCondition: service.termsCondition || "",
      subServices: service.subServices || [],
      isActive: service.isActive,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString(),
    }));

    // Build response with pagination info if limit was provided
    const response = {
      success: true,
      exception: null,
      description: "Services retrieved successfully",
      content: {
        services: transformedServices,
        total: totalCount,
      },
    };

    // Add pagination info if limit was provided
    if (limitNum > 0) {
      const totalPages = Math.ceil(totalCount / limitNum);
      response.content.pagination = {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      };
    }

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
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.body;

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1) {
      return sendError(
        res,
        400,
        "Page number must be greater than 0",
        "INVALID_PAGE"
      );
    }

    if (limitNum < 1 || limitNum > 100) {
      return sendError(
        res,
        400,
        "Limit must be between 1 and 100",
        "INVALID_LIMIT"
      );
    }

    // Build query
    const query = { isActive: true };
    if (category_id) {
      // Validate category_id if provided
      const category = await Category.findById(category_id);
      if (!category || !category.isActive) {
        return sendError(
          res,
          400,
          "Invalid or inactive category",
          "INVALID_CATEGORY"
        );
      }
      query.category_id = category_id;
    }

    // Calculate skip value
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Execute queries in parallel
    const [services, totalCount] = await Promise.all([
      Service.find(query)
        .populate("createdBy", "name email")
        .populate("category_id", "name description")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Service.countDocuments(query),
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Transform services to match frontend interface
    const transformedServices = services.map((service) => ({
      _id: service._id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      unitType: service.unitType,
      imageUri: service.imageUri,
      service_icon: service.service_icon,
      thumbnailUri: service.thumbnailUri,
      category_id: service.category_id,
      availability: service.availability,
      job_service_type: service.job_service_type,
      price_type: service.price_type,
      subservice_type: service.subservice_type,
      timeBasedPricing: service.timeBasedPricing || [],
      isFeatured: service.isFeatured,
      isMarketingService: service.isMarketingService,
      serviceType: service.serviceType,
      badge: service.badge || "",
      termsCondition: service.termsCondition || "",
      subServices: service.subServices || [],
      isActive: service.isActive,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString(),
    }));

    const response = {
      success: true,
      exception: null,
      description: "Services retrieved successfully",
      content: {
        services: transformedServices,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage,
        },
      },
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
      .populate("createdBy", "name email")
      .populate("category_id", "name description");

    if (!service || !service.isActive) {
      return sendError(res, 404, "Service not found", "SERVICE_NOT_FOUND");
    }

    // Check for active banner with discount for this service
    const activeBanner = await Banner.findOne({
      service: id,
      isActive: true,
    }).lean();

    // Use service discount if available, otherwise use banner discount
    const discount = service.discount ?? activeBanner?.discountPercentage ?? null;

    // Transform service to match frontend interface
    const transformedService = {
      _id: service._id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      unitType: service.unitType,
      imageUri: service.imageUri,
      service_icon: service.service_icon,
      thumbnailUri: service.thumbnailUri,
      category_id: service.category_id,
      minAdvanceHours: service.minAdvanceHours || 0,
      availability: service.availability,
      job_service_type: service.job_service_type,
      price_type: service.price_type,
      subservice_type: service.subservice_type,
      timeBasedPricing: service.timeBasedPricing || [],
      isFeatured: service.isFeatured,
      isMarketingService: service.isMarketingService,
      serviceType: service.serviceType,
      badge: service.badge || "",
      termsCondition: service.termsCondition || "",
      subServices: service.subServices || [],
      isActive: service.isActive,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString(),
      discount: discount,
    };

    // Ensure subServices is always an array (for backward compatibility)
    if (
      !transformedService.subServices ||
      !Array.isArray(transformedService.subServices)
    ) {
      transformedService.subServices = [];
    }

    const response = {
      success: true,
      exception: null,
      description: "Service retrieved successfully",
      content: {
        service: transformedService,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle service active status (Admin only)
// @route   PATCH /api/services/:id/status
// @access  Admin only
const toggleServiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Validate isActive is provided
    if (typeof isActive !== "boolean") {
      return sendError(
        res,
        400,
        "isActive must be a boolean value",
        "INVALID_STATUS"
      );
    }

    const service = await Service.findById(id);

    if (!service) {
      return sendError(res, 404, "Service not found", "SERVICE_NOT_FOUND");
    }

    // Update the service status
    service.isActive = isActive;
    await service.save();

    const response = {
      success: true,
      exception: null,
      description: `Service ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      content: {
        service: {
          _id: service._id,
          name: service.name,
          isActive: service.isActive,
        },
      },
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
      return sendError(res, 404, "Service not found", "SERVICE_NOT_FOUND");
    }

    // Check if service is being used by any service requests
    const ServiceRequest = require("../models/ServiceRequest");
    const requestsUsingService = await ServiceRequest.countDocuments({
      service_id: id,
    });

    if (requestsUsingService > 0) {
      return sendError(
        res,
        400,
        `Cannot delete service. It is being used by ${requestsUsingService} service request(s)`,
        "SERVICE_IN_USE"
      );
    }

    // Permanently delete the service
    await Service.findByIdAndDelete(id);

    const response = {
      success: true,
      exception: null,
      description: "Service deleted successfully",
      content: {
        service: {
          _id: service._id,
          name: service.name,
        },
      },
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
    const { category, category_id, serviceType } = req.query;

    // Build query
    const query = { isActive: true };

    // Add serviceType filter if provided (residential or commercial)
    if (serviceType) {
      const validServiceTypes = ["residential", "commercial"];
      if (!validServiceTypes.includes(serviceType.toLowerCase())) {
        return sendError(
          res,
          400,
          "Invalid serviceType. Must be 'residential' or 'commercial'",
          "INVALID_SERVICE_TYPE"
        );
      }
      query.serviceType = serviceType.toLowerCase();
    }

    // Add category filter if provided (support both 'category' and 'category_id' for flexibility)
    const categoryFilter = category || category_id;
    if (categoryFilter) {
      // Validate category_id if provided
      if (!mongoose.Types.ObjectId.isValid(categoryFilter)) {
        return sendError(
          res,
          400,
          "Invalid category ID format",
          "INVALID_CATEGORY_ID"
        );
      }

      const categoryDoc = await Category.findById(categoryFilter);
      if (!categoryDoc || !categoryDoc.isActive) {
        return sendError(
          res,
          400,
          "Invalid or inactive category",
          "INVALID_CATEGORY"
        );
      }
      query.category_id = categoryFilter;
    }

    const services = await Service.find(query)
      .populate("createdBy", "name email")
      .populate("category_id", "name description")
      .sort({ createdAt: -1 });

    // Transform services to match frontend interface
    const transformedServices = services.map((service) => ({
      _id: service._id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      unitType: service.unitType,
      imageUri: service.imageUri,
      service_icon: service.service_icon,
      thumbnailUri: service.thumbnailUri,
      category_id: service.category_id,
      availability: service.availability,
      job_service_type: service.job_service_type,
      price_type: service.price_type,
      subservice_type: service.subservice_type,
      timeBasedPricing: service.timeBasedPricing || [],
      isFeatured: service.isFeatured,
      isMarketingService: service.isMarketingService,
      serviceType: service.serviceType,
      badge: service.badge || "",
      termsCondition: service.termsCondition || "",
      subServices: service.subServices || [],
      isActive: service.isActive,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString(),
    }));

    const response = {
      success: true,
      exception: null,
      description: "All active services retrieved successfully",
      content: {
        services: transformedServices,
        total: transformedServices.length,
      },
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

    const service = await Service.findById(id).populate(
      "category_id",
      "name description"
    );

    if (!service || !service.isActive) {
      return sendError(res, 404, "Service not found", "SERVICE_NOT_FOUND");
    }

    // Return the subServices array from the service
    const response = {
      success: true,
      exception: null,
      description: "Sub-services retrieved successfully",
      content: {
        serviceId: service._id,
        serviceName: service.name,
        subServices: service.subServices || [],
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark one or multiple services as featured/unfeatured
// @route   POST /api/services/featured
// @access  Admin only
const setFeaturedServices = async (req, res, next) => {
  try {
    let { serviceIds, isFeatured = true, featureIds, unfeatureIds } = req.body;

    const normalizeIdsInput = (value) => {
      if (value === undefined || value === null) return [];
      const arr = Array.isArray(value) ? value : [value];
      return arr
        .filter((id) => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    };

    const serviceIdsNormalized = normalizeIdsInput(serviceIds);
    const featureIdsNormalized = normalizeIdsInput(featureIds);
    const unfeatureIdsNormalized = normalizeIdsInput(unfeatureIds);

    if (
      serviceIdsNormalized.length === 0 &&
      featureIdsNormalized.length === 0 &&
      unfeatureIdsNormalized.length === 0
    ) {
      return sendError(
        res,
        400,
        "At least one service ID must be provided",
        "MISSING_SERVICE_IDS"
      );
    }

    const parseBoolean = (value, defaultValue = true) => {
      if (typeof value === "undefined") return defaultValue;
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const lowered = value.toLowerCase();
        if (["true", "1", "yes"].includes(lowered)) return true;
        if (["false", "0", "no"].includes(lowered)) return false;
      }
      return Boolean(value);
    };

    const operations = [];

    if (serviceIdsNormalized.length > 0) {
      operations.push({
        ids: serviceIdsNormalized,
        isFeatured: parseBoolean(isFeatured, true),
      });
    }

    if (featureIdsNormalized.length > 0) {
      operations.push({
        ids: featureIdsNormalized,
        isFeatured: true,
      });
    }

    if (unfeatureIdsNormalized.length > 0) {
      operations.push({
        ids: unfeatureIdsNormalized,
        isFeatured: false,
      });
    }

    const allIds = [...new Set(operations.flatMap((op) => op.ids))];
    const invalidIds = allIds.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );
    if (invalidIds.length > 0) {
      return sendError(
        res,
        400,
        `Invalid service ID(s): ${invalidIds.join(", ")}`,
        "INVALID_SERVICE_ID"
      );
    }

    let matchedCount = 0;
    let modifiedCount = 0;

    for (const op of operations) {
      const result = await Service.updateMany(
        { _id: { $in: op.ids } },
        { $set: { isFeatured: op.isFeatured } }
      );
      matchedCount += result?.matchedCount ?? result?.n ?? 0;
      modifiedCount += result?.modifiedCount ?? result?.nModified ?? 0;
    }

    const updatedServices = await Service.find({ _id: { $in: allIds }, isActive: true })
      .populate("category_id", "name description")
      .select("_id name category_id isFeatured isActive");

    // Get all active featured services to return
    const allFeaturedServices = await Service.find({ isActive: true, isFeatured: true })
      .populate("category_id", "name description")
      .select("_id name category_id isFeatured isActive");

    return sendSuccess(
      res,
      200,
      "Service featured status updated successfully",
      {
        matchedCount,
        modifiedCount,
        services: updatedServices,
        featuredServices: allFeaturedServices,
        totalFeatured: allFeaturedServices.length,
      }
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured services
// @route   GET /api/services/featured
// @access  Public
const getFeaturedServices = async (req, res, next) => {
  try {
    const { limit } = req.query;
    let limitNum;

    if (typeof limit !== "undefined") {
      limitNum = parseInt(limit, 10);
      if (!Number.isFinite(limitNum) || limitNum < 1 || limitNum > 100) {
        return sendError(
          res,
          400,
          "limit must be a number between 1 and 100",
          "INVALID_LIMIT"
        );
      }
    }

    let query = Service.find({ isActive: true, isFeatured: true })
      .populate("createdBy", "name email")
      .populate("category_id", "name description")
      .sort({ updatedAt: -1 });

    if (limitNum) {
      query = query.limit(limitNum);
    }

    const services = await query;

    const transformedServices = services.map((service) => ({
      _id: service._id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      unitType: service.unitType,
      imageUri: service.imageUri,
      service_icon: service.service_icon,
      thumbnailUri: service.thumbnailUri,
      category_id: service.category_id,
      badge: service.badge || "",
      termsCondition: service.termsCondition || "",
      isFeatured: service.isFeatured,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString(),
    }));

    return sendSuccess(res, 200, "Featured services retrieved successfully", {
      services: transformedServices,
      total: transformedServices.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get residential services
// @route   GET /api/services/residential
// @access  Public
const getResidentialServices = async (req, res, next) => {
  try {
    const { limit, category } = req.query;
    let limitNum;

    if (typeof limit !== "undefined") {
      limitNum = parseInt(limit, 10);
      if (!Number.isFinite(limitNum) || limitNum < 1 || limitNum > 100) {
        return sendError(
          res,
          400,
          "limit must be a number between 1 and 100",
          "INVALID_LIMIT"
        );
      }
    }

    // Build query
    const query = { isActive: true, serviceType: "residential" };

    // Add category filter if provided
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return sendError(
          res,
          400,
          "Invalid category ID format",
          "INVALID_CATEGORY_ID"
        );
      }
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc || !categoryDoc.isActive) {
        return sendError(
          res,
          400,
          "Invalid or inactive category",
          "INVALID_CATEGORY"
        );
      }
      query.category_id = category;
    }

    let serviceQuery = Service.find(query)
      .populate("createdBy", "name email")
      .populate("category_id", "name description")
      .sort({ updatedAt: -1 });

    if (limitNum) {
      serviceQuery = serviceQuery.limit(limitNum);
    }

    const services = await serviceQuery;

    const transformedServices = services.map((service) => ({
      _id: service._id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      unitType: service.unitType,
      imageUri: service.imageUri,
      service_icon: service.service_icon,
      thumbnailUri: service.thumbnailUri,
      category_id: service.category_id,
      availability: service.availability,
      job_service_type: service.job_service_type,
      price_type: service.price_type,
      subservice_type: service.subservice_type,
      timeBasedPricing: service.timeBasedPricing || [],
      isFeatured: service.isFeatured,
      isMarketingService: service.isMarketingService,
      serviceType: service.serviceType,
      badge: service.badge || "",
      termsCondition: service.termsCondition || "",
      subServices: service.subServices || [],
      isActive: service.isActive,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString(),
    }));

    return sendSuccess(
      res,
      200,
      "Residential services retrieved successfully",
      {
        services: transformedServices,
        total: transformedServices.length,
      }
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get commercial services
// @route   GET /api/services/commercial
// @access  Public
const getCommercialServices = async (req, res, next) => {
  try {
    const { limit, category } = req.query;
    let limitNum;

    if (typeof limit !== "undefined") {
      limitNum = parseInt(limit, 10);
      if (!Number.isFinite(limitNum) || limitNum < 1 || limitNum > 100) {
        return sendError(
          res,
          400,
          "limit must be a number between 1 and 100",
          "INVALID_LIMIT"
        );
      }
    }

    // Build query
    const query = { isActive: true, serviceType: "commercial" };

    // Add category filter if provided
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return sendError(
          res,
          400,
          "Invalid category ID format",
          "INVALID_CATEGORY_ID"
        );
      }
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc || !categoryDoc.isActive) {
        return sendError(
          res,
          400,
          "Invalid or inactive category",
          "INVALID_CATEGORY"
        );
      }
      query.category_id = category;
    }

    let serviceQuery = Service.find(query)
      .populate("createdBy", "name email")
      .populate("category_id", "name description")
      .sort({ updatedAt: -1 });

    if (limitNum) {
      serviceQuery = serviceQuery.limit(limitNum);
    }

    const services = await serviceQuery;

    const transformedServices = services.map((service) => ({
      _id: service._id,
      name: service.name,
      description: service.description,
      basePrice: service.basePrice,
      unitType: service.unitType,
      imageUri: service.imageUri,
      service_icon: service.service_icon,
      thumbnailUri: service.thumbnailUri,
      category_id: service.category_id,
      availability: service.availability,
      job_service_type: service.job_service_type,
      price_type: service.price_type,
      subservice_type: service.subservice_type,
      timeBasedPricing: service.timeBasedPricing || [],
      isFeatured: service.isFeatured,
      isMarketingService: service.isMarketingService,
      serviceType: service.serviceType,
      badge: service.badge || "",
      termsCondition: service.termsCondition || "",
      subServices: service.subServices || [],
      isActive: service.isActive,
      createdBy: service.createdBy,
      createdAt: service.createdAt?.toISOString(),
      updatedAt: service.updatedAt?.toISOString(),
    }));

    return sendSuccess(res, 200, "Commercial services retrieved successfully", {
      services: transformedServices,
      total: transformedServices.length,
    });
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
  toggleServiceStatus,
  getAllActiveServices,
  getServiceSubServices,
  setFeaturedServices,
  getFeaturedServices,
  getResidentialServices,
  getCommercialServices,
  // New: Get only services of the "INTERIOR RENOVATION" category (public)
  getHomeCategoryServices: async (req, res, next) => {
    try {
      // Find the "INTERIOR RENOVATION" category
      const category = await Category.findOne({
        name: { $regex: /^INTERIOR RENOVATION$/i },
        isActive: true,
      });

      if (!category) {
        return sendSuccess(
          res,
          200,
          "INTERIOR RENOVATION category not found",
          []
        );
      }

      const services = await Service.find({
        category_id: category._id,
        isActive: true,
      })
        .sort({ createdAt: -1 })
        .select({
          _id: 1,
          name: 1,
          service_icon: 1,
          basePrice: 1,
          unitType: 1,
          timeBasedPricing: 1,
        })
        .lean();

      const result = services.map((svc) => {
        const tiers = Array.isArray(svc.timeBasedPricing)
          ? svc.timeBasedPricing
          : [];
        const perHourPrice =
          svc.unitType === "per_hour" && tiers.length > 0
            ? tiers.reduce((min, tier) => {
                if (!tier || typeof tier.price !== "number") return min;
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
          timeBasedPricing: tiers,
        };
      });

      return sendSuccess(
        res,
        200,
        "INTERIOR RENOVATION category services retrieved successfully",
        result
      );
    } catch (error) {
      next(error);
    }
  },
  // New: Get all active services with limited fields (public)
  getPopularServices: async (req, res, next) => {
    try {
      const services = await Service.find({ isActive: true })
        .sort({ createdAt: -1 })
        .select({
          _id: 1,
          name: 1,
          service_icon: 1,
          thumbnailUri: 1,
          serviceType: 1,
        })
        .lean();

      const transformService = (svc) => ({
        id: svc._id,
        name: svc.name,
        icon: svc.service_icon || null,
        thumbnail: svc.thumbnailUri || null,
      });

      const commercialServices = services
        .filter((svc) => svc.serviceType === "commercial")
        .map(transformService);

      const residentialServices = services
        .filter((svc) => svc.serviceType === "residential")
        .map(transformService);

      // Fetch banners
      const bannersData = await Banner.find({
        isActive: true,
        platform: { $in: ["web", "both"] },
      })
        .populate("service", "name serviceType")
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();

      const banners = bannersData.map((banner) => ({
        name: banner.service?.name || "",
        serviceId:
          banner.service?._id?.toString() || banner.service?.toString() || null,
        discountPercentage: banner.discountPercentage,
        mediaType: banner.mediaType,
        mediaUrl: banner.mediaUrl,
      }));

      return sendSuccess(res, 200, "Popular services retrieved successfully", {
        commercialServices,
        residentialServices,
        banners,
      });
    } catch (error) {
      next(error);
    }
  },
  upload,
};
