const Category = require('../models/Category');
const Service = require('../models/Service');
const mongoose = require('mongoose');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');

// @desc    Create a new category
// @route   POST /api/categories
// @access  Admin only
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Validate required fields
    if (!name || name.trim().length === 0) {
      return sendError(res, 400, 'Category name is required', 'MISSING_REQUIRED_FIELDS');
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });

    if (existingCategory) {
      return sendError(res, 409, 'Category with this name already exists', 'CATEGORY_EXISTS');
    }

    const categoryData = {
      name: name.trim(),
      description: description ? description.trim() : undefined,
      createdBy: req.user.id
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
      updatedAt: category.updatedAt?.toISOString()
    };

    const response = {
      success: true,
      exception: null,
      description: 'Category created successfully',
      content: {
        categories: [transformedCategory],
        total: 1
      }
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
      .populate('createdBy', 'name email')
      .sort({ sortOrder: 1, name: 1 });

    // Transform categories to match frontend interface
    const transformedCategories = categories.map(category => ({
      _id: category._id,
      name: category.name,
      description: category.description || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString()
    }));

    const response = {
      success: true,
      exception: null,
      description: 'Categories retrieved successfully',
      content: {
        categories: transformedCategories,
        total: transformedCategories.length
      }
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
      .populate('createdBy', 'name email')
      .sort({ sortOrder: 1, name: 1 });

    // Transform categories to match frontend interface
    const transformedCategories = categories.map(category => ({
      _id: category._id,
      name: category.name,
      description: category.description || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString()
    }));

    const response = {
      success: true,
      exception: null,
      description: 'All categories retrieved successfully',
      content: {
        categories: transformedCategories,
        total: transformedCategories.length
      }
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

    const category = await Category.findById(id)
      .populate('createdBy', 'name email');

    if (!category) {
      return sendError(res, 404, 'Category not found', 'CATEGORY_NOT_FOUND');
    }

    // Transform category to match frontend interface
    const transformedCategory = {
      _id: category._id,
      name: category.name,
      description: category.description || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString()
    };

    const response = {
      success: true,
      exception: null,
      description: 'Category retrieved successfully',
      content: {
        categories: [transformedCategory],
        total: 1
      }
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
      return sendError(res, 404, 'Category not found', 'CATEGORY_NOT_FOUND');
    }

    // Check if new name conflicts with existing category
    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingCategory) {
        return sendError(res, 409, 'Category with this name already exists', 'CATEGORY_EXISTS');
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : undefined;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    // Transform category to match frontend interface
    const transformedCategory = {
      _id: updatedCategory._id,
      name: updatedCategory.name,
      description: updatedCategory.description || undefined,
      isActive: updatedCategory.isActive,
      sortOrder: updatedCategory.sortOrder || 0,
      createdAt: updatedCategory.createdAt?.toISOString(),
      updatedAt: updatedCategory.updatedAt?.toISOString()
    };

    const response = {
      success: true,
      exception: null,
      description: 'Category updated successfully',
      content: {
        categories: [transformedCategory],
        total: 1
      }
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
      return sendError(res, 404, 'Category not found', 'CATEGORY_NOT_FOUND');
    }

    // Check if category is being used by any services
    const Service = require('../models/Service');
    const servicesUsingCategory = await Service.countDocuments({ category_id: id });

    if (servicesUsingCategory > 0) {
      return sendError(res, 400, `Cannot delete category. It is being used by ${servicesUsingCategory} service(s)`, 'CATEGORY_IN_USE');
    }

    // Soft delete by setting isActive to false
    await Category.findByIdAndUpdate(id, { isActive: false });

    const response = {
      success: true,
      exception: null,
      description: 'Category deleted successfully',
      content: {
        categories: [],
        total: 0
      }
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
          isActive: true
        })
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 });

        // Transform category
        const transformedCategory = {
          _id: category._id,
          name: category.name,
          description: category.description || undefined,
          isActive: category.isActive,
          sortOrder: category.sortOrder || 0,
          createdAt: category.createdAt?.toISOString(),
          updatedAt: category.updatedAt?.toISOString()
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
            min_time_required: service.min_time_required,
            availability: service.availability,
            job_service_type: service.job_service_type,
            order_name: service.order_name,
            price_type: service.price_type,
            subservice_type: service.subservice_type,
            isFeatured: service.isFeatured,
            isActive: service.isActive,
            createdBy: service.createdBy,
            createdAt: service.createdAt?.toISOString(),
            updatedAt: service.updatedAt?.toISOString()
          };
        }

        return {
          category: transformedCategory,
          service: transformedService
        };
      })
    );

    // Return ALL categories (with or without services)
    const response = {
      success: true,
      exception: null,
      description: 'Home categories retrieved successfully',
      content: {
        categories: categoriesWithServices,
        total: categoriesWithServices.length
      }
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
    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    if (!categories.length) {
      return sendSuccess(res, 200, 'No categories available', {
        categories: [],
        total: 0
      });
    }

    const categoryIds = categories.map(category => category._id);

    const services = await Service.find({
      category_id: { $in: categoryIds },
      isActive: true
    })
      .sort({ name: 1 })
      .lean();

    const servicesByCategory = services.reduce((acc, service) => {
      const key = service.category_id.toString();
      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push({
        _id: service._id,
        name: service.name,
        description: service.description || undefined,
        basePrice: service.basePrice,
        unitType: service.unitType,
        imageUri: service.imageUri || undefined,
        service_icon: service.service_icon || undefined,
        category_id: service.category_id,
        min_time_required: service.min_time_required,
        availability: service.availability || [],
        job_service_type: service.job_service_type,
        order_name: service.order_name || undefined,
        price_type: service.price_type || undefined,
        subservice_type: service.subservice_type || undefined,
        isFeatured: service.isFeatured,
        subServices: Array.isArray(service.subServices) ? service.subServices : [],
        isActive: service.isActive,
        createdAt: service.createdAt ? service.createdAt.toISOString() : undefined,
        updatedAt: service.updatedAt ? service.updatedAt.toISOString() : undefined
      });

      return acc;
    }, {});

    const transformedCategories = categories.map(category => {
      const categoryServices = servicesByCategory[category._id.toString()] || [];

      return {
        _id: category._id,
        name: category.name,
        description: category.description || undefined,
        isActive: category.isActive,
        sortOrder: category.sortOrder || 0,
        createdAt: category.createdAt ? category.createdAt.toISOString() : undefined,
        updatedAt: category.updatedAt ? category.updatedAt.toISOString() : undefined,
        services: categoryServices
      };
    });

    return sendSuccess(res, 200, 'Mobile home content retrieved successfully', {
      categories: transformedCategories,
      total: transformedCategories.length
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
      return sendError(res, 400, 'Categories array is required and must not be empty', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate each category object
    for (const category of categories) {
      if (!category.id) {
        return sendError(res, 400, 'Category ID is required for each category', 'MISSING_CATEGORY_ID');
      }
      if (!mongoose.Types.ObjectId.isValid(category.id)) {
        return sendError(res, 400, `Invalid category ID format: ${category.id}`, 'INVALID_CATEGORY_ID');
      }
      if (category.sortOrder === undefined || category.sortOrder === null) {
        return sendError(res, 400, 'sortOrder is required for each category', 'MISSING_SORT_ORDER');
      }
      if (typeof category.sortOrder !== 'number' || !Number.isInteger(category.sortOrder)) {
        return sendError(res, 400, 'sortOrder must be an integer', 'INVALID_SORT_ORDER');
      }
      if (category.sortOrder < 0) {
        return sendError(res, 400, 'sortOrder must be a non-negative integer', 'INVALID_SORT_ORDER');
      }
    }

    // Check if all category IDs exist
    const categoryIds = categories.map(cat => cat.id);
    const existingCategories = await Category.find({ _id: { $in: categoryIds } }).select('_id');
    const existingIds = existingCategories.map(cat => cat._id.toString());

    const invalidIds = categoryIds.filter(id => !existingIds.includes(id));
    if (invalidIds.length > 0) {
      return sendError(res, 404, `Categories not found: ${invalidIds.join(', ')}`, 'CATEGORIES_NOT_FOUND');
    }

    // Prepare bulk write operations
    const bulkOps = categories.map(category => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(category.id) },
        update: { $set: { sortOrder: category.sortOrder } }
      }
    }));

    // Execute bulk update
    const result = await Category.bulkWrite(bulkOps);

    // Fetch updated categories to return
    const updatedCategories = await Category.find({ _id: { $in: categoryIds } })
      .populate('createdBy', 'name email')
      .sort({ sortOrder: 1, name: 1 });

    // Transform categories to match frontend interface
    const transformedCategories = updatedCategories.map(category => ({
      _id: category._id,
      name: category.name,
      description: category.description || undefined,
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0,
      createdAt: category.createdAt?.toISOString(),
      updatedAt: category.updatedAt?.toISOString()
    }));

    const response = {
      success: true,
      exception: null,
      description: 'Category sort order updated successfully',
      content: {
        categories: transformedCategories,
        total: transformedCategories.length,
        updatedCount: result.modifiedCount
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error updating category sort order:', error);
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
      const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();

      // For each category, fetch service count and up to 3 services
      const results = await Promise.all(categories.map(async (category) => {
        const [totalServices, services] = await Promise.all([
          Service.countDocuments({ category_id: category._id, isActive: true }),
          Service.find({ category_id: category._id, isActive: true })
            .sort({ createdAt: -1 })
            .limit(3)
            .select({ _id: 1, name: 1, service_icon: 1, basePrice: 1 })
            .lean()
        ]);

        return {
          id: category._id,
          name: category.name,
          sortOrder: category.sortOrder || 0,
          totalServices,
          services: services.map(svc => ({
            id: svc._id,
            name: svc.name,
            icon: svc.service_icon || null,
            price: svc.basePrice
          }))
        };
      }));

      // Sort by sortOrder ascending, then by name as secondary sort
      results.sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      });

      // Use generic response model; content is the array as requested
      return sendSuccess(res, 200, 'Category service summary retrieved successfully', results);
    } catch (error) {
      return next(error);
    }
  }
};
