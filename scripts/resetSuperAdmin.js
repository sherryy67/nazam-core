require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const Admin = require('../models/Admin');
const Role = require('../models/Role');

async function resetSuperAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Check Staff collection
  const staff = await Staff.findOne({ email: 'superadmin@zushh.com' }).select('+password');
  if (staff) {
    console.log('Found superadmin in Staff collection');
    console.log('  role:', staff.role, '| isActive:', staff.isActive, '| roleRef:', staff.roleRef);
    staff.password = 'superadmin@123';
    await staff.save();
    console.log('  Password reset to: superadmin@123');
  } else {
    console.log('No superadmin in Staff collection');
  }

  // Check legacy Admin collection
  const admin = await Admin.findOne({ email: 'superadmin@zushh.com' }).select('+password');
  if (admin) {
    console.log('Found superadmin in Admin collection');
    console.log('  role:', admin.role);
  } else {
    console.log('No superadmin in Admin collection');
  }

  // If not found anywhere, create it
  if (!staff && !admin) {
    console.log('\nSuperadmin not found. Creating...');
    const role = await Role.findOne({ slug: 'super_admin' });
    if (!role) {
      console.log('Super admin role not found. Run seedRoles.js first!');
    } else {
      await Staff.create({
        name: 'Super Admin',
        email: 'superadmin@zushh.com',
        password: 'superadmin@123',
        role: 11,
        roleRef: role._id,
        isActive: true,
      });
      console.log('Created superadmin account: superadmin@zushh.com / superadmin@123');
    }
  }

  await mongoose.disconnect();
  console.log('Done');
}

resetSuperAdmin().catch(e => { console.error(e); process.exit(1); });
