require('dotenv').config();
const mongoose = require('mongoose');
const Service = require('../models/Service');

async function addThumbnailUriToServices() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const result = await Service.updateMany(
    { thumbnailUri: { $exists: false } }, // Only update if thumbnailUri doesn't exist
    { $set: { thumbnailUri: "" } }
  );

  console.log(`Updated ${result.modifiedCount || result.nModified} services.`);
  mongoose.disconnect();
}

addThumbnailUriToServices().catch(err => {
  console.error('Error updating services:', err);
  mongoose.disconnect();
});