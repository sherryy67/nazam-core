/**
 * All available permission strings organized by module.
 * Format: "module:action"
 */

const PERMISSIONS = {
  // Dashboard
  DASHBOARD_READ: 'dashboard:read',

  // Users
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',

  // Vendors
  VENDORS_READ: 'vendors:read',
  VENDORS_WRITE: 'vendors:write',
  VENDORS_APPROVE: 'vendors:approve',
  VENDORS_ASSIGN: 'vendors:assign',

  // Orders / Service Requests
  ORDERS_READ: 'orders:read',
  ORDERS_WRITE: 'orders:write',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_DELETE: 'orders:delete',
  ORDERS_ASSIGN: 'orders:assign',

  // Services
  SERVICES_READ: 'services:read',
  SERVICES_WRITE: 'services:write',
  SERVICES_DELETE: 'services:delete',

  // Categories
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_WRITE: 'categories:write',
  CATEGORIES_DELETE: 'categories:delete',

  // Payments
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_WRITE: 'payments:write',
  PAYMENTS_REFUND: 'payments:refund',
  PAYMENTS_EXPORT: 'payments:export',

  // Banners
  BANNERS_READ: 'banners:read',
  BANNERS_WRITE: 'banners:write',
  BANNERS_DELETE: 'banners:delete',

  // Videos
  VIDEOS_READ: 'videos:read',
  VIDEOS_WRITE: 'videos:write',
  VIDEOS_DELETE: 'videos:delete',

  // Marketing
  MARKETING_READ: 'marketing:read',
  MARKETING_WRITE: 'marketing:write',

  // AMC Contracts
  AMC_CONTRACTS_READ: 'amc_contracts:read',
  AMC_CONTRACTS_WRITE: 'amc_contracts:write',
  AMC_CONTRACTS_DELETE: 'amc_contracts:delete',

  // Reports
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',

  // Staff Management
  STAFF_READ: 'staff:read',
  STAFF_WRITE: 'staff:write',
  STAFF_DELETE: 'staff:delete',

  // Role Management
  ROLES_READ: 'roles:read',
  ROLES_WRITE: 'roles:write',
  ROLES_DELETE: 'roles:delete',

  // Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
};

/**
 * Grouped permissions by module (for UI display).
 */
const PERMISSION_GROUPS = {
  Dashboard: ['dashboard:read'],
  Users: ['users:read', 'users:write', 'users:delete'],
  Vendors: ['vendors:read', 'vendors:write', 'vendors:approve', 'vendors:assign'],
  Orders: ['orders:read', 'orders:write', 'orders:update', 'orders:delete', 'orders:assign'],
  Services: ['services:read', 'services:write', 'services:delete'],
  Categories: ['categories:read', 'categories:write', 'categories:delete'],
  Payments: ['payments:read', 'payments:write', 'payments:refund', 'payments:export'],
  Banners: ['banners:read', 'banners:write', 'banners:delete'],
  Videos: ['videos:read', 'videos:write', 'videos:delete'],
  Marketing: ['marketing:read', 'marketing:write'],
  'AMC Contracts': ['amc_contracts:read', 'amc_contracts:write', 'amc_contracts:delete'],
  Reports: ['reports:read', 'reports:export'],
  Staff: ['staff:read', 'staff:write', 'staff:delete'],
  Roles: ['roles:read', 'roles:write', 'roles:delete'],
  Settings: ['settings:read', 'settings:write'],
};

/**
 * Flat list of all permission strings.
 */
const ALL_PERMISSIONS = Object.values(PERMISSIONS);

module.exports = {
  PERMISSIONS,
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
};
