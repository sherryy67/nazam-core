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

// @desc    Get marketing content for a specific service
// @route   GET /api/marketing/services/:id/content
// @access  Marketing team (marketing:read)
const getServiceMarketingContent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID format", "INVALID_SERVICE_ID");
    }

    const service = await Service.findById(id).select(
      "_id name description contentSections benefitsTitle benefits whyChooseUs whereWeOffer youtubeLink faqs testimonials metaTitle metaDescription urlSlug socialImage ogTitle ogDescription robotsTag canonical"
    );

    if (!service) {
      return sendError(res, 404, "Service not found", "SERVICE_NOT_FOUND");
    }

    return sendSuccess(res, 200, "Service marketing content retrieved successfully", {
      service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update marketing content for a specific service
// @route   PUT /api/marketing/services/:id/content
// @access  Marketing team (marketing:write)
const updateServiceMarketingContent = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid service ID format", "INVALID_SERVICE_ID");
    }

    const service = await Service.findById(id);
    if (!service) {
      return sendError(res, 404, "Service not found", "SERVICE_NOT_FOUND");
    }

    const {
      contentSections,
      benefitsTitle,
      benefits,
      whyChooseUs,
      whereWeOffer,
      youtubeLink,
      faqs,
      testimonials,
      metaTitle,
      metaDescription,
      urlSlug,
      ogTitle,
      ogDescription,
      robotsTag,
      canonical,
      name,
      description,
    } = req.body;

    const updateData = {};

    // Handle contentSections
    if (contentSections !== undefined && contentSections !== null) {
      try {
        const parsed =
          typeof contentSections === "string"
            ? JSON.parse(contentSections)
            : contentSections;
        if (Array.isArray(parsed)) {
          updateData.contentSections = parsed.slice(0, 2).map((section) => ({
            heading: section.heading || "",
            description: section.description || "",
            includedServices: Array.isArray(section.includedServices)
              ? section.includedServices.map((item) => ({
                  icon: item.icon || "",
                  heading: item.heading || "",
                  description: item.description || "",
                }))
              : [],
          }));
        }
      } catch (e) {
        return sendError(res, 400, "Invalid contentSections format", "PARSE_ERROR");
      }
    }

    // Handle benefitsTitle
    if (benefitsTitle !== undefined && benefitsTitle !== null) {
      updateData.benefitsTitle = String(benefitsTitle).trim();
    }

    // Handle benefits
    if (benefits !== undefined && benefits !== null) {
      try {
        const parsed =
          typeof benefits === "string" ? JSON.parse(benefits) : benefits;
        if (Array.isArray(parsed)) {
          updateData.benefits = parsed
            .filter(
              (b) =>
                b &&
                typeof b === "object" &&
                (b.heading || b.description || b.icon),
            )
            .map((b) => ({
              icon: b.icon || "",
              heading: b.heading || "",
              description: b.description || "",
            }));
        }
      } catch (e) {
        return sendError(res, 400, "Invalid benefits format", "PARSE_ERROR");
      }
    }

    // Handle whyChooseUs
    if (whyChooseUs !== undefined && whyChooseUs !== null) {
      try {
        const parsed =
          typeof whyChooseUs === "string"
            ? JSON.parse(whyChooseUs)
            : whyChooseUs;
        if (parsed && typeof parsed === "object") {
          updateData.whyChooseUs = {
            heading: parsed.heading || "",
            description: parsed.description || "",
          };
        }
      } catch (e) {
        return sendError(res, 400, "Invalid whyChooseUs format", "PARSE_ERROR");
      }
    }

    // Handle whereWeOffer
    if (whereWeOffer !== undefined && whereWeOffer !== null) {
      try {
        const parsed =
          typeof whereWeOffer === "string"
            ? JSON.parse(whereWeOffer)
            : whereWeOffer;
        if (parsed && typeof parsed === "object") {
          updateData.whereWeOffer = {
            heading: parsed.heading || "",
            description: parsed.description || "",
          };
        }
      } catch (e) {
        return sendError(res, 400, "Invalid whereWeOffer format", "PARSE_ERROR");
      }
    }

    // Handle youtubeLink
    if (youtubeLink !== undefined && youtubeLink !== null) {
      updateData.youtubeLink = String(youtubeLink).trim();
    }

    // Handle faqs
    if (faqs !== undefined && faqs !== null) {
      try {
        const parsed = typeof faqs === "string" ? JSON.parse(faqs) : faqs;
        if (Array.isArray(parsed)) {
          updateData.faqs = parsed
            .filter((f) => f && f.question && f.question.trim().length > 0)
            .map((f) => ({
              question: f.question.trim(),
              answer: f.answer || "",
            }));
        }
      } catch (e) {
        return sendError(res, 400, "Invalid faqs format", "PARSE_ERROR");
      }
    }

    // Handle testimonials
    if (testimonials !== undefined && testimonials !== null) {
      try {
        const parsed =
          typeof testimonials === "string"
            ? JSON.parse(testimonials)
            : testimonials;
        if (Array.isArray(parsed)) {
          updateData.testimonials = parsed
            .filter(
              (t) => t && typeof t === "object" && (t.name || t.description),
            )
            .map((t) => ({
              name: t.name || "",
              designation: t.designation || "",
              rating: Math.min(5, Math.max(1, Number(t.rating) || 5)),
              description: t.description || "",
            }));
        }
      } catch (e) {
        return sendError(res, 400, "Invalid testimonials format", "PARSE_ERROR");
      }
    }

    // Handle SEO fields
    if (metaTitle !== undefined && metaTitle !== null) {
      updateData.metaTitle = String(metaTitle).trim();
    }
    if (metaDescription !== undefined && metaDescription !== null) {
      updateData.metaDescription = String(metaDescription).trim();
    }
    if (ogTitle !== undefined && ogTitle !== null) {
      updateData.ogTitle = String(ogTitle).trim();
    }
    if (ogDescription !== undefined && ogDescription !== null) {
      updateData.ogDescription = String(ogDescription).trim();
    }

    // Handle urlSlug
    if (urlSlug !== undefined && urlSlug !== null && String(urlSlug).trim().length > 0) {
      const slugify = (str) =>
        String(str)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");

      updateData.urlSlug = slugify(urlSlug);

      // Check uniqueness excluding current service
      const slugExists = await Service.findOne({
        urlSlug: updateData.urlSlug,
        _id: { $ne: id },
      });
      if (slugExists) {
        return sendError(
          res,
          400,
          "URL slug already in use by another service",
          "DUPLICATE_SLUG"
        );
      }
    }

    // Handle robotsTag
    if (robotsTag !== undefined && robotsTag !== null) {
      updateData.robotsTag = String(robotsTag).trim();
    }

    // Handle canonical
    if (canonical !== undefined && canonical !== null) {
      updateData.canonical = String(canonical).trim();
    }

    // Handle name
    if (name !== undefined && name !== null && String(name).trim().length > 0) {
      updateData.name = String(name).trim();
    }

    // Handle description
    if (description !== undefined && description !== null) {
      updateData.description = String(description).trim();
    }

    // Check if any fields were provided
    if (Object.keys(updateData).length === 0) {
      return sendError(
        res,
        400,
        "No marketing content fields provided to update",
        "NO_FIELDS_PROVIDED"
      );
    }

    const marketingFields =
      "_id name description contentSections benefitsTitle benefits whyChooseUs whereWeOffer youtubeLink faqs testimonials metaTitle metaDescription urlSlug socialImage ogTitle ogDescription robotsTag canonical";

    const updatedService = await Service.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).select(marketingFields);

    return sendSuccess(res, 200, "Service marketing content updated successfully", {
      service: updatedService,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setMarketingServices,
  getMarketingServices,
  getAllServicesForMarketing,
  getServiceMarketingContent,
  updateServiceMarketingContent,
};
