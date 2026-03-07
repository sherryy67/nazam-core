const Task = require('../models/Task');
const ServiceRequest = require('../models/ServiceRequest');
const Vendor = require('../models/Vendor');
const RevenueTransaction = require('../models/RevenueTransaction');
const Organization = require('../models/Organization');
const PropertyOwner = require('../models/PropertyOwner');
const { sendSuccess, sendError, sendNotFoundError } = require('../utils/response');

/**
 * @desc    Create task from service request (Admin only)
 * @route   POST /api/tasks
 * @access  Private (Admin)
 */
const createTask = async (req, res, next) => {
  try {
    const {
      serviceRequestId, vendorId, title, description,
      location, city, taskDate, taskTime, isAMC, amcContractId
    } = req.body;

    if (!serviceRequestId || !vendorId || !title || !taskDate) {
      return sendError(res, 400, 'serviceRequestId, vendorId, title and taskDate are required', 'MISSING_FIELDS');
    }

    // Validate service request
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return sendNotFoundError(res, 'Service request not found');
    }

    // Validate vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }
    if (!vendor.approved) {
      return sendError(res, 400, 'Vendor is not approved', 'VENDOR_NOT_APPROVED');
    }

    const task = await Task.create({
      serviceRequest: serviceRequestId,
      vendor: vendorId,
      organization: vendor.organizationId || null,
      title,
      description,
      location: location || serviceRequest.address,
      city: city || vendor.coveredCity,
      taskDate,
      taskTime,
      serviceName: serviceRequest.service_name,
      serviceType: serviceRequest.request_type,
      taskAmount: serviceRequest.total_price || 0,
      isAMC: isAMC || false,
      amcContract: amcContractId || serviceRequest.amcContract || null,
      property: serviceRequest.propertyId || null,
      unit: serviceRequest.unitId || null,
      status: 'Created',
      createdBy: req.user.id
    });

    // Update service request status
    await ServiceRequest.findByIdAndUpdate(serviceRequestId, {
      status: 'Assigned',
      vendor: vendorId
    });

    const populatedTask = await Task.findById(task._id)
      .populate('vendor', 'firstName lastName email mobileNumber')
      .populate('serviceRequest', 'service_name user_name request_type');

    sendSuccess(res, 201, 'Task created successfully', { task: populatedTask });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all tasks (Admin only, with filters)
 * @route   GET /api/tasks
 * @access  Private (Admin)
 */
const getAllTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, vendorId, organizationId, isAMC } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (vendorId) query.vendor = vendorId;
    if (organizationId) query.organization = organizationId;
    if (isAMC !== undefined) query.isAMC = isAMC === 'true';

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('vendor', 'firstName lastName email mobileNumber')
        .populate('organization', 'name')
        .populate('serviceRequest', 'service_name user_name request_type total_price')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Task.countDocuments(query)
    ]);

    sendSuccess(res, 200, 'Tasks retrieved successfully', {
      tasks,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get vendor's tasks (Vendor)
 * @route   GET /api/tasks/my-tasks
 * @access  Private (Vendor)
 */
const getVendorTasks = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const query = { vendor: vendorId };
    if (status) query.status = status;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('serviceRequest', 'service_name user_name user_phone request_type total_price address')
        .populate('organization', 'name')
        .sort({ taskDate: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Task.countDocuments(query)
    ]);

    sendSuccess(res, 200, 'Vendor tasks retrieved successfully', {
      tasks,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vendor accepts a task
 * @route   PUT /api/tasks/:taskId/accept
 * @access  Private (Vendor)
 */
const acceptTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const vendorId = req.user.id;

    const task = await Task.findOne({ _id: taskId, vendor: vendorId });
    if (!task) {
      return sendNotFoundError(res, 'Task not found');
    }

    if (!['Created', 'Notified'].includes(task.status)) {
      return sendError(res, 400, `Cannot accept task with status: ${task.status}`, 'INVALID_STATUS');
    }

    task.status = 'Accepted';
    task.vendorResponse = { action: 'Accepted', respondedAt: new Date() };
    await task.save();

    // Update service request status
    await ServiceRequest.findByIdAndUpdate(task.serviceRequest, { status: 'Accepted' });

    sendSuccess(res, 200, 'Task accepted successfully', { task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vendor cancels a task
 * @route   PUT /api/tasks/:taskId/cancel
 * @access  Private (Vendor)
 */
const cancelTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const vendorId = req.user.id;
    const { reason } = req.body;

    const task = await Task.findOne({ _id: taskId, vendor: vendorId });
    if (!task) {
      return sendNotFoundError(res, 'Task not found');
    }

    if (!['Created', 'Notified', 'Accepted'].includes(task.status)) {
      return sendError(res, 400, `Cannot cancel task with status: ${task.status}`, 'INVALID_STATUS');
    }

    task.status = 'Cancelled';
    task.vendorResponse = {
      action: 'Cancelled',
      respondedAt: new Date(),
      cancellationReason: reason || ''
    };
    await task.save();

    // Revert service request to Pending so admin can reassign
    await ServiceRequest.findByIdAndUpdate(task.serviceRequest, {
      status: 'Pending',
      vendor: null
    });

    sendSuccess(res, 200, 'Task cancelled successfully', { task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vendor starts work on task
 * @route   PUT /api/tasks/:taskId/start
 * @access  Private (Vendor)
 */
const startTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const vendorId = req.user.id;

    const task = await Task.findOne({ _id: taskId, vendor: vendorId });
    if (!task) {
      return sendNotFoundError(res, 'Task not found');
    }

    if (task.status !== 'Accepted') {
      return sendError(res, 400, 'Task must be accepted before starting', 'INVALID_STATUS');
    }

    task.status = 'InProgress';
    await task.save();

    await ServiceRequest.findByIdAndUpdate(task.serviceRequest, { status: 'InProgress' });

    sendSuccess(res, 200, 'Task started successfully', { task });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Vendor marks task as completed
 * @route   PUT /api/tasks/:taskId/complete
 * @access  Private (Vendor)
 */
const completeTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const vendorId = req.user.id;
    const { completionNotes } = req.body;

    const task = await Task.findOne({ _id: taskId, vendor: vendorId });
    if (!task) {
      return sendNotFoundError(res, 'Task not found');
    }

    if (task.status !== 'InProgress') {
      return sendError(res, 400, 'Task must be in progress to complete', 'INVALID_STATUS');
    }

    task.status = 'Completed';
    task.completedAt = new Date();
    task.completionNotes = completionNotes || '';
    await task.save();

    // Update service request
    await ServiceRequest.findByIdAndUpdate(task.serviceRequest, { status: 'Completed' });

    // Generate revenue transaction
    if (task.taskAmount > 0) {
      await generateRevenueTransaction(task);
    }

    sendSuccess(res, 200, 'Task completed successfully', { task });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate revenue transaction when a task is completed
 */
const generateRevenueTransaction = async (task) => {
  try {
    const totalAmount = task.taskAmount;
    let orgCommissionPercent = 0;
    let orgShare = 0;
    let ownerCommissionPercent = 0;
    let ownerShare = 0;

    // Calculate organization commission
    if (task.organization) {
      const org = await Organization.findById(task.organization);
      if (org) {
        orgCommissionPercent = org.commissionPercentage;
        orgShare = (totalAmount * orgCommissionPercent) / 100;
      }
    }

    // Calculate property owner commission
    if (task.property) {
      const Property = require('../models/Property');
      const property = await Property.findById(task.property).populate('owner');
      if (property && property.owner) {
        ownerCommissionPercent = property.owner.commissionPercentage;
        ownerShare = (totalAmount * ownerCommissionPercent) / 100;
      }
    }

    const vendorShare = totalAmount - orgShare - ownerShare;

    await RevenueTransaction.create({
      task: task._id,
      serviceRequest: task.serviceRequest,
      vendor: task.vendor,
      organization: task.organization || null,
      propertyOwner: task.property ? (await require('../models/Property').findById(task.property))?.owner : null,
      totalAmount,
      organizationCommissionPercent: orgCommissionPercent,
      organizationShare: orgShare,
      propertyOwnerCommissionPercent: ownerCommissionPercent,
      propertyOwnerShare: ownerShare,
      vendorShare: Math.max(vendorShare, 0),
      platformShare: 0,
      paymentStatus: 'Pending'
    });
  } catch (error) {
    console.error('Error generating revenue transaction:', error);
  }
};

/**
 * @desc    Get task by ID
 * @route   GET /api/tasks/:taskId
 * @access  Private (Admin/Vendor)
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('vendor', 'firstName lastName email mobileNumber coveredCity')
      .populate('organization', 'name email')
      .populate('serviceRequest')
      .populate('property', 'name address city')
      .populate('unit', 'unitNumber type');

    if (!task) {
      return sendNotFoundError(res, 'Task not found');
    }

    // Vendors can only see their own tasks
    const ROLES = require('../constants/roles');
    if (req.user.role === ROLES.VENDOR && task.vendor._id.toString() !== req.user.id) {
      return sendError(res, 403, 'Access denied', 'FORBIDDEN');
    }

    sendSuccess(res, 200, 'Task retrieved successfully', { task });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTask,
  getAllTasks,
  getVendorTasks,
  acceptTask,
  cancelTask,
  startTask,
  completeTask,
  getTaskById
};
