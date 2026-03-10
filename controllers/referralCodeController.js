const ReferralCode = require('../models/ReferralCode');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const User = require('../models/User');
const { sendSuccess, sendError, sendNotFoundError } = require('../utils/response');

/**
 * @desc    Generate referral code (Property Owner)
 * @route   POST /api/referral-codes
 * @access  Private (Property Owner)
 */
const generateReferralCode = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { propertyId, unitId, expiresInDays = 7, maxUses = 1 } = req.body;

    if (!propertyId) {
      return sendError(res, 400, 'Property ID is required', 'MISSING_FIELDS');
    }

    // Verify property belongs to this owner
    const property = await Property.findOne({ _id: propertyId, owner: ownerId });
    if (!property) {
      return sendError(res, 403, 'Property not found or does not belong to you', 'FORBIDDEN');
    }

    // If unit specified, verify it belongs to this property
    if (unitId) {
      const unit = await Unit.findOne({ _id: unitId, property: propertyId });
      if (!unit) {
        return sendError(res, 400, 'Unit not found in this property', 'INVALID_UNIT');
      }
    }

    const code = await ReferralCode.generateUniqueCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

    const referralCode = await ReferralCode.create({
      code,
      owner: ownerId,
      property: propertyId,
      unit: unitId || null,
      expiresAt,
      maxUses: parseInt(maxUses)
    });

    sendSuccess(res, 201, 'Referral code generated successfully', {
      referralCode: {
        code: referralCode.code,
        property: property.name,
        expiresAt: referralCode.expiresAt,
        maxUses: referralCode.maxUses
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all referral codes for property owner
 * @route   GET /api/referral-codes
 * @access  Private (Property Owner)
 */
const getMyReferralCodes = async (req, res, next) => {
  try {
    const ownerId = req.user.id;

    const codes = await ReferralCode.find({ owner: ownerId })
      .populate('property', 'name address city')
      .populate('unit', 'unitNumber type')
      .populate('usedBy.user', 'name email')
      .sort({ createdAt: -1 });

    // Add validity status to each code
    const codesWithStatus = codes.map(c => {
      const obj = c.toObject();
      obj.isValid = c.isValid();
      obj.isExpired = new Date() > c.expiresAt;
      return obj;
    });

    sendSuccess(res, 200, 'Referral codes retrieved successfully', { referralCodes: codesWithStatus });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Redeem referral code (User/Tenant)
 * @route   POST /api/referral-codes/redeem
 * @access  Private (User)
 */
const redeemReferralCode = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) {
      return sendError(res, 400, 'Referral code is required', 'MISSING_FIELDS');
    }

    // Check if user is already linked to a property
    const user = await User.findById(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found');
    }
    if (user.propertyId) {
      return sendError(res, 400, 'You are already linked to a property', 'ALREADY_LINKED');
    }

    // Find the referral code
    const referralCode = await ReferralCode.findOne({ code: code.toUpperCase() });
    if (!referralCode) {
      return sendNotFoundError(res, 'Invalid referral code');
    }

    // Validate code
    if (!referralCode.isValid()) {
      if (new Date() > referralCode.expiresAt) {
        return sendError(res, 400, 'Referral code has expired', 'CODE_EXPIRED');
      }
      if (referralCode.usedCount >= referralCode.maxUses) {
        return sendError(res, 400, 'Referral code has reached maximum uses', 'CODE_MAX_USES');
      }
      return sendError(res, 400, 'Referral code is no longer active', 'CODE_INACTIVE');
    }

    // Link user to property
    const updateData = {
      propertyId: referralCode.property,
      referralCode: referralCode.code
    };

    // If code is linked to a specific unit, assign user to that unit
    if (referralCode.unit) {
      const unit = await Unit.findById(referralCode.unit);
      if (unit && !unit.isOccupied) {
        updateData.unitId = unit._id;
        await Unit.findByIdAndUpdate(unit._id, { tenant: userId, isOccupied: true });
      }
    }

    await User.findByIdAndUpdate(userId, updateData);

    // Track usage
    referralCode.usedCount += 1;
    referralCode.usedBy.push({ user: userId });
    await referralCode.save();

    const property = await Property.findById(referralCode.property).select('name address city');

    sendSuccess(res, 200, 'Successfully linked to property', {
      property,
      unit: referralCode.unit ? await Unit.findById(referralCode.unit).select('unitNumber type floor') : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Deactivate a referral code (Property Owner)
 * @route   PUT /api/referral-codes/:id/deactivate
 * @access  Private (Property Owner)
 */
const deactivateReferralCode = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const referralCode = await ReferralCode.findOne({ _id: req.params.id, owner: ownerId });

    if (!referralCode) {
      return sendNotFoundError(res, 'Referral code not found');
    }

    referralCode.isActive = false;
    await referralCode.save();

    sendSuccess(res, 200, 'Referral code deactivated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateReferralCode,
  getMyReferralCodes,
  redeemReferralCode,
  deactivateReferralCode
};
