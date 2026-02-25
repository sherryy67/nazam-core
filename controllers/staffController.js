const Staff = require('../models/Staff');
const Role = require('../models/Role');
const { sendSuccess, sendError } = require('../utils/response');
const ROLES = require('../constants/roles');
const { ALL_PERMISSIONS } = require('../constants/permissions');

// @desc    Create a new staff member
// @route   POST /api/staff
// @access  Private (Staff with staff:write)
const createStaff = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, password, roleId, department, assignedCity, assignedZone } = req.body;

    if (!name || !email || !password || !roleId) {
      return sendError(res, 400, 'Name, email, password, and roleId are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return sendError(res, 404, 'Role not found', 'ROLE_NOT_FOUND');
    }

    if (!role.isActive) {
      return sendError(res, 400, 'Cannot assign an inactive role', 'ROLE_INACTIVE');
    }

    // Check if staff with this email already exists
    const existingStaff = await Staff.findOne({ email });
    if (existingStaff) {
      return sendError(res, 409, 'Staff member with this email already exists', 'STAFF_EXISTS');
    }

    const staff = await Staff.create({
      name,
      email,
      phoneNumber: phoneNumber || '',
      password,
      role: role.code,
      roleRef: role._id,
      department: department || '',
      assignedCity: assignedCity || '',
      assignedZone: assignedZone || '',
      createdBy: req.user.id,
    });

    const staffResponse = staff.toJSON();

    sendSuccess(res, 201, 'Staff member created successfully', { staff: staffResponse });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all staff members
// @route   GET /api/staff
// @access  Private (Staff with staff:read)
const getAllStaff = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, roleId, isActive } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (roleId) {
      query.roleRef = roleId;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [staffMembers, totalCount] = await Promise.all([
      Staff.find(query)
        .populate('roleRef', 'name slug code permissions')
        .populate('createdBy', 'name email')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Staff.countDocuments(query),
    ]);

    sendSuccess(res, 200, 'Staff members retrieved successfully', {
      staff: staffMembers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get staff member by ID
// @route   GET /api/staff/:id
// @access  Private (Staff with staff:read)
const getStaffById = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .populate('roleRef', 'name slug code permissions')
      .populate('createdBy', 'name email')
      .select('-password');

    if (!staff) {
      return sendError(res, 404, 'Staff member not found', 'STAFF_NOT_FOUND');
    }

    // Compute effective permissions (role permissions + overrides)
    let effectivePermissions = [];
    if (staff.roleRef && staff.roleRef.permissions) {
      effectivePermissions = [...staff.roleRef.permissions];
    }
    if (staff.permissionOverrides) {
      const revoked = staff.permissionOverrides.revoke || [];
      const granted = staff.permissionOverrides.grant || [];
      effectivePermissions = effectivePermissions.filter(p => !revoked.includes(p));
      effectivePermissions = [...new Set([...effectivePermissions, ...granted])];
    }

    const staffObj = staff.toJSON();
    staffObj.effectivePermissions = effectivePermissions;

    sendSuccess(res, 200, 'Staff member retrieved successfully', { staff: staffObj });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current staff profile
// @route   GET /api/staff/me
// @access  Private (Any staff)
const getStaffProfile = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.user.id)
      .populate('roleRef', 'name slug code permissions')
      .select('-password');

    if (!staff) {
      return sendError(res, 404, 'Staff profile not found', 'STAFF_NOT_FOUND');
    }

    sendSuccess(res, 200, 'Staff profile retrieved successfully', { staff });
  } catch (error) {
    next(error);
  }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private (Staff with staff:write)
const updateStaff = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return sendError(res, 404, 'Staff member not found', 'STAFF_NOT_FOUND');
    }

    const { name, phoneNumber, roleId, department, assignedCity, assignedZone } = req.body;

    if (name !== undefined) staff.name = name;
    if (phoneNumber !== undefined) staff.phoneNumber = phoneNumber;
    if (department !== undefined) staff.department = department;
    if (assignedCity !== undefined) staff.assignedCity = assignedCity;
    if (assignedZone !== undefined) staff.assignedZone = assignedZone;

    // Update role if provided
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) {
        return sendError(res, 404, 'Role not found', 'ROLE_NOT_FOUND');
      }
      if (!role.isActive) {
        return sendError(res, 400, 'Cannot assign an inactive role', 'ROLE_INACTIVE');
      }
      staff.role = role.code;
      staff.roleRef = role._id;
    }

    await staff.save();

    const updatedStaff = await Staff.findById(staff._id)
      .populate('roleRef', 'name slug code permissions')
      .select('-password');

    sendSuccess(res, 200, 'Staff member updated successfully', { staff: updatedStaff });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle staff active status
