const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Address = require('../models/Address');

// Load environment variables
dotenv.config();

const migrateUserAddresses = async () => {
    try {
        // Connect to database
        if (!process.env.MONGODB_URI) {
            console.error('Error: MONGODB_URI environment variable is not set');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        // Find all users who have an address string set
        const users = await User.find({
            address: { $exists: true, $ne: "" }
        });

        console.log(`Found ${users.length} users with legacy address strings.`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // Check if user already has any entries in the Address collection
            const existingAddress = await Address.findOne({ user: user._id });

            if (!existingAddress) {
                // Create new address record based on legacy string
                await Address.create({
                    user: user._id,
                    addressLine1: user.address,
                    city: 'Unknown', // Legacy format doesn't have city separated
                    label: 'Home',
                    isDefault: true
                });
                migratedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log(`Migration summary:`);
        console.log(`- Total users checked: ${users.length}`);
        console.log(`- Successfully migrated: ${migratedCount}`);
        console.log(`- Already had new addresses (skipped): ${skippedCount}`);

    } catch (error) {
        console.error('Error during migration:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from database');
        process.exit(0);
    }
};

// Run the script
migrateUserAddresses();
