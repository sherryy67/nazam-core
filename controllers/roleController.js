const Role = require('../models/Role');
const { sendSuccess, sendError } = require('../utils/response');
const { ALL_PERMISSIONS, PERMISSION_GROUPS } = require('../constants/permissions');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private (Staff with roles:read)
const getAllRoles = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search, isActive } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [roles, totalCount] = await Promise.all([
      Role.find(query).sort({ code: 1 }).skip(skip).limit(limitNum),
      Role.countDocuments(query),
    ]);

    sendSuccess(res, 200, 'Roles retrieved successfully', {
      roles,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get role by ID
// @route   GET /api/roles/:id
// @access  Private (Staff with roles:read)
const getRoleById = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return sendError(res, 404, 'Role not found', 'ROLE_NOT_FOUND');
    }
    sendSuccess(res, 200, 'Role retrieved successfully', { role });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new role
// @route   POST /api/roles
// @access  Private (Staff with roles:write)
const createRole = async (req, res, next) => {
  try {
    const { name, slug, code, description, permissions } = req.body;

    if (!name || !slug || code === undefined) {
      return sendError(res, 400, 'Name, slug, and code are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate permissions are valid strings
    if (permissions && Array.isArray(permissions)) {
      const invalid = permissions.filter(p => p !== '*' && !ALL_PERMISSIONS.includes(p) && !p.endsWith(':*'));
      if (invalid.length > 0) {
        return sendError(res, 400, `Invalid permissions: ${invalid.join(', ')}`, 'INVALID_PERMISSIONS');
      }
    }

    // Check for duplicate slug or code
    const existing = await Role.findOne({ $or: [{ slug }, { code }] });
    if (existing) {
      return sendError(res, 409, 'Role with this slug or code already exists', 'ROLE_EXISTS');
    }

    const role = await Role.create({
      name,
      slug,
      code,
      description: description || '',
      permissions: permissions || [],
      isSystem: false,
    });

    sendSuccess(res, 201, 'Role created successfully', { role });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Private (Staff with roles:write)
const updateRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return sendError(res, 404, 'Role not found', 'ROLE_NOT_FOUND');
    }

    const { name, description, permissions, isActive } = req.body;

    // Validate permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const invalid = permissions.filter(p => p !== '*' && !ALL_PERMISSIONS.includes(p) && !p.endsWith(':*'));
      if (invalid.length > 0) {
        return sendError(res, 400, `Invalid permissions: ${invalid.join(', ')}`, 'INVALID_PERMISSIONS');
      }
    }

    if (name !== undefined) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    sendSuccess(res, 200, 'Role updated successfully', { role });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private (Staff with roles:delete)
const deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return sendError(res, 404, 'Role not found', 'ROLE_NOT_FOUND');
    }

    if (role.isSystem) {
      return sendError(res, 403, 'System roles cannot be deleted', 'SYSTEM_ROLE_PROTECTED');
    }

    // Check if any staff members are assigned to this role
    const Staff = require('../models/Staff');
    const staffCount = await Staff.countDocuments({ roleRef: role._id });
    if (staffCount > 0) {
      return sendError(res, 400, `Cannot delete role — ${staffCount} staff member(s) are still assigned to it`, 'ROLE_IN_USE');
    }

    await Role.findByIdAndDelete(req.params.id);

    sendSuccess(res, 200, 'Role deleted successfully', { deletedRole: role });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all available permissions (grouped by module)
// @route   GET /api/roles/permissions/all
// @access  Private (Staff with roles:read)
const getAllPermissions = async (req, res, next) => {
  try {
    sendSuccess(res, 200, 'Permissions retrieved successfully', {
      permissions: ALL_PERMISSIONS,
      groups: PERMISSION_GROUPS,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
};
