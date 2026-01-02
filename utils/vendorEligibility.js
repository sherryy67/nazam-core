/**
 * Vendor Eligibility Utility
 * Contains functions to check if a vendor is eligible for a specific service
 */

/**
 * Check if a vendor is eligible for a specific service
 * @param {Object} vendor - Vendor object with populated serviceId
 * @param {Object} service - Service object with populated category
 * @returns {boolean} - True if vendor is eligible, false otherwise
 */
const checkVendorEligibility = (vendor, service) => {
  try {
    // 1. Check if vendor is approved
    if (!vendor.approved) {
      return false;
    }

    // 2. Check if vendor's primary service OR category matches
    // Vendor must have either:
    //   - The same service as their primary service, OR
    //   - A service in the same category as the requested service
    if (!vendor.serviceId) {
      return false;
    }

    const vendorServiceId = vendor.serviceId._id ? vendor.serviceId._id.toString() : vendor.serviceId.toString();
    const requestServiceId = service._id.toString();

    // Check for exact service match
    const serviceMatches = vendorServiceId === requestServiceId;

    // Check for category match
    let categoryMatches = false;
    if (vendor.serviceId.category_id && service.category_id) {
      const vendorCategoryId = vendor.serviceId.category_id._id
        ? vendor.serviceId.category_id._id.toString()
        : vendor.serviceId.category_id.toString();
      const serviceCategoryId = service.category_id._id
        ? service.category_id._id.toString()
        : service.category_id.toString();
      categoryMatches = vendorCategoryId === serviceCategoryId;
    }

    // Vendor must match either service OR category
    if (!serviceMatches && !categoryMatches) {
      return false;
    }

    // 3. For scheduled services, check availability at specific time
    if (service.job_service_type === "Scheduled" && service.scheduledDate && service.scheduledTime) {
      return checkAvailabilityForScheduledService(vendor, service);
    }

    // 4. For all other service types, just check if vendor has any availability schedule
    return checkGeneralAvailability(vendor, service);

  } catch (error) {
    console.error('Error checking vendor eligibility:', error);
    return false;
  }
};

/**
 * Check vendor availability for a scheduled service
 * @param {Object} vendor - Vendor object
 * @param {Object} service - Service object with scheduledDate and scheduledTime
 * @returns {boolean} - True if vendor is available, false otherwise
 */
const checkAvailabilityForScheduledService = (vendor, service) => {
  try {
    const serviceDate = new Date(service.scheduledDate);
    const serviceTime = service.scheduledTime;
    const dayOfWeek = serviceDate.toLocaleDateString('en-US', { weekday: 'short' });

    // Check if vendor is unavailable on this specific date
    const isUnavailable = vendor.unavailableDates.some(unavailable => {
      const unavailableDate = new Date(unavailable.date);
      return unavailableDate.toDateString() === serviceDate.toDateString();
    });

    if (isUnavailable) {
      return false;
    }

    // Check if vendor has availability schedule for this day
    const daySchedule = vendor.availabilitySchedule.find(schedule => 
      schedule.dayOfWeek === dayOfWeek
    );

    // If vendor has no specific availability schedule, consider them generally available
    if (!daySchedule) {
      // If availabilitySchedule is empty, vendor is considered available
      if (!vendor.availabilitySchedule || vendor.availabilitySchedule.length === 0) {
        return true;
      }
      // If vendor has schedule but not for this day, they're not available
      return false;
    }

    // Check if service time falls within vendor's available time range
    const isTimeAvailable = isTimeInRange(
      serviceTime, 
      daySchedule.startTime, 
      daySchedule.endTime
    );

    return isTimeAvailable;
  } catch (error) {
    console.error('Error checking scheduled service availability:', error);
    return false;
  }
};

/**
 * Check vendor general availability for non-scheduled services
 * @param {Object} vendor - Vendor object
 * @param {Object} service - Service object
 * @returns {boolean} - True if vendor has availability slots, false otherwise
 */
const checkGeneralAvailability = (vendor, service) => {
  try {
    // Simply check if vendor has any availability schedule
    // If no schedule is set, consider them available
    if (!vendor.availabilitySchedule || vendor.availabilitySchedule.length === 0) {
      return true;
    }

    // If vendor has availability schedule, they are eligible
    return vendor.availabilitySchedule.length > 0;
  } catch (error) {
    console.error('Error checking general availability:', error);
    return false;
  }
};

/**
 * Check if a time falls within a time range
 * @param {string} time - Time to check (HH:MM format)
 * @param {string} startTime - Start time (HH:MM format)
 * @param {string} endTime - End time (HH:MM format)
 * @returns {boolean} - True if time is in range, false otherwise
 */
const isTimeInRange = (time, startTime, endTime) => {
  try {
    const timeMinutes = timeToMinutes(time);
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    // Handle case where end time is next day (e.g., 22:00 to 06:00)
    if (endMinutes < startMinutes) {
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }

    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  } catch (error) {
    console.error('Error checking time range:', error);
    return false;
  }
};

/**
 * Convert time string (HH:MM) to minutes since midnight
 * @param {string} time - Time string in HH:MM format
 * @returns {number} - Minutes since midnight
 */
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Get vendor's available time slots for a specific date
 * @param {Object} vendor - Vendor object
 * @param {Date} date - Date to check
 * @returns {Array} - Array of available time slots
 */
const getVendorAvailableSlots = (vendor, date) => {
  try {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const daySchedule = vendor.availabilitySchedule.find(schedule => 
      schedule.dayOfWeek === dayOfWeek
    );

    if (!daySchedule) {
      return [];
    }

    // Check if vendor is unavailable on this specific date
    const isUnavailable = vendor.unavailableDates.some(unavailable => {
      const unavailableDate = new Date(unavailable.date);
      return unavailableDate.toDateString() === date.toDateString();
    });

    if (isUnavailable) {
      return [];
    }

    // Generate time slots (every 30 minutes)
    const slots = [];
    const startMinutes = timeToMinutes(daySchedule.startTime);
    const endMinutes = timeToMinutes(daySchedule.endTime);

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      slots.push(timeString);
    }

    return slots;
  } catch (error) {
    console.error('Error getting vendor available slots:', error);
    return [];
  }
};

module.exports = {
  checkVendorEligibility,
  checkAvailabilityForScheduledService,
  checkGeneralAvailability,
  isTimeInRange,
  timeToMinutes,
  getVendorAvailableSlots
};
