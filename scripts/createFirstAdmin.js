const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Staff = require('../models/Staff');
const Role = require('../models/Role');
const ROLES = require('../constants/roles');

// Load environment variables
dotenv.config();

const defaultAccounts = [
  {
    name: 'Super Admin',
    email: 'superadmin@zushh.com',
    password: 'superadmin@123',
    roleSlug: 'super_admin',
    roleCode: ROLES.SUPER_ADMIN,
  },
  {
    name: 'Admin',
    email: 'admin@zushh.com',
    password: 'admin@123',
    roleSlug: 'platform_admin',
    roleCode: ROLES.PLATFORM_ADMIN,
  },
];

const createFirstAdmin = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('Error: MONGODB_URI environment variable is not set');
      console.error('Please make sure your .env file contains MONGODB_URI');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('Connected to database\n');

    let created = 0;
    let skipped = 0;

    for (const account of defaultAccounts) {
      // Skip if already exists
      const existing = await Staff.findOne({ email: account.email });
      if (existing) {
        console.log(`  [SKIP] "${account.email}" already exists.`);
        skipped++;
        continue;
      }

      // Find the matching Role document
      const role = await Role.findOne({ slug: account.roleSlug });
      if (!role) {
        console.error(`  [ERROR] Role "${account.roleSlug}" not found. Run seedRoles.js first.`);
        continue;
      }

      await Staff.create({
        name: account.name,
        email: account.email,
        password: account.password,
        role: account.roleCode,
        roleRef: role._id,
        isActive: true,
      });

      console.log(`  [CREATE] ${account.name} (${account.email}) — role: ${account.roleSlug}`);
      created++;
    }

    console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
    console.log('\nCredentials:');
    console.log('  Super Admin → superadmin@zushh.com / superadmin@123');
    console.log('  Admin       → admin@zushh.com      / admin@123');
    console.log('\nPlease change passwords after first login!');

  } catch (error) {
    console.error('Error creating admin accounts:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database');
    process.exit(0);
  }
};

createFirstAdmin();
