const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    label: {
        type: String,
        enum: ["Home", "Work", "Other"],
        default: "Home"
    },
    addressLine1: {
        type: String,
        required: true
    },
    addressLine2: {
        type: String,
        default: ""
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        default: ""
    },
    country: {
        type: String,
        default: "UAE"
    },
    zipCode: {
        type: String,
        default: ""
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    }
}, { timestamps: true });

// Ensure only one default address per user
addressSchema.pre('save', async function (next) {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { user: this.user, _id: { $ne: this._id } },
            { isDefault: false }
        );
    } else {
        // Check if there are any other addresses for this user
        const otherAddressesCount = await this.constructor.countDocuments({
            user: this.user,
            _id: { $ne: this._id }
        });

        // If this is the only address, it MUST be default
        if (otherAddressesCount === 0) {
            this.isDefault = true;
        } else {
            // If there are other addresses, check if any of them is default
            const hasDefault = await this.constructor.findOne({
                user: this.user,
                isDefault: true,
                _id: { $ne: this._id }
            });

            // If no other address is default, this one must be
            if (!hasDefault) {
                this.isDefault = true;
            }
        }
    }
    next();
});

module.exports = mongoose.model("Address", addressSchema);
