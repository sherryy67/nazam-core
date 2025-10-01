// Role constants
const ROLES = {
  USER: 1,
  VENDOR: 2,
  ADMIN: 3
};

// Role names mapping
const ROLE_NAMES = {
  [ROLES.USER]: 'user',
  [ROLES.VENDOR]: 'vendor',
  [ROLES.ADMIN]: 'admin'
};

// Helper functions
const getRoleName = (roleNumber) => {
  return ROLE_NAMES[roleNumber] || 'unknown';
};

const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

const isAdmin = (role) => {
  return role === ROLES.ADMIN;
};

const isVendor = (role) => {
  return role === ROLES.VENDOR;
};

const isUser = (role) => {
  return role === ROLES.USER;
};

const hasPermission = (userRole, requiredRoles) => {
  return requiredRoles.includes(userRole);
};

module.exports = {
  ROLES,
  ROLE_NAMES,
  getRoleName,
  isValidRole,
  isAdmin,
  isVendor,
  isUser,
  hasPermission
};
