/**
 * Script to update existing vendors with default availability schedules
 * This will help fix vendors that were created without availabilitySchedule
 */

const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nazam-core', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Default availability schedule (Monday to Friday, 9 AM to 6 PM)
const defaultAvailabilitySchedule = [
  { dayOfWeek: 'Mon', startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 'Tue', startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 'Wed', startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 'Thu', startTime: '09:00', endTime: '18:00' },
  { dayOfWeek: 'Fri', startTime: '09:00', endTime: '18:00' }
];

// Update vendors with empty availabilitySchedule
const updateVendorAvailability = async () => {
  try {
    console.log('\n🔧 Updating vendors with empty availabilitySchedule...');

    // Find vendors with empty or missing availabilitySchedule
    const vendorsToUpdate = await Vendor.find({
      $or: [
        { availabilitySchedule: { $exists: false } },
        { availabilitySchedule: { $size: 0 } }
      ]
    });

    console.log(`Found ${vendorsToUpdate.length} vendors to update`);

    if (vendorsToUpdate.length === 0) {
      console.log('✅ No vendors need updating');
      return;
    }

    // Update each vendor
    for (const vendor of vendorsToUpdate) {
      await Vendor.findByIdAndUpdate(
        vendor._id,
        {
          availabilitySchedule: defaultAvailabilitySchedule,
          unavailableDates: vendor.unavailableDates || []
        },
        { new: true }
      );
      
      console.log(`✅ Updated vendor: ${vendor.firstName} ${vendor.lastName} (${vendor._id})`);
    }

    console.log(`\n🎉 Successfully updated ${vendorsToUpdate.length} vendors`);

  } catch (error) {
    console.error('❌ Error updating vendors:', error);
  }
};

// Main function
const runUpdate = async () => {
  try {
    await connectDB();
    await updateVendorAvailability();
  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runUpdate();
}

module.exports = { runUpdate };
