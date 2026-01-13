const Service = require("../models/Service");
const mongoose = require("mongoose");
const { sendSuccess, sendError } = require("../utils/response");

// @desc    Mark one or multiple services for marketing
// @route   POST /api/marketing/services
// @access  Admin only
const setMarketingServices = async (req, res, next) => {
  try {
    let { serviceIds, isMarketing = true, markIds, unmarkIds } = req.body;

    const normalizeIdsInput = (value) => {
      if (value === undefined || value === null) return [];
      const arr = Array.isArray(value) ? value : [value];
      return arr
        .filter((id) => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    };

    const serviceIdsNormalized = normalizeIdsInput(serviceIds);
    const markIdsNormalized = normalizeIdsInput(markIds);
    const unmarkIdsNormalized = normalizeIdsInput(unmarkIds);

    if (
      serviceIdsNormalized.length === 0 &&
      markIdsNormalized.length === 0 &&
      unmarkIdsNormalized.length === 0
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
        isMarketing: parseBoolean(isMarketing, true),
      });
    }

    if (markIdsNormalized.length > 0) {
      operations.push({
        ids: markIdsNormalized,
        isMarketing: true,
      });
    }

    if (unmarkIdsNormalized.length > 0) {
      operations.push({
        ids: unmarkIdsNormalized,
        isMarketing: false,
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
        { $set: { isMarketingService: op.isMarketing } }
      );
      matchedCount += result?.matchedCount ?? result?.n ?? 0;
      modifiedCount += result?.modifiedCount ?? result?.nModified ?? 0;
    }

    const updatedServices = await Service.find({
      _id: { $in: allIds },
      isActive: true,
    })
      .populate("category_id", "name description")
      .select("_id name category_id isMarketingService isActive");

    // Get all active marketing services to return
    const allMarketingServices = await Service.find({
      isActive: true,
      isMarketingService: true,
    })
      .populate("category_id", "name description")
      .select("_id name category_id isMarketingService isActive");

    return sendSuccess(
      res,
      200,
      "Service marketing status updated successfully",
      {
        matchedCount,
        modifiedCount,
        services: updatedServices,
        marketingServices: allMarketingServices,
        totalMarketing: allMarketingServices.length,
      }
    );
  } catch (error) {
    next(error);
  }
};

// @desc    Get marketing services
// @route   GET /api/marketing/services
// @access  Public
const getMarketingServices = async (req, res, next) => {
  try {
    const { limit, category, serviceType } = req.query;
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
    const query = { isActive: true, isMarketingService: true };

    // Add serviceType filter if provided
    if (serviceType) {
      const validServiceTypes = ["residential", "commercial"];
      if (!validServiceTypes.includes(serviceType.toLowerCase())) {
        return sendError(
          res,
          400,
          'Invalid serviceType. Must be "residential" or "commercial"',
          "INVALID_SERVICE_TYPE"
        );
      }
      query.serviceType = serviceType.toLowerCase();
    }

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
      min_time_required: service.min_time_required,
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

    return sendSuccess(res, 200, "Marketing services retrieved successfully", {
      services: transformedServices,
      total: transformedServices.length,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all services (for admin to mark/unmark) with marketing status
// @route   GET /api/marketing/services/all
// @access  Admin only
const getAllServicesForMarketing = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, serviceType, search } = req.query;

    // Build query
    const query = { isActive: true };

    // Add serviceType filter if provided
    if (serviceType) {
      const validServiceTypes = ["residential", "commercial"];
      if (!validServiceTypes.includes(serviceType.toLowerCase())) {
        return sendError(
          res,
          400,
          'Invalid serviceType. Must be "residential" or "commercial"',
          "INVALID_SERVICE_TYPE"
        );
      }
      query.serviceType = serviceType.toLowerCase();
    }

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
      query.category_id = category;
    }

    // Add search filter if provided
    if (search && search.trim().length > 0) {
      query.name = new RegExp(search.trim(), "i");
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute queries in parallel
    const [services, totalCount, marketingCount] = await Promise.all([
      Service.find(query)
        .populate("category_id", "name description")
        .select(
          "_id name category_id isMarketingService isFeatured serviceType isActive"
        )
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Service.countDocuments(query),
      Service.countDocuments({ ...query, isMarketingService: true }),
    ]);

    return sendSuccess(
      res,
      200,
      "Services retrieved successfully for marketing management",
      {
        services,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalServices: totalCount,
          servicesPerPage: limitNum,
          hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
          hasPrevPage: pageNum > 1,
        },
        statistics: {
          totalServices: totalCount,
          marketingServices: marketingCount,
          nonMarketingServices: totalCount - marketingCount,
        },
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setMarketingServices,
  getMarketingServices,
  getAllServicesForMarketing,
};
