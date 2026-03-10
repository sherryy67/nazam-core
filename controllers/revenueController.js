const RevenueTransaction = require('../models/RevenueTransaction');
const { sendSuccess, sendError } = require('../utils/response');
const mongoose = require('mongoose');

/**
 * @desc    Get all revenue transactions (Admin only)
 * @route   GET /api/revenue
 * @access  Private (Admin)
 */
const getAllRevenue = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, paymentStatus, vendorId, organizationId, propertyOwnerId } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (vendorId) query.vendor = vendorId;
    if (organizationId) query.organization = organizationId;
    if (propertyOwnerId) query.propertyOwner = propertyOwnerId;

    const [transactions, total, summary] = await Promise.all([
      RevenueTransaction.find(query)
        .populate('vendor', 'firstName lastName email')
        .populate('organization', 'name')
        .populate('propertyOwner', 'name')
        .populate('task', 'title status taskDate')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      RevenueTransaction.countDocuments(query),
      RevenueTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalVendorShare: { $sum: '$vendorShare' },
            totalOrganizationShare: { $sum: '$organizationShare' },
            totalPropertyOwnerShare: { $sum: '$propertyOwnerShare' },
            totalPlatformShare: { $sum: '$platformShare' },
            pendingAmount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, '$totalAmount', 0] }
            },
            completedAmount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Completed'] }, '$totalAmount', 0] }
            }
          }
        }
      ])
    ]);

    sendSuccess(res, 200, 'Revenue transactions retrieved successfully', {
      transactions,
      summary: summary[0] || {
        totalRevenue: 0, totalVendorShare: 0, totalOrganizationShare: 0,
        totalPropertyOwnerShare: 0, totalPlatformShare: 0,
        pendingAmount: 0, completedAmount: 0
      },
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update revenue transaction payment status (Admin only)
 * @route   PUT /api/revenue/:id/status
 * @access  Private (Admin)
 */
const updateRevenueStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Completed', 'Failed'];

    if (!validStatuses.includes(paymentStatus)) {
      return sendError(res, 400, 'Invalid payment status', 'INVALID_STATUS');
    }

    const updateData = { paymentStatus };
    if (paymentStatus === 'Completed') {
      updateData.vendorPaidAt = new Date();
      updateData.organizationPaidAt = new Date();
      updateData.propertyOwnerPaidAt = new Date();
    }

    const transaction = await RevenueTransaction.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate('vendor', 'firstName lastName email')
      .populate('organization', 'name')
      .populate('propertyOwner', 'name');

    if (!transaction) {
      return sendError(res, 404, 'Transaction not found', 'NOT_FOUND');
    }

    sendSuccess(res, 200, 'Revenue status updated successfully', { transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get revenue summary for organization
 * @route   GET /api/revenue/organization
 * @access  Private (Organization)
 */
const getOrganizationRevenue = async (req, res, next) => {
  try {
    const orgId = req.user.id;
    const { page = 1, limit = 10, paymentStatus } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = { organization: orgId };
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const [transactions, total, summary] = await Promise.all([
      RevenueTransaction.find(query)
        .populate('vendor', 'firstName lastName')
        .populate('task', 'title status taskDate')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      RevenueTransaction.countDocuments(query),
      RevenueTransaction.aggregate([
        { $match: { organization: new mongoose.Types.ObjectId(orgId) } },
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

    sendSuccess(res, 200, 'Organization revenue retrieved successfully', {
      transactions,
      summary: summary[0] || {
        totalRevenue: 0, organizationShare: 0, vendorShare: 0,
        pendingPayments: 0, completedPayments: 0
      },
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get revenue summary for property owner
 * @route   GET /api/revenue/property-owner
 * @access  Private (Property Owner)
 */
const getPropertyOwnerRevenue = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = { propertyOwner: ownerId };

    const [transactions, total, summary] = await Promise.all([
      RevenueTransaction.find(query)
        .populate('vendor', 'firstName lastName')
        .populate('task', 'title status taskDate')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      RevenueTransaction.countDocuments(query),
      RevenueTransaction.aggregate([
        { $match: { propertyOwner: new mongoose.Types.ObjectId(ownerId) } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            propertyOwnerShare: { $sum: '$propertyOwnerShare' },
            pendingPayments: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Pending'] }, '$propertyOwnerShare', 0] }
            },
            completedPayments: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'Completed'] }, '$propertyOwnerShare', 0] }
            }
          }
        }
      ])
    ]);

    sendSuccess(res, 200, 'Property owner revenue retrieved successfully', {
      transactions,
      summary: summary[0] || {
        totalRevenue: 0, propertyOwnerShare: 0,
        pendingPayments: 0, completedPayments: 0
      },
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRevenue,
  updateRevenueStatus,
  getOrganizationRevenue,
  getPropertyOwnerRevenue
};
