/**
 * Migrate existing Admin documents to the Staff collection.
 *
 * Usage: node scripts/migrateAdminsToStaff.js
 *
 * What it does:
 * - Reads every document from the `admins` collection.
 * - Creates a corresponding Staff document with the SAME _id (for JWT backward compat).
 * - Assigns role = SUPER_ADMIN (11) and links to the super_admin Role document.
 * - Does NOT delete the Admin collection (kept as backup).
 * - Skips admins that already have a matching Staff document.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Admin = require('../models/Admin');
const Staff = require('../models/Staff');
const Role = require('../models/Role');
const ROLES = require('../constants/roles');

async function migrateAdminsToStaff() {
  try {
    await connectDB();
    console.log('Connected to database.\n');

    // Find the super_admin role
    const superAdminRole = await Role.findOne({ slug: 'super_admin' });
    if (!superAdminRole) {
      console.error('ERROR: super_admin role not found. Run seedRoles.js first.');
      process.exit(1);
    }

    // Get all admins (including password for direct copy)
    const admins = await Admin.find({}).select('+password');
    console.log(`Found ${admins.length} admin(s) to migrate.\n`);

    let migrated = 0;
    let skipped = 0;

    for (const admin of admins) {
      // Check if this admin is already migrated
      const existingStaff = await Staff.findById(admin._id);
      if (existingStaff) {
        console.log(`  [SKIP] Admin "${admin.email}" already exists in Staff collection.`);
        skipped++;
        continue;
      }

      // Create Staff document with the same _id (critical for JWT backward compat)
      // We use insertOne to bypass the pre-save hook (password is already hashed)
      await Staff.collection.insertOne({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        password: admin.password, // already hashed
        phoneNumber: '',
        role: ROLES.SUPER_ADMIN,
        roleRef: superAdminRole._id,
        permissionOverrides: { grant: [], revoke: [] },
        department: '',
        assignedCity: '',
        assignedZone: '',
        isActive: true,
        createdBy: null,
        lastLogin: null,
        profilePic: '',
        createdAt: admin.createdAt || new Date(),
        updatedAt: new Date(),
      });

      console.log(`  [MIGRATE] Admin "${admin.email}" → Staff (Super Admin, role: ${ROLES.SUPER_ADMIN})`);
      migrated++;
    }

    console.log(`\nDone. Migrated: ${migrated}, Skipped: ${skipped}`);
    console.log('NOTE: The admins collection has NOT been deleted (kept as backup).\n');
    process.exit(0);
  } catch (error) {
    console.error('Error migrating admins:', error);
    process.exit(1);
  }
}

migrateAdminsToStaff();
