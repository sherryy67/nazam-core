// Non-staff role codes (used to identify staff by exclusion)
const NON_STAFF_ROLES = [1, 2, 12, 13];

module.exports = {
  // External roles (unchanged)
  USER: 1,
  VENDOR: 2,

  // Staff roles (3-11 are predefined, but custom staff roles can use any code not reserved above)
  CUSTOMER_SUPPORT: 3,
  OPS_MANAGER: 4,
  QUALITY_MANAGER: 5,
  PRICING_MANAGER: 6,
  FINANCE_ADMIN: 7,
  COMPLIANCE_ADMIN: 8,
  PRODUCT_MANAGER: 9,
  PLATFORM_ADMIN: 10,
  SUPER_ADMIN: 11,

  // Extended external roles
  PROPERTY_OWNER: 12,
  ORGANIZATION: 13,

  // Helpers
  isStaffRole: (role) => role >= 3 && !NON_STAFF_ROLES.includes(role),
  isSuperAdmin: (role) => role === 11,
  isPropertyOwner: (role) => role === 12,
  isOrganization: (role) => role === 13,

  // Deprecated alias — kept for backward compatibility
  ADMIN: 3,
};
