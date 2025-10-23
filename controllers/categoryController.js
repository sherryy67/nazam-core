const Category = require('../models/Category');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');

// @desc    Create a new category
// @route   POST /api/categories
// @access  Admin only
const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

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
      createdBy: req.user.id
    };

    const category = await Category.create(categoryData);

    sendCreated(res, 'Category created successfully', category);
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
      .sort({ name: 1 });

    sendSuccess(res, 200, 'Categories retrieved successfully', categories);
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
      .sort({ name: 1 });

    sendSuccess(res, 200, 'All categories retrieved successfully', categories);
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

    sendSuccess(res, 200, 'Category retrieved successfully', category);
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
    const { name, isActive } = req.body;

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
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    sendSuccess(res, 200, 'Category updated successfully', updatedCategory);
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

    sendSuccess(res, 200, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCategory,
  getCategories,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
