const Address = require('../models/Address');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const { validationResult } = require('express-validator');

// @desc    Add new address
// @route   POST /api/addresses
// @access  Private
exports.addAddress = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR', { errors: errors.array() });
        }

        req.body.user = req.user.id;
        req.body.country = 'UAE'; // Always enforce UAE as the country

        const address = await Address.create(req.body);

        sendSuccess(res, 201, 'Address added successfully', { address });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all addresses for a user
// @route   GET /api/addresses
// @access  Private
exports.getAddresses = async (req, res, next) => {
    try {
        const addresses = await Address.find({ user: req.user.id }).sort({ isDefault: -1, createdAt: -1 });
        sendSuccess(res, 200, 'Addresses retrieved successfully', { addresses });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single address
// @route   GET /api/addresses/:id
// @access  Private
exports.getAddress = async (req, res, next) => {
    try {
        const address = await Address.findOne({ _id: req.params.id, user: req.user.id });
        if (!address) {
            return sendError(res, 404, 'Address not found', 'ADDRESS_NOT_FOUND');
        }
        sendSuccess(res, 200, 'Address retrieved successfully', { address });
    } catch (error) {
        next(error);
    }
};

// @desc    Update address
// @route   PUT /api/addresses/:id
// @access  Private
exports.updateAddress = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR', { errors: errors.array() });
        }

        let address = await Address.findOne({ _id: req.params.id, user: req.user.id });
        if (!address) {
            return sendError(res, 404, 'Address not found', 'ADDRESS_NOT_FOUND');
        }

        // Always enforce UAE as the country and ignore it from input
        req.body.country = 'UAE';

        address = await Address.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        sendSuccess(res, 200, 'Address updated successfully', { address });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete address
// @route   DELETE /api/addresses/:id
// @access  Private
exports.deleteAddress = async (req, res, next) => {
    try {
        const address = await Address.findOne({ _id: req.params.id, user: req.user.id });
        if (!address) {
            return sendError(res, 404, 'Address not found', 'ADDRESS_NOT_FOUND');
        }

        const wasDefault = address.isDefault;
        await address.deleteOne();

        // If we deleted the default address, make another one default if exists
        if (wasDefault) {
            const remainingAddress = await Address.findOne({ user: req.user.id });
            if (remainingAddress) {
                remainingAddress.isDefault = true;
                await remainingAddress.save();
            }
        }

        sendSuccess(res, 200, 'Address deleted successfully');
    } catch (error) {
        next(error);
    }
};

// @desc    Set default address
// @route   PUT /api/addresses/:id/default
// @access  Private
exports.setDefaultAddress = async (req, res, next) => {
    try {
        const address = await Address.findOne({ _id: req.params.id, user: req.user.id });
        if (!address) {
            return sendError(res, 404, 'Address not found', 'ADDRESS_NOT_FOUND');
        }

        address.isDefault = true;
        await address.save();

        sendSuccess(res, 200, 'Default address set successfully', { address });
    } catch (error) {
        next(error);
    }
};