// @route   PATCH /api/staff/:id/status
// @access  Private (Staff with staff:write)
const toggleStaffStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (isActive === undefined) {
      return sendError(res, 400, 'isActive is required', 'MISSING_REQUIRED_FIELDS');
    }

    // Prevent deactivating yourself
    if (req.params.id === req.user.id.toString() && !isActive) {
      return sendError(res, 400, 'You cannot deactivate your own account', 'SELF_DEACTIVATION');
    }

    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).populate('roleRef', 'name slug code').select('-password');

    if (!staff) {
      return sendError(res, 404, 'Staff member not found', 'STAFF_NOT_FOUND');
    }

    const action = isActive ? 'activated' : 'deactivated';
    sendSuccess(res, 200, `Staff member ${action} successfully`, { staff });
  } catch (error) {
    next(error);
  }
};

// @desc    Update staff permission overrides
// @route   PATCH /api/staff/:id/permissions
// @access  Private (Staff with staff:write)
const updateStaffPermissions = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return sendError(res, 404, 'Staff member not found', 'STAFF_NOT_FOUND');
    }

    const { grant, revoke } = req.body;

    // Validate permission strings
    if (grant && Array.isArray(grant)) {
      const invalid = grant.filter(p => p !== '*' && !ALL_PERMISSIONS.includes(p) && !p.endsWith(':*'));
      if (invalid.length > 0) {
        return sendError(res, 400, `Invalid grant permissions: ${invalid.join(', ')}`, 'INVALID_PERMISSIONS');
      }
    }
    if (revoke && Array.isArray(revoke)) {
      const invalid = revoke.filter(p => p !== '*' && !ALL_PERMISSIONS.includes(p) && !p.endsWith(':*'));
      if (invalid.length > 0) {
        return sendError(res, 400, `Invalid revoke permissions: ${invalid.join(', ')}`, 'INVALID_PERMISSIONS');
      }
    }

    staff.permissionOverrides = {
      grant: grant || [],
      revoke: revoke || [],
    };

    await staff.save();

    const updatedStaff = await Staff.findById(staff._id)
      .populate('roleRef', 'name slug code permissions')
      .select('-password');

    sendSuccess(res, 200, 'Staff permission overrides updated successfully', { staff: updatedStaff });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete staff member
// @route   DELETE /api/staff/:id
// @access  Private (Staff with staff:delete)
const deleteStaff = async (req, res, next) => {
  try {
    // Prevent deleting yourself
    if (req.params.id === req.user.id.toString()) {
      return sendError(res, 400, 'You cannot delete your own account', 'SELF_DELETION');
    }

    const staff = await Staff.findById(req.params.id).select('-password');
    if (!staff) {
      return sendError(res, 404, 'Staff member not found', 'STAFF_NOT_FOUND');
    }

    await Staff.findByIdAndDelete(req.params.id);

    sendSuccess(res, 200, 'Staff member deleted successfully', { deletedStaff: staff });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createStaff,
  getAllStaff,
  getStaffById,
  getStaffProfile,
  updateStaff,
  toggleStaffStatus,
  updateStaffPermissions,
  deleteStaff,
};
