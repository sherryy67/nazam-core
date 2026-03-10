const Property = require('../models/Property');
const Unit = require('../models/Unit');
const PropertyOwner = require('../models/PropertyOwner');
const User = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');
const AMCContract = require('../models/AMCContract');
const ReferralCode = require('../models/ReferralCode');
const { sendSuccess, sendError, sendNotFoundError } = require('../utils/response');

/**
 * @desc    Create property owner (Admin only)
 * @route   POST /api/properties/owners
 * @access  Private (Admin)
 */
const createPropertyOwner = async (req, res, next) => {
  try {
    const { name, email, password, phone, address, city, country, commissionPercentage, idType, idNumber } = req.body;

    if (!name || !email || !password || !phone) {
      return sendError(res, 400, 'Name, email, password and phone are required', 'MISSING_FIELDS');
    }

    const existing = await PropertyOwner.findOne({ email });
    if (existing) {
      return sendError(res, 409, 'Property owner with this email already exists', 'DUPLICATE_EMAIL');
    }

    const owner = await PropertyOwner.create({
      name, email, password, phone, address, city, country,
      commissionPercentage: commissionPercentage || 0,
      idType, idNumber,
      createdBy: req.user.id
    });

    sendSuccess(res, 201, 'Property owner created successfully', { owner });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all property owners (Admin only)
 * @route   GET /api/properties/owners
 * @access  Private (Admin)
 */
const getAllPropertyOwners = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [owners, total] = await Promise.all([
      PropertyOwner.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      PropertyOwner.countDocuments(query)
    ]);

    sendSuccess(res, 200, 'Property owners retrieved successfully', {
      owners,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Property owner login
 * @route   POST /api/properties/owners/login
 * @access  Public
 */
const propertyOwnerLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required', 'MISSING_FIELDS');
    }

    const owner = await PropertyOwner.findOne({ email });
    if (!owner) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (!owner.isActive) {
      return sendError(res, 403, 'Account is deactivated', 'OWNER_DEACTIVATED');
    }

    const isMatch = await owner.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const token = owner.generateAuthToken();
    sendSuccess(res, 200, 'Login successful', { token, owner });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create property (Admin only)
 * @route   POST /api/properties
 * @access  Private (Admin)
 */
const createProperty = async (req, res, next) => {
  try {
    const { name, address, city, country, type, ownerId, totalUnits } = req.body;

    if (!name || !address || !city || !type || !ownerId) {
      return sendError(res, 400, 'Name, address, city, type and ownerId are required', 'MISSING_FIELDS');
    }

    const owner = await PropertyOwner.findById(ownerId);
    if (!owner) {
      return sendNotFoundError(res, 'Property owner not found');
    }

    const property = await Property.create({
      name, address, city, country, type,
      owner: ownerId,
      totalUnits: totalUnits || 0,
      createdBy: req.user.id
    });

    sendSuccess(res, 201, 'Property created successfully', { property });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all properties (Admin) or owner's properties (Property Owner)
 * @route   GET /api/properties
 * @access  Private (Admin or Property Owner)
 */
const getProperties = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const ROLES = require('../constants/roles');

    const query = {};
    // If property owner, scope to their own properties
    if (req.user.role === ROLES.PROPERTY_OWNER) {
      query.owner = req.user.id;
    }

    const [properties, total] = await Promise.all([
      Property.find(query)
        .populate('owner', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Property.countDocuments(query)
    ]);

    sendSuccess(res, 200, 'Properties retrieved successfully', {
      properties,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get property by ID with units
 * @route   GET /api/properties/:id
 * @access  Private (Admin or Property Owner)
 */
const getPropertyById = async (req, res, next) => {
  try {
    const ROLES = require('../constants/roles');
    const property = await Property.findById(req.params.id)
      .populate('owner', 'name email phone');

    if (!property) {
      return sendNotFoundError(res, 'Property not found');
    }

    // Property owners can only see their own properties
    if (req.user.role === ROLES.PROPERTY_OWNER && property.owner._id.toString() !== req.user.id) {
      return sendError(res, 403, 'Access denied', 'FORBIDDEN');
    }

    const units = await Unit.find({ property: property._id })
      .populate('tenant', 'name email phoneNumber')
      .sort({ unitNumber: 1 });

    sendSuccess(res, 200, 'Property retrieved successfully', { property, units });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create unit in a property (Admin only)
 * @route   POST /api/properties/:propertyId/units
 * @access  Private (Admin)
 */
const createUnit = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { unitNumber, type, floor } = req.body;

    if (!unitNumber || !type) {
      return sendError(res, 400, 'Unit number and type are required', 'MISSING_FIELDS');
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return sendNotFoundError(res, 'Property not found');
    }

    const unit = await Unit.create({
      property: propertyId,
      unitNumber, type, floor
    });

    // Update total units count
    await Property.findByIdAndUpdate(propertyId, { $inc: { totalUnits: 1 } });

    sendSuccess(res, 201, 'Unit created successfully', { unit });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, 'Unit number already exists in this property', 'DUPLICATE_UNIT');
    }
    next(error);
  }
};

/**
 * @desc    Bulk create units (Admin only)
 * @route   POST /api/properties/:propertyId/units/bulk
 * @access  Private (Admin)
 */
const bulkCreateUnits = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { units } = req.body; // Array of { unitNumber, type, floor }

    if (!Array.isArray(units) || units.length === 0) {
      return sendError(res, 400, 'Units array is required', 'MISSING_FIELDS');
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return sendNotFoundError(res, 'Property not found');
    }

    const unitDocs = units.map(u => ({
      property: propertyId,
      unitNumber: u.unitNumber,
      type: u.type,
      floor: u.floor
    }));

    const created = await Unit.insertMany(unitDocs, { ordered: false });

    await Property.findByIdAndUpdate(propertyId, { $inc: { totalUnits: created.length } });

    sendSuccess(res, 201, `${created.length} units created successfully`, { units: created });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, 'Some unit numbers already exist in this property', 'DUPLICATE_UNITS');
    }
    next(error);
  }
};

/**
 * @desc    Get property owner dashboard (tenants, requests, AMC tracking)
 * @route   GET /api/properties/owner/dashboard
 * @access  Private (Property Owner)
 */
const getPropertyOwnerDashboard = async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    // Get all properties owned
    const properties = await Property.find({ owner: ownerId });
    const propertyIds = properties.map(p => p._id);

    // Get all units across properties
    const units = await Unit.find({ property: { $in: propertyIds } })
      .populate('tenant', 'name email phoneNumber');

    const occupiedUnits = units.filter(u => u.isOccupied && u.tenant);
    const tenantIds = occupiedUnits.map(u => u.tenant._id);

    // Get service requests from linked tenants
    const [totalRequests, pendingRequests, completedRequests, recentRequests] = await Promise.all([
      ServiceRequest.countDocuments({
        $or: [
          { propertyId: { $in: propertyIds } },
          { user: { $in: tenantIds } }
        ]
      }),
      ServiceRequest.countDocuments({
        $or: [
          { propertyId: { $in: propertyIds } },
          { user: { $in: tenantIds } }
        ],
        status: 'Pending'
      }),
      ServiceRequest.countDocuments({
        $or: [
          { propertyId: { $in: propertyIds } },
          { user: { $in: tenantIds } }
        ],
        status: 'Completed'
      }),
      ServiceRequest.find({
        $or: [
          { propertyId: { $in: propertyIds } },
          { user: { $in: tenantIds } }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('vendor', 'firstName lastName')
        .select('user_name service_name status requested_date total_price propertyId unitId')
    ]);

    // Get AMC contracts for tenants
    const amcContracts = await AMCContract.countDocuments({
      $or: [
        { propertyId: { $in: propertyIds } },
        { user: { $in: tenantIds } }
      ]
    });

    sendSuccess(res, 200, 'Property owner dashboard retrieved successfully', {
      properties: {
        total: properties.length,
        list: properties.map(p => ({ _id: p._id, name: p.name, city: p.city, type: p.type }))
      },
      units: {
        total: units.length,
        occupied: occupiedUnits.length,
        vacant: units.length - occupiedUnits.length
      },
      tenants: {
        total: tenantIds.length,
        list: occupiedUnits.map(u => ({
          unit: u.unitNumber,
          property: u.property,
          tenant: u.tenant
        }))
      },
      serviceRequests: {
        total: totalRequests,
        pending: pendingRequests,
        completed: completedRequests,
        recent: recentRequests
      },
      amcContracts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all service requests across owner's properties (tracking)
 * @route   GET /api/properties/owner/service-requests
 * @access  Private (Property Owner)
 */
const getPropertyOwnerServiceRequests = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { page = 1, limit = 10, status, propertyId } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Get all properties owned
    const properties = await Property.find({ owner: ownerId });
    const propertyIds = propertyId
      ? [propertyId]
      : properties.map(p => p._id);

    // Get tenant IDs from units
    const units = await Unit.find({ property: { $in: propertyIds }, isOccupied: true });
    const tenantIds = units.filter(u => u.tenant).map(u => u.tenant);

    const query = {
      $or: [
        { propertyId: { $in: propertyIds } },
        { user: { $in: tenantIds } }
      ]
    };
    if (status) query.status = status;

    const [requests, total] = await Promise.all([
      ServiceRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('vendor', 'firstName lastName email mobileNumber')
        .populate('amcContract', 'contractNumber status'),
      ServiceRequest.countDocuments(query)
    ]);

    sendSuccess(res, 200, 'Service requests retrieved successfully', {
      requests,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Property owner creates service request on behalf of tenant
 * @route   POST /api/properties/owner/service-requests
 * @access  Private (Property Owner)
 */
const createServiceRequestOnBehalf = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { tenantId, unitId, ...requestData } = req.body;

    if (!tenantId) {
      return sendError(res, 400, 'Tenant ID is required', 'MISSING_FIELDS');
    }

    // Verify tenant is in owner's property
    const unit = await Unit.findOne({ _id: unitId, tenant: tenantId })
      .populate('property');
    if (!unit) {
      return sendError(res, 400, 'Tenant is not linked to this unit', 'INVALID_TENANT');
    }

    // Verify property belongs to this owner
    if (unit.property.owner.toString() !== ownerId) {
      return sendError(res, 403, 'This property does not belong to you', 'FORBIDDEN');
    }

    const tenant = await User.findById(tenantId);
    if (!tenant) {
      return sendNotFoundError(res, 'Tenant not found');
    }

    // Create service request with property tracking
    const serviceRequest = await ServiceRequest.create({
      ...requestData,
      user: tenantId,
      user_name: tenant.name,
      user_phone: tenant.phoneNumber,
      user_email: tenant.email,
      propertyId: unit.property._id,
      unitId: unit._id,
      createdOnBehalfOf: tenantId,
      createdByPropertyOwner: ownerId
    });

    sendSuccess(res, 201, 'Service request created on behalf of tenant', { serviceRequest });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPropertyOwner,
  getAllPropertyOwners,
  propertyOwnerLogin,
  createProperty,
  getProperties,
  getPropertyById,
  createUnit,
  bulkCreateUnits,
  getPropertyOwnerDashboard,
  getPropertyOwnerServiceRequests,
  createServiceRequestOnBehalf
};
