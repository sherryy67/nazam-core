const Service = require('../models/Service');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');

// @desc    Create a new service
// @route   POST /api/services
// @access  Admin only
const createService = async (req, res, next) => {
  try {
    const { name, description, basePrice, unitType } = req.body;

    // Validate required fields
    if (!name || !basePrice || !unitType) {
      return sendError(res, 400, 'Name, basePrice, and unitType are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate unitType
    if (!['per_unit', 'per_hour'].includes(unitType)) {
      return sendError(res, 400, 'unitType must be either "per_unit" or "per_hour"', 'INVALID_UNIT_TYPE');
    }

    // Validate basePrice
    if (basePrice <= 0) {
      return sendError(res, 400, 'basePrice must be greater than 0', 'INVALID_BASE_PRICE');
    }

    const serviceData = {
      name,
      description,
      basePrice,
      unitType,
      createdBy: req.user.id
    };

    const service = await Service.create(serviceData);

    sendCreated(res, 'Service created successfully', service);
  } catch (error) {
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
      .sort({ createdAt: -1 });

    sendSuccess(res, 200, 'Services retrieved successfully', services);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createService,
  getServices
};
