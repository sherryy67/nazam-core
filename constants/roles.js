module.exports = {
  // External roles (unchanged)
  USER: 1,
  VENDOR: 2,

  // Staff roles (3-11)
  CUSTOMER_SUPPORT: 3,
  OPS_MANAGER: 4,
  QUALITY_MANAGER: 5,
  PRICING_MANAGER: 6,
  FINANCE_ADMIN: 7,
  COMPLIANCE_ADMIN: 8,
  PRODUCT_MANAGER: 9,
  PLATFORM_ADMIN: 10,
  SUPER_ADMIN: 11,

  // Helpers
  isStaffRole: (role) => role >= 3,
  isSuperAdmin: (role) => role === 11,

  // Deprecated alias — kept for backward compatibility
  ADMIN: 3,
};
