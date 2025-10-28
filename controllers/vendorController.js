const Vendor = require('../models/Vendor');
const { sendSuccess, sendError, sendNotFoundError } = require('../utils/response');

/**
 * @desc    Update vendor availability schedule
 * @route   PUT /api/admin/vendor/:vendorId/availability
 * @access  Private (Admin only)
 */
const updateVendorAvailability = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { availabilitySchedule, unavailableDates } = req.body;

    // Validate vendorId
    if (!vendorId || !vendorId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid vendor ID format', 'INVALID_VENDOR_ID');
    }

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Validate availabilitySchedule if provided
    if (availabilitySchedule) {
      const validDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!Array.isArray(availabilitySchedule)) {
        return sendError(res, 400, 'availabilitySchedule must be an array', 'INVALID_AVAILABILITY_SCHEDULE');
      }
      
      for (const schedule of availabilitySchedule) {
        if (!schedule.dayOfWeek || !validDays.includes(schedule.dayOfWeek)) {
          return sendError(res, 400, 'Invalid dayOfWeek in availabilitySchedule', 'INVALID_DAY_OF_WEEK');
        }
        if (!schedule.startTime || !timePattern.test(schedule.startTime)) {
          return sendError(res, 400, 'Invalid startTime format in availabilitySchedule (use HH:MM)', 'INVALID_START_TIME');
        }
        if (!schedule.endTime || !timePattern.test(schedule.endTime)) {
          return sendError(res, 400, 'Invalid endTime format in availabilitySchedule (use HH:MM)', 'INVALID_END_TIME');
        }
      }
    }

    // Validate unavailableDates if provided
    if (unavailableDates) {
      if (!Array.isArray(unavailableDates)) {
        return sendError(res, 400, 'unavailableDates must be an array', 'INVALID_UNAVAILABLE_DATES');
      }
      
      for (const unavailable of unavailableDates) {
        if (!unavailable.date || isNaN(Date.parse(unavailable.date))) {
          return sendError(res, 400, 'Invalid date format in unavailableDates', 'INVALID_DATE_FORMAT');
        }
      }
    }

    // Update vendor
    const updateData = {};
    if (availabilitySchedule !== undefined) {
      updateData.availabilitySchedule = availabilitySchedule;
    }
    if (unavailableDates !== undefined) {
      updateData.unavailableDates = unavailableDates;
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    sendSuccess(res, 200, 'Vendor availability updated successfully', {
      vendor: {
        _id: updatedVendor._id,
        firstName: updatedVendor.firstName,
        lastName: updatedVendor.lastName,
        email: updatedVendor.email,
        availabilitySchedule: updatedVendor.availabilitySchedule,
        unavailableDates: updatedVendor.unavailableDates
      }
    });

  } catch (error) {
    console.error('Error updating vendor availability:', error);
    next(error);
  }
};

module.exports = {
  updateVendorAvailability
};
