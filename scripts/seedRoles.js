/**
 * Seed default RBAC roles into the database.
 *
 * Usage: node scripts/seedRoles.js
 *
 * This script is idempotent — it skips roles that already exist (matched by slug).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Role = require('../models/Role');
const ROLES = require('../constants/roles');

const defaultRoles = [
  {
    name: 'Customer Support Agent',
    slug: 'customer_support',
    code: ROLES.CUSTOMER_SUPPORT,
    description: 'Resolve issues & complaints — ticket management, chat/voice support, refunds & cancellations, SLA tracking, escalation handling',
    permissions: [
      'dashboard:read',
      'orders:read', 'orders:update',
      'users:read',
      'services:read',
      'amc_contracts:read',
    ],
    isSystem: true,
  },
  {
    name: 'Operations Manager',
    slug: 'ops_manager',
    code: ROLES.OPS_MANAGER,
    description: 'Ensure service delivery & SLAs — order monitoring, demand-supply balancing, utilization tracking, escalation handling, local promotions',
    permissions: [
      'dashboard:read',
      'orders:read', 'orders:update', 'orders:assign',
      'vendors:read', 'vendors:assign',
      'services:read',
      'amc_contracts:read',
      'reports:read',
    ],
    isSystem: true,
  },
  {
    name: 'Quality & Training Manager',
    slug: 'quality_manager',
    code: ROLES.QUALITY_MANAGER,
    description: 'Maintain service standards — training programs, certifications, audits, rating analysis, corrective actions',
    permissions: [
      'dashboard:read',
      'orders:read',
      'vendors:read',
      'services:read',
      'reports:read',
    ],
    isSystem: true,
  },
  {
    name: 'Pricing & Revenue Manager',
    slug: 'pricing_manager',
    code: ROLES.PRICING_MANAGER,
    description: 'Optimize pricing & margins — dynamic pricing, surge rules, discounts/promos, commission models, unit economics dashboards',
    permissions: [
      'dashboard:read',
      'services:read', 'services:write',
      'orders:read',
      'marketing:read',
      'reports:read',
    ],
    isSystem: true,
  },
  {
    name: 'Finance & Payments Admin',
    slug: 'finance_admin',
    code: ROLES.FINANCE_ADMIN,
    description: 'Control financial operations — payment gateway management, invoicing & tax, payouts, refunds, reconciliation, financial reports',
    permissions: [
      'dashboard:read',
      'payments:read', 'payments:write', 'payments:refund', 'payments:export',
      'orders:read',
      'users:read',
      'reports:read', 'reports:export',
    ],
    isSystem: true,
  },
  {
    name: 'Risk, Compliance & Trust Admin',
    slug: 'compliance_admin',
    code: ROLES.COMPLIANCE_ADMIN,
    description: 'Platform safety & compliance — KYC & background checks, fraud detection, incident investigation, insurance tracking, policy enforcement',
    permissions: [
      'dashboard:read',
      'users:read',
      'vendors:read',
      'orders:read',
      'reports:read',
    ],
    isSystem: true,
  },
  {
    name: 'Product Manager',
    slug: 'product_manager',
    code: ROLES.PRODUCT_MANAGER,
    description: 'Own product roadmap — feature rollout, user analytics, feedback prioritization, A/B testing, release coordination',
    permissions: [
      'dashboard:read',
      'services:read', 'services:write', 'services:delete',
      'categories:read', 'categories:write', 'categories:delete',
      'banners:read', 'banners:write', 'banners:delete',
      'videos:read', 'videos:write', 'videos:delete',
      'marketing:read', 'marketing:write',
      'orders:read',
      'reports:read',
    ],
    isSystem: true,
  },
  {
    name: 'Technology / Platform Admin',
    slug: 'platform_admin',
    code: ROLES.PLATFORM_ADMIN,
    description: 'Ensure platform reliability — user & role management, system monitoring, integrations, security controls, backups',
    permissions: [
      'dashboard:read',
      'staff:read',
      'roles:read',
      'users:read',
      'vendors:read',
      'settings:read', 'settings:write',
      'reports:read',
    ],
    isSystem: true,
  },
  {
    name: 'Super Admin',
    slug: 'super_admin',
    code: ROLES.SUPER_ADMIN,
    description: 'Full platform access — all permissions, unrestricted',
    permissions: ['*'],
    isSystem: true,
  },
];

async function seedRoles() {
  try {
    await connectDB();
    console.log('Connected to database.\n');

    let created = 0;
    let skipped = 0;

    for (const roleDef of defaultRoles) {
      const existing = await Role.findOne({ slug: roleDef.slug });
      if (existing) {
        console.log(`  [SKIP] Role "${roleDef.name}" (slug: ${roleDef.slug}) already exists.`);
        skipped++;
        continue;
      }

      await Role.create(roleDef);
      console.log(`  [CREATE] Role "${roleDef.name}" (code: ${roleDef.code}) created.`);
      created++;
    }

    console.log(`\nDone. Created: ${created}, Skipped: ${skipped}\n`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding roles:', error);
    process.exit(1);
  }
}

seedRoles();
