const Organization = require('../models/Organization');
const Vendor = require('../models/Vendor');
const Task = require('../models/Task');
const RevenueTransaction = require('../models/RevenueTransaction');
const { sendSuccess, sendError, sendNotFoundError } = require('../utils/response');

/**
 * @desc    Create organization (Admin only)
 * @route   POST /api/organizations
 * @access  Private (Admin)
 */
const createOrganization = async (req, res, next) => {
  try {
    const { name, email, password, phone, address, city, country, commissionPercentage } = req.body;

    if (!name || !email || !password || !phone) {
      return sendError(res, 400, 'Name, email, password and phone are required', 'MISSING_FIELDS');
    }

    const existing = await Organization.findOne({ email });
    if (existing) {
      return sendError(res, 409, 'Organization with this email already exists', 'DUPLICATE_EMAIL');
    }

    const organization = await Organization.create({
      name, email, password, phone, address, city, country,
      commissionPercentage: commissionPercentage || 0,
      createdBy: req.user.id
    });

    sendSuccess(res, 201, 'Organization created successfully', { organization });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all organizations (Admin only)
 * @route   GET /api/organizations
 * @access  Private (Admin)
 */
const getAllOrganizations = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Organization.countDocuments(query)
    ]);

    sendSuccess(res, 200, 'Organizations retrieved successfully', {
      organizations,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization by ID
 * @route   GET /api/organizations/:id
 * @access  Private (Admin or Organization itself)
 */
const getOrganizationById = async (req, res, next) => {
  try {
    const organization = await Organization.findById(req.params.id).select('-password');
    if (!organization) {
      return sendNotFoundError(res, 'Organization not found');
    }

    sendSuccess(res, 200, 'Organization retrieved successfully', { organization });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update organization
 * @route   PUT /api/organizations/:id
 * @access  Private (Admin)
 */
const updateOrganization = async (req, res, next) => {
  try {
    const { name, phone, address, city, country, commissionPercentage, isActive } = req.body;

    const organization = await Organization.findById(req.params.id);
    if (!organization) {
      return sendNotFoundError(res, 'Organization not found');
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    if (commissionPercentage !== undefined) updateData.commissionPercentage = commissionPercentage;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Organization.findByIdAndUpdate(req.params.id, updateData, {
      new: true, runValidators: true
    }).select('-password');

    sendSuccess(res, 200, 'Organization updated successfully', { organization: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Organization creates a vendor under themselves
 * @route   POST /api/organizations/vendors
 * @access  Private (Organization)
 */
const createVendorForOrganization = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const vendorData = { ...req.body, organizationId: orgId, approved: true };

    const existing = await Vendor.findOne({
      $or: [{ email: vendorData.email }, { mobileNumber: vendorData.mobileNumber }]
    });
    if (existing) {
      return sendError(res, 409, 'Vendor with this email or mobile already exists', 'VENDOR_EXISTS');
    }

    const vendor = await Vendor.create(vendorData);
    sendSuccess(res, 201, 'Vendor created under organization successfully', { vendor });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendors belonging to an organization
 * @route   GET /api/organizations/vendors
 * @access  Private (Organization)
 */
const getOrganizationVendors = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const [vendors, total] = await Promise.all([
      Vendor.find({ organizationId: orgId })
        .select('-password')
        .populate('serviceId', 'name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Vendor.countDocuments({ organizationId: orgId })
    ]);

    sendSuccess(res, 200, 'Organization vendors retrieved successfully', {
      vendors,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization dashboard data
 * @route   GET /api/organizations/dashboard
 * @access  Private (Organization)
 */
const getOrganizationDashboard = async (req, res, next) => {
  try {
    const orgId = req.user.id;

    const [
      totalVendors,
      activeVendors,
      totalTasks,
      completedTasks,
      currentTasks,
      revenueData
    ] = await Promise.all([
      Vendor.countDocuments({ organizationId: orgId }),
      Vendor.countDocuments({ organizationId: orgId, approved: true }),
      Task.countDocuments({ organization: orgId }),
      Task.countDocuments({ organization: orgId, status: 'Completed' }),
      Task.countDocuments({ organization: orgId, status: { $in: ['Created', 'Notified', 'Accepted', 'InProgress'] } }),
      RevenueTransaction.aggregate([
        { $match: { organization: orgId } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            organizationShare: { $sum: '$organizationShare' },
            vendorShare: { $sum: '$vendorShare' },
            pendingPayments: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, '$organizationShare', 0] }
            },
            completedPayments: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Completed'] }, '$organizationShare', 0] }
            }
          }
        }
      ])
    ]);

    const revenue = revenueData[0] || {
      totalRevenue: 0, organizationShare: 0, vendorShare: 0,
      pendingPayments: 0, completedPayments: 0
    };

    sendSuccess(res, 200, 'Organization dashboard retrieved successfully', {
      vendors: { total: totalVendors, active: activeVendors },
      tasks: { total: totalTasks, completed: completedTasks, current: currentTasks },
      revenue
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Organization login
 * @route   POST /api/organizations/login
 * @access  Public
 */
const organizationLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required', 'MISSING_FIELDS');
    }

    const organization = await Organization.findOne({ email });
    if (!organization) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (!organization.isActive) {
      return sendError(res, 403, 'Organization account is deactivated', 'ORG_DEACTIVATED');
    }

    const isMatch = await organization.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const token = organization.generateAuthToken();
    sendSuccess(res, 200, 'Login successful', { token, organization });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization dashboard by ID (Admin only)
 * @route   GET /api/organizations/:id/dashboard
 * @access  Private (Admin)
 */
const getOrganizationDashboardById = async (req, res, next) => {
  try {
    const orgId = req.params.id;

    const org = await Organization.findById(orgId);
    if (!org) {
      return sendNotFoundError(res, 'Organization not found');
    }

    const [
      totalVendors,
      activeVendors,
      totalTasks,
      completedTasks,
      currentTasks,
      revenueData
    ] = await Promise.all([
      Vendor.countDocuments({ organizationId: orgId }),
      Vendor.countDocuments({ organizationId: orgId, approved: true }),
      Task.countDocuments({ organization: orgId }),
      Task.countDocuments({ organization: orgId, status: 'Completed' }),
      Task.countDocuments({ organization: orgId, status: { $in: ['Created', 'Notified', 'Accepted', 'InProgress'] } }),
      RevenueTransaction.aggregate([
        { $match: { organization: require('mongoose').Types.ObjectId.createFromHexString(orgId) } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            organizationShare: { $sum: '$organizationShare' },
            vendorShare: { $sum: '$vendorShare' },
            pendingPayments: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, '$organizationShare', 0] }
            },
            completedPayments: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Completed'] }, '$organizationShare', 0] }
            }
          }
        }
      ])
    ]);

    const revenue = revenueData[0] || {
      totalRevenue: 0, organizationShare: 0, vendorShare: 0,
      pendingPayments: 0, completedPayments: 0
    };

    sendSuccess(res, 200, 'Organization dashboard retrieved successfully', {
      vendors: { total: totalVendors, active: activeVendors },
      tasks: { total: totalTasks, completed: completedTasks, current: currentTasks },
      revenue
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  createVendorForOrganization,
  getOrganizationVendors,
  getOrganizationDashboard,
  getOrganizationDashboardById,
  organizationLogin
};
