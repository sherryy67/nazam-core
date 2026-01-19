const Category = require("../models/Category");
const Service = require("../models/Service");
const Banner = require("../models/Banner");
const mongoose = require("mongoose");
const { sendSuccess, sendError, sendCreated } = require("../utils/response");

// @desc    Create a new category
// @route   POST /api/categories
// @access  Admin only
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return sendError(
        res,
        400,
        "Category name is required",
        "MISSING_REQUIRED_FIELDS"
      );
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existingCategory) {
      return sendError(
        res,
        409,
        "Category with this name already exists",
        "CATEGORY_EXISTS"
      );
    }

    const categoryData = {
      name: name.trim(),
      description: description ? description.trim() : undefined,
      createdBy: req.user.id,
    };

    const category = await Category.create(categoryData);

    // Transform category to match frontend interface
    const transformedCategory = {
      _id: category._id,
      name: category.name,
      description: category.description || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString(),
    };

    const response = {
      success: true,
      exception: null,
      description: "Category created successfully",
      content: {
        categories: [transformedCategory],
        total: 1,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active categories
// @route   GET /api/categories
// @access  All users
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate("createdBy", "name email")
      .sort({ sortOrder: 1, name: 1 });

    // Transform categories to match frontend interface
    const transformedCategories = categories.map((category) => ({
      _id: category._id,
      name: category.name,
      description: category.description || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString(),
    }));

    const response = {
      success: true,
      exception: null,
      description: "Categories retrieved successfully",
      content: {
        categories: transformedCategories,
        total: transformedCategories.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories (including inactive) - Admin only
// @route   GET /api/categories/all
// @access  Admin only
const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find()
      .populate("createdBy", "name email")
      .sort({ sortOrder: 1, name: 1 });

    // Transform categories to match frontend interface
    const transformedCategories = categories.map((category) => ({
      _id: category._id,
      name: category.name,
      description: category.description || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString(),
    }));

    const response = {
      success: true,
      exception: null,
      description: "All categories retrieved successfully",
      content: {
        categories: transformedCategories,
        total: transformedCategories.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  All users
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id).populate(
      "createdBy",
      "name email"
    );

    if (!category) {
      return sendError(res, 404, "Category not found", "CATEGORY_NOT_FOUND");
    }

    // Transform category to match frontend interface
    const transformedCategory = {
      _id: category._id,
      name: category.name,
      description: category.description || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString(),
    };

    const response = {
      success: true,
      exception: null,
      description: "Category retrieved successfully",
      content: {
        categories: [transformedCategory],
        total: 1,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Admin only
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findById(id);

    if (!category) {
      return sendError(res, 404, "Category not found", "CATEGORY_NOT_FOUND");
    }

    // Check if new name conflicts with existing category
    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: id },
      });

      if (existingCategory) {
        return sendError(
          res,
          409,
          "Category with this name already exists",
          "CATEGORY_EXISTS"
        );
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined)
      updateData.description = description ? description.trim() : undefined;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    // Transform category to match frontend interface
    const transformedCategory = {
      _id: updatedCategory._id,
      name: updatedCategory.name,
      description: updatedCategory.description || undefined,
      isActive: updatedCategory.isActive,
      sortOrder: updatedCategory.sortOrder || 0,
      createdAt: updatedCategory.createdAt?.toISOString(),
      updatedAt: updatedCategory.updatedAt?.toISOString(),
    };

    const response = {
      success: true,
      exception: null,
      description: "Category updated successfully",
      content: {
        categories: [transformedCategory],
        total: 1,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category (soft delete)
// @route   DELETE /api/categories/:id
// @access  Admin only
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return sendError(res, 404, "Category not found", "CATEGORY_NOT_FOUND");
    }

    // Check if category is being used by any services
    const Service = require("../models/Service");
    const servicesUsingCategory = await Service.countDocuments({
      category_id: id,
    });

    if (servicesUsingCategory > 0) {
      return sendError(
        res,
        400,
        `Cannot delete category. It is being used by ${servicesUsingCategory} service(s)`,
        "CATEGORY_IN_USE"
      );
    }

    // Permanently delete the category
    await Category.findByIdAndDelete(id);

    const response = {
      success: true,
      exception: null,
      description: "Category deleted successfully",
      content: {
        category: {
          _id: category._id,
          name: category.name,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get categories for home page with one service each
// @route   GET /api/categories/home
// @access  Public
const getHomeCategories = async (req, res, next) => {
  try {
    // Get all active categories
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    // Get one service for each category
    const categoriesWithServices = await Promise.all(
      categories.map(async (category) => {
        // Find one active service for this category
        const service = await Service.findOne({
          category_id: category._id,
          isActive: true,
        })
          .populate("createdBy", "name email")
          .sort({ createdAt: -1 });

        // Transform category
        const transformedCategory = {
          _id: category._id,
          name: category.name,
          description: category.description || undefined,
          isActive: category.isActive,
          sortOrder: category.sortOrder || 0,
          createdAt: category.createdAt?.toISOString(),
          updatedAt: category.updatedAt?.toISOString(),
        };

        // Transform service if it exists
        let transformedService = null;
        if (service) {
          transformedService = {
            _id: service._id,
            name: service.name,
            description: service.description,
            basePrice: service.basePrice,
            unitType: service.unitType,
            imageUri: service.imageUri,
            service_icon: service.service_icon,
            category_id: service.category_id,
            availability: service.availability,
            job_service_type: service.job_service_type,
            price_type: service.price_type,
            subservice_type: service.subservice_type,
            timeBasedPricing: service.timeBasedPricing || [],
            isFeatured: service.isFeatured,
            isActive: service.isActive,
            createdBy: service.createdBy,
            createdAt: service.createdAt?.toISOString(),
            updatedAt: service.updatedAt?.toISOString(),
          };
        }

        return {
          category: transformedCategory,
          service: transformedService,
        };
      })
    );

    // Return ALL categories (with or without services)
    const response = {
      success: true,
      exception: null,
      description: "Home categories retrieved successfully",
      content: {
        categories: categoriesWithServices,
        total: categoriesWithServices.length,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get categories with their services for mobile home
// @route   GET /api/mobile/home
// @access  Public
const getMobileHomeContent = async (req, res, next) => {
  try {
    /* ---------------- Seeded random helpers ---------------- */

    const seededRandom = (seed) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const seededShuffle = (arr, seed) => {
      const copied = Array.isArray(arr) ? arr.slice() : [];
      for (let i = copied.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [copied[i], copied[j]] = [copied[j], copied[i]];
      }
      return copied;
    };

    // Daily seed → same result whole day
    const seed = Number(
      new Date().toISOString().slice(0, 10).replace(/-/g, "")
    );

    /* ---------------- Transform helper ---------------- */

    const transformService = (service) => ({
      _id: service._id,
      name: service.name,
      description: service.description || undefined,
      imageUri: service.imageUri || undefined,
      service_icon: service.service_icon || undefined,
      thumbnailUri: service.thumbnailUri || undefined,
      category_id: service.category_id,
      termsCondition: service.termsCondition ?? "",
    });

    /* ---------------- Categories ---------------- */

    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    if (!categories.length) {
      return sendSuccess(res, 200, "No categories available", {
        commercialServices: { services: [], commercialBanner: [] },
        residentialServices: { services: [], residentialBanner: [] },
        offers: { services: [] },
      });
    }

    /* ---------------- Banners ---------------- */

    const banners = await Banner.find({
      isActive: true,
      platform: { $in: ["mobile", "both"] },
    })
      .populate("service", "name serviceType")
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    const commercialBanner = [];
    const residentialBanner = [];

    banners.forEach((banner) => {
      const serviceType = banner.service?.serviceType;
      const bannerObj = {
        name: banner.service?.name || "",
        serviceId: banner.service?._id || banner.service,
        discountPercentage: banner.discountPercentage,
        mediaType: banner.mediaType,
        mediaUrl: banner.mediaUrl,
      };

      if (serviceType === "commercial") {
        commercialBanner.push(bannerObj);
      } else if (serviceType === "residential") {
        residentialBanner.push(bannerObj);
      }
    });

    /* ---------------- Commercial services ---------------- */

    const commercialServicesData = await Service.find({
      isActive: true,
      serviceType: "commercial",
    })
      .populate("category_id", "_id name")
      .sort({ name: 1 })
      .lean();

    const commercialServices = seededShuffle(commercialServicesData, seed)
      .slice(0, 9)
      .map(transformService);

    /* ---------------- Residential services ---------------- */

    const residentialServicesData = await Service.find({
      isActive: true,
      serviceType: "residential",
    })
      .populate("category_id", "_id name")
      .sort({ name: 1 })
      .lean();

    const residentialServices = seededShuffle(residentialServicesData, seed)
      .slice(0, 9)
      .map(transformService);

    /* ---------------- Offers (featured services regardless of type) ---------------- */

    const featuredServicesData = await Service.find({
      isActive: true,
      isFeatured: true,
    })
      .populate("category_id", "_id name")
      .sort({ createdAt: -1 })
      .lean();

    const offersServices = seededShuffle(featuredServicesData, seed)
      .slice(0, 9)
      .map(transformService);

    /* ---------------- Final response ---------------- */

    return sendSuccess(res, 200, "Mobile home content retrieved successfully", {
      offers: {
        services: offersServices,
      },
      commercialServices: {
        services: commercialServices,
        commercialBanner,
      },
      residentialServices: {
        services: residentialServices,
        residentialBanner,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update category sort order
// @route   PUT /api/categories/sort
// @access  Admin only
const updateCategorySortOrder = async (req, res, next) => {
  try {
    const { categories } = req.body;

    // Validate request body
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return sendError(
        res,
        400,
        "Categories array is required and must not be empty",
        "MISSING_REQUIRED_FIELDS"
      );
    }

    // Validate each category object
    for (const category of categories) {
      if (!category.id) {
        return sendError(
          res,
          400,
          "Category ID is required for each category",
          "MISSING_CATEGORY_ID"
        );
      }
      if (!mongoose.Types.ObjectId.isValid(category.id)) {
        return sendError(
          res,
          400,
          `Invalid category ID format: ${category.id}`,
          "INVALID_CATEGORY_ID"
        );
      }
      if (category.sortOrder === undefined || category.sortOrder === null) {
        return sendError(
          res,
          400,
          "sortOrder is required for each category",
          "MISSING_SORT_ORDER"
        );
      }
      if (
        typeof category.sortOrder !== "number" ||
        !Number.isInteger(category.sortOrder)
      ) {
        return sendError(
          res,
          400,
          "sortOrder must be an integer",
          "INVALID_SORT_ORDER"
        );
      }
      if (category.sortOrder < 0) {
        return sendError(
          res,
          400,
          "sortOrder must be a non-negative integer",
          "INVALID_SORT_ORDER"
        );
      }
    }

    // Check if all category IDs exist
    const categoryIds = categories.map((cat) => cat.id);
    const existingCategories = await Category.find({
      _id: { $in: categoryIds },
    }).select("_id");
    const existingIds = existingCategories.map((cat) => cat._id.toString());

    const invalidIds = categoryIds.filter((id) => !existingIds.includes(id));
    if (invalidIds.length > 0) {
      return sendError(
        res,
        404,
        `Categories not found: ${invalidIds.join(", ")}`,
        "CATEGORIES_NOT_FOUND"
      );
    }

    // Prepare bulk write operations
    const bulkOps = categories.map((category) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(category.id) },
        update: { $set: { sortOrder: category.sortOrder } },
      },
    }));

    // Execute bulk update
    const result = await Category.bulkWrite(bulkOps);

    // Fetch updated categories to return
    const updatedCategories = await Category.find({ _id: { $in: categoryIds } })
      .populate("createdBy", "name email")
      .sort({ sortOrder: 1, name: 1 });

    // Transform categories to match frontend interface
    const transformedCategories = updatedCategories.map((category) => ({
      _id: category._id,
      name: category.name,
      description: category.description || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString(),
    }));

    const response = {
      success: true,
      exception: null,
      description: "Category sort order updated successfully",
      content: {
        categories: transformedCategories,
        total: transformedCategories.length,
        updatedCount: result.modifiedCount,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error updating category sort order:", error);
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getHomeCategories,
  updateCategorySortOrder,
  getMobileHomeContent,
  // New: summarized categories with limited services and counts
  getCategoryServiceSummary: async (req, res, next) => {
    try {
      // Fetch active categories
      const categories = await Category.find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      // Helper function to transform service
      const transformService = (svc) => {
        const tiers = Array.isArray(svc.timeBasedPricing)
          ? svc.timeBasedPricing
          : [];
        const perHourPrice =
          svc.unitType === "per_hour" && tiers.length > 0
            ? tiers.reduce((min, tier) => {
                if (!tier || typeof tier.price !== "number") {
                  return min;
                }
                if (min === null || tier.price < min) {
                  return tier.price;
                }
                return min;
              }, null)
            : null;

        return {
          id: svc._id,
          name: svc.name,
          icon: svc.service_icon || svc.imageUri,
          thumbnail: svc.thumbnailUri ?? "",
          price: perHourPrice !== null ? perHourPrice : svc.basePrice,
          unitType: svc.unitType,
          termsCondition: svc.termsCondition ?? "",
        };
      };

      // Helper function to process services by serviceType
      const processServicesByType = async (serviceType) => {
        const results = await Promise.all(
          categories.map(async (category) => {
            const [totalServices, services] = await Promise.all([
              Service.countDocuments({
                category_id: category._id,
                isActive: true,
                serviceType: serviceType,
              }),
              Service.find({
                category_id: category._id,
                isActive: true,
                serviceType: serviceType,
              })
                .sort({ createdAt: -1 })
                .select({
                  _id: 1,
                  name: 1,
                  service_icon: 1,
                  basePrice: 1,
                  unitType: 1,
                  timeBasedPricing: 1,
                  imageUri: 1,
                  thumbnailUri: 1,
                  termsCondition: 1,
                })
                .lean(),
            ]);

            return {
              id: category._id,
              name: category.name,
              sortOrder: category.sortOrder ?? 0,
              totalServices,
              services: services.map(transformService),
            };
          })
        );

        // Filter out categories with no services and sort
        const filteredResults = results
          .filter((cat) => cat.totalServices > 0)
          .sort((a, b) => {
            // Sort by sortOrder first, then by name
            const sortOrderA = a.sortOrder ?? 0;
            const sortOrderB = b.sortOrder ?? 0;
            if (sortOrderA !== sortOrderB) {
              return sortOrderA - sortOrderB;
            }
            return a.name.localeCompare(b.name);
          });

        return filteredResults;
      };

      // Process residential and commercial services
      const [residential, commercial] = await Promise.all([
        processServicesByType("residential"),
        processServicesByType("commercial"),
      ]);

      // Return structured response
      return sendSuccess(
        res,
        200,
        "Category service summary retrieved successfully",
        {
          residential,
          commercial,
        }
      );
    } catch (error) {
      return next(error);
    }
  },
};
