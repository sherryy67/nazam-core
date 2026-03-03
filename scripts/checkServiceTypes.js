require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);

  const total = await Service.countDocuments({ isActive: true });
  const residential = await Service.countDocuments({ isActive: true, serviceType: 'residential' });
  const commercial = await Service.countDocuments({ isActive: true, serviceType: 'commercial' });
  const nullType = await Service.countDocuments({ isActive: true, serviceType: null });
  const missingType = await Service.countDocuments({ isActive: true, serviceType: { $exists: false } });

  console.log('=== Active Services ===');
  console.log('Total:', total);
  console.log('Residential:', residential);
  console.log('Commercial:', commercial);
  console.log('Null serviceType:', nullType);
  console.log('Missing serviceType:', missingType);

  const samples = await Service.find({ isActive: true })
    .select('name serviceType category_id')
    .populate('category_id', 'name')
    .lean();
  console.log('\n=== All Active Services ===');
  samples.forEach(s => {
    console.log('  [' + (s.serviceType || 'NO_TYPE') + '] ' + s.name + ' | Cat: ' + (s.category_id?.name || 'N/A'));
  });

  await mongoose.disconnect();
}
check().catch(e => { console.error(e); process.exit(1); });
