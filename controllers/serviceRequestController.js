const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const Category = require('../models/Category');
const Banner = require('../models/Banner');
const mongoose = require('mongoose');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');
const emailService = require('../utils/emailService');
const smsService = require('../utils/smsService');
const Admin = require('../models/Admin');

const resolveTimeBasedTier = (service, units) => {
  if (!Array.isArray(service.timeBasedPricing) || service.timeBasedPricing.length === 0) {
    return null;
  }

  const numericUnits = Number(units);

  return service.timeBasedPricing.find((tier) => {
    if (!tier) return false;
    const tierHours = Number(tier.hours);
    return Number.isFinite(tierHours) && tierHours === numericUnits;
  }) || null;
};

// @desc    Submit a service request
// @route   POST /api/submit-service-requests
// @access  Public (no authentication required)
const submitServiceRequest = async (req, res, next) => {
  try {
    const {
      user_name,
      user_phone,
      user_email,
      address,
      service_id,
      service_name,
      category_id,
      category_name,
      request_type,
      requested_date,
      message,
      number_of_units,
      payment_method,
      selectedSubServices,
      // Milestone payment fields
      payment_type,
      milestones,
      require_sequential_payment,
      // Quotation question answers
      questionAnswers,
      // Per Hour rate-based pricing fields
      durationType,
      duration,
      numberOfPersons
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'user_name', 'user_phone', 'user_email', 'address',
      'service_id', 'service_name', 'category_id', 'category_name',
      'request_type', 'requested_date', 'number_of_units'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`, 'MISSING_REQUIRED_FIELDS');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return sendError(res, 400, 'Invalid email format', 'INVALID_EMAIL');
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(user_phone.replace(/[\s\-\(\)]/g, ''))) {
      return sendError(res, 400, 'Invalid phone number format', 'INVALID_PHONE');
    }

    // Validate request_type
    if (!['Quotation', 'OnTime', 'Scheduled'].includes(request_type)) {
      return sendError(res, 400, 'Invalid request_type. Must be Quotation, OnTime, or Scheduled', 'INVALID_REQUEST_TYPE');
    }

    // Validate number_of_units - for Quotation, this can be 1 (just indicating a request)
    if (!number_of_units || number_of_units <= 0 || !Number.isInteger(Number(number_of_units))) {
      return sendError(res, 400, 'Number of units must be a positive integer', 'INVALID_NUMBER_OF_UNITS');
    }

    // Validate service exists and is active (explicitly select subServices field)
    const service = await Service.findById(service_id).select('+subServices');
    if (!service || !service.isActive) {
      return sendError(res, 400, 'Invalid or inactive service', 'INVALID_SERVICE');
    }

    // Handle sub-services selection if provided
    let parsedSelectedSubServices = [];
    if (selectedSubServices !== undefined && selectedSubServices !== null) {
      // Parse selectedSubServices if it's a JSON string (from multipart/form-data)
      try {
        parsedSelectedSubServices = typeof selectedSubServices === 'string' 
          ? JSON.parse(selectedSubServices) 
          : selectedSubServices;
      } catch (parseError) {
        return sendError(res, 400, 'selectedSubServices must be a valid JSON array', 'INVALID_SELECTED_SUBSERVICES');
      }
      
      if (!Array.isArray(parsedSelectedSubServices)) {
        return sendError(res, 400, 'selectedSubServices must be an array', 'INVALID_SELECTED_SUBSERVICES');
      }
      
      // Validate that service has subServices array
      if (!service.subServices || service.subServices.length === 0) {
        return sendError(res, 400, 'Service does not have sub-services available', 'SERVICE_NO_SUBSERVICES');
      }
      
      // Validate each selected sub-service exists in service's subServices
      for (const selected of parsedSelectedSubServices) {
        if (!selected.name) {
          return sendError(res, 400, 'Each selected sub-service must have a name', 'INVALID_SUBSERVICE_NAME');
        }
        
        // Find matching sub-service in service's subServices array
        const matchingSubService = service.subServices.find(
          sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
        );
        
        if (!matchingSubService) {
          return sendError(res, 400, `Sub-service "${selected.name}" not found in service sub-services`, 'SUBSERVICE_NOT_FOUND');
        }
        
        // Validate quantity (should be between 1 and max)
        const quantity = selected.quantity !== undefined ? parseInt(selected.quantity) : 1;
        if (quantity < 1) {
          return sendError(res, 400, `Quantity for sub-service "${selected.name}" must be at least 1`, 'INVALID_SUBSERVICE_QUANTITY');
        }
        if (matchingSubService.max && quantity > matchingSubService.max) {
          return sendError(res, 400, `Quantity for sub-service "${selected.name}" cannot exceed ${matchingSubService.max}`, 'INVALID_SUBSERVICE_QUANTITY');
        }
      }
    }

    // Validate and normalize payment method
    let paymentMethod = 'Cash On Delivery'; // Default
    if (payment_method) {
      // Normalize common variations
      const normalizedPaymentMethod = payment_method
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      const validPaymentMethods = ['Cash On Delivery', 'Online Payment'];
      
      // Check if normalized matches valid methods
      if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
        return sendError(res, 400, `Payment method must be one of: ${validPaymentMethods.join(', ')}`, 'INVALID_PAYMENT_METHOD');
      }
      
      paymentMethod = normalizedPaymentMethod;
    }

    // Calculate pricing based on sub-services or service unit type
    let unitType, unitPrice, totalPrice;
    const numberOfUnits = Number(number_of_units);
    
    // Check if service has subServices and user has selected sub-services
    const hasSubServices = service.subServices && service.subServices.length > 0;
    const hasSelectedSubServices = parsedSelectedSubServices && parsedSelectedSubServices.length > 0;
    
    if (request_type === 'Quotation') {
      // For Quotation requests, pricing fields are optional
      // The service might not have basePrice and unitType
      unitType = service.unitType || null;
      
      // If sub-services are selected, calculate from sub-services
      if (hasSubServices && hasSelectedSubServices) {
        let subServicesTotal = 0;
        for (const selected of parsedSelectedSubServices) {
          const matchingSubService = service.subServices.find(
            sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
          );
          if (matchingSubService) {
            const quantity = selected.quantity !== undefined ? parseInt(selected.quantity) : 1;
            subServicesTotal += matchingSubService.rate * quantity;
          }
        }
        if (subServicesTotal > 0) {
          unitPrice = subServicesTotal;
        } else if (service.unitType === 'per_hour') {
          const tier = resolveTimeBasedTier(service, numberOfUnits);
          unitPrice = tier ? tier.price : (service.basePrice || null);
        } else {
          unitPrice = service.basePrice || null;
        }
      } else {
        if (service.unitType === 'per_hour') {
          const tier = resolveTimeBasedTier(service, numberOfUnits);
          unitPrice = tier ? tier.price : (service.basePrice || null);
        } else {
          unitPrice = service.basePrice || null;
        }
      }
      
      totalPrice = null; // Total price not calculated for quotations
    } else {
      // For OnTime and Scheduled requests, calculate pricing
      // If service has subServices and user selected sub-services, calculate from sub-services
      if (hasSubServices && hasSelectedSubServices) {
        // Calculate pricing based on selected sub-services
        let subServicesTotal = 0;
        for (const selected of parsedSelectedSubServices) {
          const matchingSubService = service.subServices.find(
            sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
          );
          if (matchingSubService) {
            const quantity = selected.quantity !== undefined ? parseInt(selected.quantity) : 1;
            subServicesTotal += matchingSubService.rate * quantity;
          }
        }
        
        if (subServicesTotal <= 0) {
          return sendError(res, 400, 'Invalid sub-services selection or pricing', 'INVALID_SUBSERVICES_PRICING');
        }
        
        // Use sub-services pricing (this is the unit price based on selected sub-services)
        unitType = service.unitType || 'per_unit';
        unitPrice = subServicesTotal; // Total of all selected sub-services
        totalPrice = unitPrice * numberOfUnits;
      } else {
        // Use service base price (existing logic)
        unitType = service.unitType;

        if (!unitType || !['per_unit', 'per_hour'].includes(unitType)) {
          return sendError(res, 400, 'Service unit type must be per_unit or per_hour', 'INVALID_UNIT_TYPE');
        }

        if (unitType === 'per_hour') {
          // Check if service uses new rate-based pricing (perHourRate, perDayRate, perMonthRate)
          const hasNewRatePricing = service.perHourRate > 0 && service.perDayRate > 0 && service.perMonthRate > 0;

          if (hasNewRatePricing) {
            // New rate-based pricing: totalPrice = selectedRate × duration × numberOfPersons
            // Validate durationType is provided for new rate-based pricing
            if (!durationType || !['hours', 'days', 'months'].includes(durationType)) {
              return sendError(res, 400, 'durationType is required for this service. Must be hours, days, or months', 'INVALID_DURATION_TYPE');
            }

            // Validate duration (defaults to 1 if not provided)
            const durationValue = duration ? Number(duration) : 1;
            if (!Number.isFinite(durationValue) || durationValue < 1 || !Number.isInteger(durationValue)) {
              return sendError(res, 400, 'duration must be a positive integer', 'INVALID_DURATION');
            }

            // Validate numberOfPersons (defaults to 1 if not provided)
            const personsValue = numberOfPersons ? Number(numberOfPersons) : 1;
            if (!Number.isFinite(personsValue) || personsValue < 1 || !Number.isInteger(personsValue)) {
              return sendError(res, 400, 'numberOfPersons must be a positive integer', 'INVALID_NUMBER_OF_PERSONS');
            }

            // Get the appropriate rate based on durationType
            const rateMap = {
              hours: service.perHourRate,
              days: service.perDayRate,
              months: service.perMonthRate
            };
            const selectedRate = rateMap[durationType];

            // Calculate total price: selectedRate × duration × numberOfPersons
            unitPrice = selectedRate;
            totalPrice = selectedRate * durationValue * personsValue;
          } else {
            // Legacy time-based pricing using timeBasedPricing tiers
            const tier = resolveTimeBasedTier(service, numberOfUnits);

            if (tier) {
              unitPrice = tier.price;
              totalPrice = tier.price;
            } else if (service.basePrice && service.basePrice > 0) {
              unitPrice = service.basePrice;
              totalPrice = service.basePrice * numberOfUnits;
            } else {
              return sendError(res, 400, `No time-based pricing found for ${numberOfUnits} hour(s)`, 'MISSING_TIME_BASED_TIER');
            }
          }
        } else {
          const basePrice = service.basePrice;

          if (!basePrice || basePrice <= 0) {
            return sendError(res, 400, 'Service must have a valid base price for OnTime and Scheduled requests', 'INVALID_SERVICE_PRICE');
          }

          unitPrice = basePrice;
          totalPrice = unitPrice * numberOfUnits;
        }
      }
    }

    // Validate category exists and is active
    const category = await Category.findById(category_id);
    if (!category || !category.isActive) {
      return sendError(res, 400, 'Invalid or inactive category', 'INVALID_CATEGORY');
    }

    // Validate requested_date is not in the past
    const requestedDate = new Date(requested_date);
    const now = new Date();
    if (requestedDate < now) {
      return sendError(res, 400, 'Requested date cannot be in the past', 'INVALID_DATE');
    }

    // Validate minimum advance hours requirement
    if (service.minAdvanceHours && service.minAdvanceHours > 0) {
      const minAdvanceMs = service.minAdvanceHours * 60 * 60 * 1000; // Convert hours to milliseconds
      const minAllowedDate = new Date(now.getTime() + minAdvanceMs);
      if (requestedDate < minAllowedDate) {
        return sendError(
          res,
          400,
          `This service requires booking at least ${service.minAdvanceHours} hour(s) in advance`,
          'INSUFFICIENT_ADVANCE_TIME'
        );
      }
    }

    // Check for discount (from service or active banner)
    let discount = null;
    let discountPercentage = null;
    if (request_type !== 'Quotation' && totalPrice !== null && totalPrice !== undefined) {
      // Check for active banner with discount for this service
      const activeBanner = await Banner.findOne({
        service: service_id,
        isActive: true,
      }).lean();

      // Use service discount if available, otherwise use banner discount
      discountPercentage = service.discount ?? activeBanner?.discountPercentage ?? null;

      // Apply discount to total price if discount exists
      if (discountPercentage && discountPercentage > 0) {
        discount = (totalPrice * discountPercentage) / 100;
        totalPrice = totalPrice - discount;
        // Round to 2 decimal places
        totalPrice = Math.round(totalPrice * 100) / 100;
        discount = Math.round(discount * 100) / 100;
      }
    }

    // Try to find existing user by email or phone to link the order
    const User = require('../models/User');
    const existingUser = await User.findOne({
      $or: [
        { email: user_email.trim().toLowerCase() },
        { phoneNumber: user_phone.trim() }
      ]
    });

    // Create service request data
    const serviceRequestData = {
      user_name: user_name.trim(),
      user_phone: user_phone.trim(),
      user_email: user_email.trim().toLowerCase(),
      address: address.trim(),
      service_id,
      service_name: service_name.trim(),
      category_id,
      category_name: category_name.trim(),
      request_type,
      requested_date: requestedDate,
      message: message ? message.trim() : undefined,
      status: 'Pending',
      number_of_units: numberOfUnits,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'Online Payment' ? 'Pending' : undefined,
      user: existingUser ? existingUser._id : undefined // Link to user if found
    };

    // Add selected sub-services if provided
    if (parsedSelectedSubServices.length > 0) {
      serviceRequestData.selectedSubServices = parsedSelectedSubServices.map(selected => {
        const matchingSubService = service.subServices.find(
          sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
        );
        return {
          name: matchingSubService.name,
          items: matchingSubService.items || 1,
          rate: matchingSubService.rate,
          quantity: selected.quantity !== undefined ? parseInt(selected.quantity) : 1
        };
      });
    }

    // Add question answers if provided (for Quotation requests)
    if (questionAnswers && request_type === 'Quotation') {
      let parsedQuestionAnswers = questionAnswers;
      // Parse if it's a JSON string
      if (typeof questionAnswers === 'string') {
        try {
          parsedQuestionAnswers = JSON.parse(questionAnswers);
        } catch (parseError) {
          // Ignore parse error, don't add questionAnswers
          parsedQuestionAnswers = null;
        }
      }

      if (Array.isArray(parsedQuestionAnswers) && parsedQuestionAnswers.length > 0) {
        // Filter and validate question answers
        serviceRequestData.questionAnswers = parsedQuestionAnswers
          .filter(qa => qa.question && qa.answer && qa.answer.trim() !== '')
          .map(qa => ({
            question: qa.question.trim(),
            answer: qa.answer.trim(),
            questionType: qa.questionType || 'text'
          }));
      }
    }

    // Add pricing fields only for non-Quotation requests or if available
    if (request_type !== 'Quotation') {
      serviceRequestData.unit_type = unitType;
      serviceRequestData.unit_price = unitPrice;
      serviceRequestData.total_price = totalPrice;
      // Add discount information if discount was applied
      if (discountPercentage && discountPercentage > 0) {
        serviceRequestData.discountPercentage = discountPercentage;
        serviceRequestData.discountAmount = discount;
      }

      // Add per hour rate-based pricing fields if applicable
      const hasNewRatePricing = service.perHourRate > 0 && service.perDayRate > 0 && service.perMonthRate > 0;
      if (unitType === 'per_hour' && hasNewRatePricing && durationType) {
        serviceRequestData.durationType = durationType;
        serviceRequestData.duration = duration ? Number(duration) : 1;
        serviceRequestData.numberOfPersons = numberOfPersons ? Number(numberOfPersons) : 1;
      }
    } else {
      // For Quotation requests, add pricing fields only if available
      if (unitType) {
        serviceRequestData.unit_type = unitType;
      }
      if (unitPrice !== null && unitPrice !== undefined) {
        serviceRequestData.unit_price = unitPrice;
      }
      if (totalPrice !== null && totalPrice !== undefined) {
        serviceRequestData.total_price = totalPrice;
      }
    }

    // Handle milestone payment type
    if (payment_type === 'milestone' && milestones && Array.isArray(milestones) && milestones.length >= 2) {
      // Validate milestones
      let totalPercentage = 0;
      const processedMilestones = [];

      for (let i = 0; i < milestones.length; i++) {
        const milestone = milestones[i];

        if (!milestone.name || typeof milestone.name !== 'string') {
          return sendError(res, 400, `Milestone ${i + 1} must have a valid name`, 'INVALID_MILESTONE_NAME');
        }

        const percentage = milestone.percentage ? Number(milestone.percentage) : 0;
        if (percentage <= 0 || percentage > 100) {
          return sendError(res, 400, `Milestone ${i + 1} must have a valid percentage between 1 and 100`, 'INVALID_MILESTONE_PERCENTAGE');
        }

        totalPercentage += percentage;

        // Calculate amount from percentage if totalPrice is available
        let milestoneAmount = milestone.amount ? Number(milestone.amount) : 0;
        if (totalPrice && percentage > 0) {
          milestoneAmount = (percentage / 100) * totalPrice;
          milestoneAmount = Math.round(milestoneAmount * 100) / 100; // Round to 2 decimal places
        }

        processedMilestones.push({
          name: milestone.name.trim(),
          description: milestone.description ? milestone.description.trim() : undefined,
          amount: milestoneAmount,
          percentage: percentage,
          order: milestone.order ? Number(milestone.order) : i + 1,
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : undefined,
          isRequired: true,
          paymentStatus: 'Pending',
          completionStatus: 'NotStarted'
        });
      }

      // Validate total percentage equals 100
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return sendError(res, 400, `Total milestone percentage must equal 100%, got ${totalPercentage}%`, 'INVALID_MILESTONE_TOTAL_PERCENTAGE');
      }

      // Sort milestones by order
      processedMilestones.sort((a, b) => a.order - b.order);

      // Add milestone data to service request
      serviceRequestData.paymentType = 'milestone';
      serviceRequestData.milestones = processedMilestones;
      serviceRequestData.requireSequentialPayment = require_sequential_payment !== false; // Default to true
    } else if (payment_type === 'full' || paymentMethod === 'Online Payment') {
      serviceRequestData.paymentType = 'full';
    }

    // Create the service request
    const serviceRequest = await ServiceRequest.create(serviceRequestData);

    // Send email notification to admin
    try {
      // Get admin email(s) - you can modify this to get from Admin model or env variable
      const adminEmail = process.env.ADMIN_EMAIL || 'info@zushh.com';
      if (emailService.isValidEmail(adminEmail)) {
        await emailService.sendAdminNotificationEmail(adminEmail, serviceRequest);
      }
    } catch (emailError) {
      // Log error but don't fail the request submission
      console.error('Failed to send admin notification email:', emailError.message);
    }

    // Transform response to match frontend interface
    const transformedRequest = {
      _id: serviceRequest._id,
      user_name: serviceRequest.user_name,
      user_phone: serviceRequest.user_phone,
      user_email: serviceRequest.user_email,
      address: serviceRequest.address,
      service_id: serviceRequest.service_id,
      service_name: serviceRequest.service_name,
      category_id: serviceRequest.category_id,
      category_name: serviceRequest.category_name,
      request_type: serviceRequest.request_type,
      requested_date: serviceRequest.requested_date.toISOString(),
      message: serviceRequest.message,
      status: serviceRequest.status,
      unit_type: serviceRequest.unit_type,
      unit_price: serviceRequest.unit_price,
      number_of_units: serviceRequest.number_of_units,
      total_price: serviceRequest.total_price,
      selectedSubServices: serviceRequest.selectedSubServices || [],
      questionAnswers: serviceRequest.questionAnswers || [],
      paymentMethod: serviceRequest.paymentMethod,
      paymentStatus: serviceRequest.paymentStatus,
      paymentDetails: serviceRequest.paymentDetails || {},
      createdAt: serviceRequest.createdAt.toISOString(),
      updatedAt: serviceRequest.updatedAt.toISOString()
    };

    // Add discount information if discount was applied
    if (serviceRequest.discountPercentage && serviceRequest.discountPercentage > 0) {
      transformedRequest.discountPercentage = serviceRequest.discountPercentage;
      transformedRequest.discountAmount = serviceRequest.discountAmount;
    }

    // Add milestone information if present
    if (serviceRequest.paymentType) {
      transformedRequest.paymentType = serviceRequest.paymentType;
    }
    if (serviceRequest.milestones && serviceRequest.milestones.length > 0) {
      transformedRequest.milestones = serviceRequest.milestones;
    }
    if (serviceRequest.requireSequentialPayment !== undefined) {
      transformedRequest.requireSequentialPayment = serviceRequest.requireSequentialPayment;
    }

    const response = {
      success: true,
      exception: null,
      description: 'Service request submitted successfully',
      content: {
        serviceRequest: transformedRequest
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Admin submit service request on behalf of user
// @route   POST /api/service-requests/admin-submit
// @access  Admin only
const adminSubmitServiceRequest = async (req, res, next) => {
  try {
    const {
      user_name,
      user_phone,
      user_email,
      address,
      service_id,
      service_name,
      category_id,
      category_name,
      request_type,
      requested_date,
      message,
      number_of_units,
      payment_method,
      selectedSubServices,
      // Per Hour rate-based pricing fields
      durationType,
      duration,
      numberOfPersons
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'user_name', 'user_phone', 'user_email', 'address',
      'service_id', 'service_name', 'category_id', 'category_name',
      'request_type', 'requested_date', 'number_of_units'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return sendError(res, 400, `Missing required fields: ${missingFields.join(', ')}`, 'MISSING_REQUIRED_FIELDS');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(user_email)) {
      return sendError(res, 400, 'Invalid email format', 'INVALID_EMAIL');
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(user_phone.replace(/[\s\-\(\)]/g, ''))) {
      return sendError(res, 400, 'Invalid phone number format', 'INVALID_PHONE');
    }

    // Validate request_type
    if (!['Quotation', 'OnTime', 'Scheduled'].includes(request_type)) {
      return sendError(res, 400, 'Invalid request_type. Must be Quotation, OnTime, or Scheduled', 'INVALID_REQUEST_TYPE');
    }

    // Validate number_of_units
    if (!number_of_units || number_of_units <= 0 || !Number.isInteger(Number(number_of_units))) {
      return sendError(res, 400, 'Number of units must be a positive integer', 'INVALID_NUMBER_OF_UNITS');
    }

    // Validate service exists and is active
    const service = await Service.findById(service_id).select('+subServices');
    if (!service || !service.isActive) {
      return sendError(res, 400, 'Invalid or inactive service', 'INVALID_SERVICE');
    }

    // Handle sub-services selection if provided
    let parsedSelectedSubServices = [];
    if (selectedSubServices !== undefined && selectedSubServices !== null) {
      try {
        parsedSelectedSubServices = typeof selectedSubServices === 'string'
          ? JSON.parse(selectedSubServices)
          : selectedSubServices;
      } catch (parseError) {
        return sendError(res, 400, 'selectedSubServices must be a valid JSON array', 'INVALID_SELECTED_SUBSERVICES');
      }

      if (!Array.isArray(parsedSelectedSubServices)) {
        return sendError(res, 400, 'selectedSubServices must be an array', 'INVALID_SELECTED_SUBSERVICES');
      }

      if (!service.subServices || service.subServices.length === 0) {
        return sendError(res, 400, 'Service does not have sub-services available', 'SERVICE_NO_SUBSERVICES');
      }

      for (const selected of parsedSelectedSubServices) {
        if (!selected.name) {
          return sendError(res, 400, 'Each selected sub-service must have a name', 'INVALID_SUBSERVICE_NAME');
        }

        const matchingSubService = service.subServices.find(
          sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
        );

        if (!matchingSubService) {
          return sendError(res, 400, `Sub-service "${selected.name}" not found in service sub-services`, 'SUBSERVICE_NOT_FOUND');
        }

        const quantity = selected.quantity !== undefined ? parseInt(selected.quantity) : 1;
        if (quantity < 1) {
          return sendError(res, 400, `Quantity for sub-service "${selected.name}" must be at least 1`, 'INVALID_SUBSERVICE_QUANTITY');
        }
        if (matchingSubService.max && quantity > matchingSubService.max) {
          return sendError(res, 400, `Quantity for sub-service "${selected.name}" cannot exceed ${matchingSubService.max}`, 'INVALID_SUBSERVICE_QUANTITY');
        }
      }
    }

    // Validate and normalize payment method
    let paymentMethod = 'Cash On Delivery';
    if (payment_method) {
      const normalizedPaymentMethod = payment_method
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      const validPaymentMethods = ['Cash On Delivery', 'Online Payment'];

      if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
        return sendError(res, 400, `Payment method must be one of: ${validPaymentMethods.join(', ')}`, 'INVALID_PAYMENT_METHOD');
      }

      paymentMethod = normalizedPaymentMethod;
    }

    // Calculate pricing
    let unitType, unitPrice, totalPrice;
    const numberOfUnits = Number(number_of_units);

    const hasSubServices = service.subServices && service.subServices.length > 0;
    const hasSelectedSubServices = parsedSelectedSubServices && parsedSelectedSubServices.length > 0;

    if (request_type === 'Quotation') {
      unitType = service.unitType || null;

      if (hasSubServices && hasSelectedSubServices) {
        let subServicesTotal = 0;
        for (const selected of parsedSelectedSubServices) {
          const matchingSubService = service.subServices.find(
            sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
          );
          if (matchingSubService) {
            const quantity = selected.quantity !== undefined ? parseInt(selected.quantity) : 1;
            subServicesTotal += matchingSubService.rate * quantity;
          }
        }
        if (subServicesTotal > 0) {
          unitPrice = subServicesTotal;
        } else if (service.unitType === 'per_hour') {
          const tier = resolveTimeBasedTier(service, numberOfUnits);
          unitPrice = tier ? tier.price : (service.basePrice || null);
        } else {
          unitPrice = service.basePrice || null;
        }
      } else {
        if (service.unitType === 'per_hour') {
          const tier = resolveTimeBasedTier(service, numberOfUnits);
          unitPrice = tier ? tier.price : (service.basePrice || null);
        } else {
          unitPrice = service.basePrice || null;
        }
      }

      totalPrice = null;
    } else {
      if (hasSubServices && hasSelectedSubServices) {
        let subServicesTotal = 0;
        for (const selected of parsedSelectedSubServices) {
          const matchingSubService = service.subServices.find(
            sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
          );
          if (matchingSubService) {
            const quantity = selected.quantity !== undefined ? parseInt(selected.quantity) : 1;
            subServicesTotal += matchingSubService.rate * quantity;
          }
        }

        if (subServicesTotal <= 0) {
          return sendError(res, 400, 'Invalid sub-services selection or pricing', 'INVALID_SUBSERVICES_PRICING');
        }

        unitType = service.unitType || 'per_unit';
        unitPrice = subServicesTotal;
        totalPrice = unitPrice * numberOfUnits;
      } else {
        unitType = service.unitType;

        if (!unitType || !['per_unit', 'per_hour'].includes(unitType)) {
          return sendError(res, 400, 'Service unit type must be per_unit or per_hour', 'INVALID_UNIT_TYPE');
        }

        if (unitType === 'per_hour') {
          // Check if service uses new rate-based pricing (perHourRate, perDayRate, perMonthRate)
          const hasNewRatePricing = service.perHourRate > 0 && service.perDayRate > 0 && service.perMonthRate > 0;

          if (hasNewRatePricing) {
            // New rate-based pricing: totalPrice = selectedRate × duration × numberOfPersons
            // Validate durationType is provided for new rate-based pricing
            if (!durationType || !['hours', 'days', 'months'].includes(durationType)) {
              return sendError(res, 400, 'durationType is required for this service. Must be hours, days, or months', 'INVALID_DURATION_TYPE');
            }

            // Validate duration (defaults to 1 if not provided)
            const durationValue = duration ? Number(duration) : 1;
            if (!Number.isFinite(durationValue) || durationValue < 1 || !Number.isInteger(durationValue)) {
              return sendError(res, 400, 'duration must be a positive integer', 'INVALID_DURATION');
            }

            // Validate numberOfPersons (defaults to 1 if not provided)
            const personsValue = numberOfPersons ? Number(numberOfPersons) : 1;
            if (!Number.isFinite(personsValue) || personsValue < 1 || !Number.isInteger(personsValue)) {
              return sendError(res, 400, 'numberOfPersons must be a positive integer', 'INVALID_NUMBER_OF_PERSONS');
            }

            // Get the appropriate rate based on durationType
            const rateMap = {
              hours: service.perHourRate,
              days: service.perDayRate,
              months: service.perMonthRate
            };
            const selectedRate = rateMap[durationType];

            // Calculate total price: selectedRate × duration × numberOfPersons
            unitPrice = selectedRate;
            totalPrice = selectedRate * durationValue * personsValue;
          } else {
            // Legacy time-based pricing using timeBasedPricing tiers
            const tier = resolveTimeBasedTier(service, numberOfUnits);

            if (tier) {
              unitPrice = tier.price;
              totalPrice = tier.price;
            } else if (service.basePrice && service.basePrice > 0) {
              unitPrice = service.basePrice;
              totalPrice = service.basePrice * numberOfUnits;
            } else {
              return sendError(res, 400, `No time-based pricing found for ${numberOfUnits} hour(s)`, 'MISSING_TIME_BASED_TIER');
            }
          }
        } else {
          const basePrice = service.basePrice;

          if (!basePrice || basePrice <= 0) {
            return sendError(res, 400, 'Service must have a valid base price for OnTime and Scheduled requests', 'INVALID_SERVICE_PRICE');
          }

          unitPrice = basePrice;
          totalPrice = unitPrice * numberOfUnits;
        }
      }
    }

    // Validate category exists and is active
    const category = await Category.findById(category_id);
    if (!category || !category.isActive) {
      return sendError(res, 400, 'Invalid or inactive category', 'INVALID_CATEGORY');
    }

    // Parse requested_date (admin can set any date, no past date validation)
    const requestedDate = new Date(requested_date);

    // Check for discount
    let discount = null;
    let discountPercentage = null;
    if (request_type !== 'Quotation' && totalPrice !== null && totalPrice !== undefined) {
      const activeBanner = await Banner.findOne({
        service: service_id,
        isActive: true,
      }).lean();

      discountPercentage = service.discount ?? activeBanner?.discountPercentage ?? null;

      if (discountPercentage && discountPercentage > 0) {
        discount = (totalPrice * discountPercentage) / 100;
        totalPrice = totalPrice - discount;
        totalPrice = Math.round(totalPrice * 100) / 100;
        discount = Math.round(discount * 100) / 100;
      }
    }

    // Create service request data
    const serviceRequestData = {
      user_name: user_name.trim(),
      user_phone: user_phone.trim(),
      user_email: user_email.trim().toLowerCase(),
      address: address.trim(),
      service_id,
      service_name: service_name.trim(),
      category_id,
      category_name: category_name.trim(),
      request_type,
      requested_date: requestedDate,
      message: message ? message.trim() : undefined,
      status: 'Pending',
      number_of_units: numberOfUnits,
      paymentMethod: paymentMethod,
      paymentStatus: paymentMethod === 'Online Payment' ? 'Pending' : undefined,
      createdByAdmin: req.user._id
    };

    // Add selected sub-services if provided
    if (parsedSelectedSubServices.length > 0) {
      serviceRequestData.selectedSubServices = parsedSelectedSubServices.map(selected => {
        const matchingSubService = service.subServices.find(
          sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
        );
        return {
          name: matchingSubService.name,
          items: matchingSubService.items || 1,
          rate: matchingSubService.rate,
          quantity: selected.quantity !== undefined ? parseInt(selected.quantity) : 1
        };
      });
    }

    // Add pricing fields
    if (request_type !== 'Quotation') {
      serviceRequestData.unit_type = unitType;
      serviceRequestData.unit_price = unitPrice;
      serviceRequestData.total_price = totalPrice;
      if (discountPercentage && discountPercentage > 0) {
        serviceRequestData.discountPercentage = discountPercentage;
        serviceRequestData.discountAmount = discount;
      }

      // Add per hour rate-based pricing fields if applicable
      const hasNewRatePricing = service.perHourRate > 0 && service.perDayRate > 0 && service.perMonthRate > 0;
      if (unitType === 'per_hour' && hasNewRatePricing && durationType) {
        serviceRequestData.durationType = durationType;
        serviceRequestData.duration = duration ? Number(duration) : 1;
        serviceRequestData.numberOfPersons = numberOfPersons ? Number(numberOfPersons) : 1;
      }
    } else {
      if (unitType) {
        serviceRequestData.unit_type = unitType;
      }
      if (unitPrice !== null && unitPrice !== undefined) {
        serviceRequestData.unit_price = unitPrice;
      }
      if (totalPrice !== null && totalPrice !== undefined) {
        serviceRequestData.total_price = totalPrice;
      }
    }

    // Create the service request
    const serviceRequest = await ServiceRequest.create(serviceRequestData);

    // Send notifications to customer (email and SMS)
    const notificationResults = { email: null, sms: null };

    // Send email confirmation to customer
    try {
      if (emailService.isValidEmail(serviceRequest.user_email)) {
        notificationResults.email = await emailService.sendOrderConfirmationEmail(
          serviceRequest.user_email,
          serviceRequest
        );
      }
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError.message);
      notificationResults.email = { success: false, error: emailError.message };
    }

    // Send SMS confirmation to customer
    try {
      if (smsService.isValidUAEPhoneNumber(serviceRequest.user_phone)) {
        notificationResults.sms = await smsService.sendOrderConfirmation(
          serviceRequest.user_phone,
          serviceRequest
        );
      }
    } catch (smsError) {
      console.error('Failed to send order confirmation SMS:', smsError.message);
      notificationResults.sms = { success: false, error: smsError.message };
    }

    // Transform response
    const transformedRequest = {
      _id: serviceRequest._id,
      user_name: serviceRequest.user_name,
      user_phone: serviceRequest.user_phone,
      user_email: serviceRequest.user_email,
      address: serviceRequest.address,
      service_id: serviceRequest.service_id,
      service_name: serviceRequest.service_name,
      category_id: serviceRequest.category_id,
      category_name: serviceRequest.category_name,
      request_type: serviceRequest.request_type,
      requested_date: serviceRequest.requested_date.toISOString(),
      message: serviceRequest.message,
      status: serviceRequest.status,
      unit_type: serviceRequest.unit_type,
      unit_price: serviceRequest.unit_price,
      number_of_units: serviceRequest.number_of_units,
      total_price: serviceRequest.total_price,
      selectedSubServices: serviceRequest.selectedSubServices || [],
      paymentMethod: serviceRequest.paymentMethod,
      createdByAdmin: serviceRequest.createdByAdmin,
      createdAt: serviceRequest.createdAt.toISOString(),
      updatedAt: serviceRequest.updatedAt.toISOString()
    };

    if (serviceRequest.discountPercentage && serviceRequest.discountPercentage > 0) {
      transformedRequest.discountPercentage = serviceRequest.discountPercentage;
      transformedRequest.discountAmount = serviceRequest.discountAmount;
    }

    const response = {
      success: true,
      exception: null,
      description: 'Service request submitted by admin successfully',
      content: {
        serviceRequest: transformedRequest,
        notifications: {
          emailSent: notificationResults.email?.success || false,
          smsSent: notificationResults.sms?.success || false
        }
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all service requests (Admin only)
// @route   GET /api/service-requests
// @access  Admin only
const getServiceRequests = async (req, res, next) => {
  try {
    const { status, request_type, serviceId, keyword, page = 1, limit = 10 } = req.query;

    // Build query
    const query = {};
    
    // Apply filters
    if (status) query.status = status;
    if (request_type) query.request_type = request_type;
    
    // Filter by service ID
    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return sendError(res, 400, 'Invalid service ID format', 'INVALID_SERVICE_ID');
      }
      query.service_id = serviceId;
    }
    
    // Keyword search - search across multiple fields
    // MongoDB will automatically AND the keyword search with other filters
    if (keyword) {
      const keywordRegex = new RegExp(keyword, 'i'); // Case-insensitive search
      query.$or = [
        { user_name: keywordRegex },
        { user_email: keywordRegex },
        { user_phone: keywordRegex },
        { service_name: keywordRegex },
        { category_name: keywordRegex },
        { address: keywordRegex },
        { message: keywordRegex }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Calculate current month start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Execute queries in parallel
    const [serviceRequests, totalCount, totalOrders, currentMonthOrders] = await Promise.all([
      ServiceRequest.find(query)
        .populate('service_id', 'name description basePrice unitType timeBasedPricing')
        .populate('category_id', 'name description')
        .populate('vendor', 'firstName lastName email mobileNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
        .limit(limitNum),
      ServiceRequest.countDocuments(query),
      // Total orders count (all orders regardless of filters)
      ServiceRequest.countDocuments({}),
      // Current month orders count (all orders in current month regardless of filters)
      ServiceRequest.countDocuments({
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      })
    ]);

    // Transform service requests
    const transformedRequests = serviceRequests.map(request => ({
      _id: request._id,
      user_name: request.user_name,
      user_phone: request.user_phone,
      user_email: request.user_email,
      address: request.address,
      service_id: request.service_id,
      service_name: request.service_name,
      category_id: request.category_id,
      category_name: request.category_name,
      request_type: request.request_type,
      requested_date: request.requested_date.toISOString(),
      message: request.message,
      status: request.status,
      vendor: request.vendor,
      unit_type: request.unit_type,
      unit_price: request.unit_price,
      number_of_units: request.number_of_units,
      total_price: request.total_price,
      selectedSubServices: request.selectedSubServices || [],
      paymentMethod: request.paymentMethod,
      paymentStatus: request.paymentStatus,
      paymentDetails: request.paymentDetails || {},
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString()
    }));

    const response = {
      success: true,
      exception: null,
      description: 'Service requests retrieved successfully',
      content: {
        serviceRequests: transformedRequests,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalCount,
          limit: limitNum,
          hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
          hasPrevPage: pageNum > 1
        },
        statistics: {
          totalOrders,
          currentMonthOrders
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update service request status (Admin only)
// @route   PUT /api/service-requests/:id/status
// @access  Admin only
const updateServiceRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, vendor } = req.body;

    // Validate status
    if (!['Pending', 'Assigned', 'Accepted', 'Completed', 'Cancelled'].includes(status)) {
      return sendError(res, 400, 'Invalid status. Must be Pending, Assigned, Accepted, Completed, or Cancelled', 'INVALID_STATUS');
    }

    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Update service request
    const updateData = { status };
    if (vendor) {
      updateData.vendor = vendor;
      // When assigning a vendor to a Pending request, automatically change status to 'Assigned'
      // This ensures assignments always reflect the correct status
      if (serviceRequest.status === 'Pending' && status === 'Pending') {
        updateData.status = 'Assigned';
      }
    }

    const updatedRequest = await ServiceRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('service_id', 'name description')
     .populate('category_id', 'name description');

    // Transform response
    const transformedRequest = {
      _id: updatedRequest._id,
      user_name: updatedRequest.user_name,
      user_phone: updatedRequest.user_phone,
      user_email: updatedRequest.user_email,
      address: updatedRequest.address,
      service_id: updatedRequest.service_id,
      service_name: updatedRequest.service_name,
      category_id: updatedRequest.category_id,
      category_name: updatedRequest.category_name,
      request_type: updatedRequest.request_type,
      requested_date: updatedRequest.requested_date.toISOString(),
      message: updatedRequest.message,
      status: updatedRequest.status,
      vendor: updatedRequest.vendor,
      selectedSubServices: updatedRequest.selectedSubServices || [],
      paymentMethod: updatedRequest.paymentMethod,
      paymentStatus: updatedRequest.paymentStatus,
      paymentDetails: updatedRequest.paymentDetails || {},
      createdAt: updatedRequest.createdAt.toISOString(),
      updatedAt: updatedRequest.updatedAt.toISOString()
    };

    const response = {
      success: true,
      exception: null,
      description: 'Service request status updated successfully',
      content: {
        serviceRequest: transformedRequest
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Assign service request to vendor (Admin only)
// @route   PATCH /api/requests/assign
// @access  Admin only
const assignRequest = async (req, res, next) => {
  try {
    const { requestId, vendorId } = req.body;

    // Validate required fields
    if (!requestId || !vendorId) {
      return sendError(res, 400, 'Request ID and Vendor ID are required', 'MISSING_REQUIRED_FIELDS');
    }

    // Validate request exists
    const serviceRequest = await ServiceRequest.findById(requestId);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Validate vendor exists
    const Vendor = require('../models/Vendor');
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendError(res, 404, 'Vendor not found', 'VENDOR_NOT_FOUND');
    }

    // Update service request with vendor assignment
    const updatedRequest = await ServiceRequest.findByIdAndUpdate(
      requestId,
      { 
        vendor: vendorId,
        status: 'Assigned'
      },
      { new: true, runValidators: true }
    ).populate('service_id', 'name description')
     .populate('category_id', 'name description')
     .populate('vendor', 'firstName lastName email mobileNumber');

    // Send email to customer about assignment
    try {
      if (updatedRequest.user_email && emailService.isValidEmail(updatedRequest.user_email)) {
        await emailService.sendServiceAssignedEmail(
          updatedRequest.user_email,
          updatedRequest.user_name,
          updatedRequest,
          vendor
        );
      }
    } catch (emailError) {
      // Log error but don't fail the assignment
      console.error('Failed to send assignment email to customer:', emailError.message);
    }

    // Transform response
    const transformedRequest = {
      _id: updatedRequest._id,
      user_name: updatedRequest.user_name,
      user_phone: updatedRequest.user_phone,
      user_email: updatedRequest.user_email,
      address: updatedRequest.address,
      service_id: updatedRequest.service_id,
      service_name: updatedRequest.service_name,
      category_id: updatedRequest.category_id,
      category_name: updatedRequest.category_name,
      request_type: updatedRequest.request_type,
      requested_date: updatedRequest.requested_date.toISOString(),
      message: updatedRequest.message,
      status: updatedRequest.status,
      vendor: updatedRequest.vendor,
      selectedSubServices: updatedRequest.selectedSubServices || [],
      paymentMethod: updatedRequest.paymentMethod,
      paymentStatus: updatedRequest.paymentStatus,
      paymentDetails: updatedRequest.paymentDetails || {},
      createdAt: updatedRequest.createdAt.toISOString(),
      updatedAt: updatedRequest.updatedAt.toISOString()
    };

    const response = {
      success: true,
      exception: null,
      description: 'Service request assigned successfully',
      content: {
        serviceRequest: transformedRequest
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service request (Admin only)
// @route   DELETE /api/service-requests/:id
// @access  Admin only
const deleteServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate service request exists
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Delete the service request
    await ServiceRequest.findByIdAndDelete(id);

    const response = {
      success: true,
      exception: null,
      description: 'Service request deleted successfully',
      content: {
        deletedRequest: {
          _id: serviceRequest._id,
          user_name: serviceRequest.user_name,
          service_name: serviceRequest.service_name,
          status: serviceRequest.status
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk delete service requests (Admin only)
// @route   DELETE /api/service-requests/bulk-delete
// @access  Admin only
const bulkDeleteServiceRequests = async (req, res, next) => {
  try {
    const { ids } = req.body;

    // Validate ids array
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 400, 'Request IDs array is required', 'MISSING_IDS');
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return sendError(res, 400, `Invalid request IDs: ${invalidIds.join(', ')}`, 'INVALID_IDS');
    }

    // Find all service requests to be deleted (for response)
    const serviceRequests = await ServiceRequest.find({ _id: { $in: ids } });

    if (serviceRequests.length === 0) {
      return sendError(res, 404, 'No service requests found with the provided IDs', 'NO_REQUESTS_FOUND');
    }

    // Delete all service requests
    const deleteResult = await ServiceRequest.deleteMany({ _id: { $in: ids } });

    const response = {
      success: true,
      exception: null,
      description: `${deleteResult.deletedCount} service request(s) deleted successfully`,
      content: {
        deletedCount: deleteResult.deletedCount,
        requestedCount: ids.length,
        deletedRequests: serviceRequests.map(req => ({
          _id: req._id,
          user_name: req.user_name,
          service_name: req.service_name,
          status: req.status
        }))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get order details by request ID
// @route   GET /api/service-requests/:id/details
// @access  Public or JWT protected (depending on requirement)
const getOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid request ID', 'INVALID_REQUEST_ID');
    }

    // Find service request with populated fields
    const serviceRequest = await ServiceRequest.findById(id)
      .populate('service_id', 'name description basePrice unitType timeBasedPricing')
      .populate('category_id', 'name description')
      .populate('vendor', 'firstName lastName email mobileNumber coveredCity');

    if (!serviceRequest) {
      return sendError(res, 404, 'Order not found', 'ORDER_NOT_FOUND');
    }

    // Extract city from address or use vendor's coveredCity
    // Try to extract city from address (assuming format: "Street, City, Country")
    let serviceCity = '';
    if (serviceRequest.address) {
      const addressParts = serviceRequest.address.split(',').map(part => part.trim());
      // Usually city is second to last or last part before country
      if (addressParts.length >= 2) {
        serviceCity = addressParts[addressParts.length - 2] || addressParts[addressParts.length - 1];
      } else {
        serviceCity = serviceRequest.address;
      }
    }
    
    // If vendor is assigned and has coveredCity, use that as service city
    if (serviceRequest.vendor && serviceRequest.vendor.coveredCity) {
      serviceCity = serviceRequest.vendor.coveredCity;
    }

    // Transform response to match requested format
    const orderDetails = {
      orderId: serviceRequest._id.toString(),
      userName: serviceRequest.user_name,
      userPhoneNumber: serviceRequest.user_phone,
      userEmail: serviceRequest.user_email,
      serviceCity: serviceCity || 'N/A',
      address: serviceRequest.address || 'N/A',
      category: {
        id: serviceRequest.category_id?._id?.toString() || serviceRequest.category_id?.toString(),
        name: serviceRequest.category_name
      },
      service: {
        id: serviceRequest.service_id?._id?.toString() || serviceRequest.service_id?.toString(),
        name: serviceRequest.service_name
      },
      createdDate: serviceRequest.createdAt ? serviceRequest.createdAt.toISOString() : null,
      requestedDateTime: serviceRequest.requested_date ? serviceRequest.requested_date.toISOString() : null,
      paymentMethod: serviceRequest.paymentMethod || 'Cash On Delivery',
      paymentStatus: serviceRequest.paymentStatus,
      paymentDetails: serviceRequest.paymentDetails || {},
      // Additional useful fields
      requestType: serviceRequest.request_type,
      status: serviceRequest.status,
      totalPrice: serviceRequest.total_price,
      unitType: serviceRequest.unit_type,
      unitPrice: serviceRequest.unit_price,
      numberOfUnits: serviceRequest.number_of_units,
      selectedSubServices: serviceRequest.selectedSubServices || [],
      message: serviceRequest.message,
      vendor: serviceRequest.vendor ? {
        id: serviceRequest.vendor._id?.toString(),
        name: `${serviceRequest.vendor.firstName || ''} ${serviceRequest.vendor.lastName || ''}`.trim(),
        coveredCity: serviceRequest.vendor.coveredCity
      } : null
    };

    const response = {
      success: true,
      exception: null,
      description: 'Order details retrieved successfully',
      content: {
        orderDetails
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting order details:', error);
    next(error);
  }
};

// @desc    Update service request by user (only when status is Pending)
// @route   PUT /api/service-requests/:id/request-update
// @access  Private (User only - verified via JWT token)
const userUpdateServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      // Editable fields
      user_name,
      address,
      requested_date,
      message,
      number_of_units,
      payment_method,
      selectedSubServices,
      // Per Hour rate-based pricing fields
      durationType,
      duration,
      numberOfPersons
    } = req.body;

    // Validate request ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid request ID', 'INVALID_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Verify ownership via JWT token - match user's email or phone from token
    const User = require('../models/User');
    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return sendError(res, 401, 'User not found', 'USER_NOT_FOUND');
    }

    // Check if the service request belongs to the authenticated user
    const emailMatch = currentUser.email && serviceRequest.user_email.toLowerCase() === currentUser.email.toLowerCase();
    const phoneMatch = currentUser.phoneNumber && serviceRequest.user_phone === currentUser.phoneNumber;

    if (!emailMatch && !phoneMatch) {
      return sendError(res, 403, 'You are not authorized to update this service request', 'UNAUTHORIZED_ACCESS');
    }

    // Check if status is Pending - only allow edit when Pending
    if (serviceRequest.status !== 'Pending') {
      return sendError(
        res,
        400,
        `Cannot edit service request. Current status is "${serviceRequest.status}". Only requests with "Pending" status can be edited.`,
        'REQUEST_NOT_EDITABLE'
      );
    }

    // Build update object with only provided fields
    const updateData = {};
    let service = null; // Cache service object for reuse

    if (user_name !== undefined) {
      updateData.user_name = user_name.trim();
    }

    if (address !== undefined) {
      updateData.address = address.trim();
    }

    if (message !== undefined) {
      updateData.message = message ? message.trim() : '';
    }

    if (requested_date !== undefined) {
      const newRequestedDate = new Date(requested_date);
      const now = new Date();
      if (newRequestedDate < now) {
        return sendError(res, 400, 'Requested date cannot be in the past', 'INVALID_DATE');
      }

      // Check minimum advance hours if service has this requirement
      if (!service) {
        service = await Service.findById(serviceRequest.service_id);
      }
      if (service && service.minAdvanceHours && service.minAdvanceHours > 0) {
        const minAdvanceMs = service.minAdvanceHours * 60 * 60 * 1000;
        const minAllowedDate = new Date(now.getTime() + minAdvanceMs);
        if (newRequestedDate < minAllowedDate) {
          return sendError(
            res,
            400,
            `This service requires booking at least ${service.minAdvanceHours} hour(s) in advance`,
            'INSUFFICIENT_ADVANCE_TIME'
          );
        }
      }
      updateData.requested_date = newRequestedDate;
    }

    if (number_of_units !== undefined) {
      if (!number_of_units || number_of_units <= 0 || !Number.isInteger(Number(number_of_units))) {
        return sendError(res, 400, 'Number of units must be a positive integer', 'INVALID_NUMBER_OF_UNITS');
      }
      updateData.number_of_units = Number(number_of_units);

      // Recalculate pricing if number_of_units changed and it's not a Quotation
      if (serviceRequest.request_type !== 'Quotation') {
        if (!service) {
          service = await Service.findById(serviceRequest.service_id);
        }
        if (service) {
          const numberOfUnits = Number(number_of_units);

          if (service.unitType === 'per_hour') {
            // Check if service uses new rate-based pricing
            const hasNewRatePricing = service.perHourRate > 0 && service.perDayRate > 0 && service.perMonthRate > 0;

            if (hasNewRatePricing) {
              // For new rate-based pricing, recalculation happens in the durationType/duration/numberOfPersons section
              // This section only handles legacy timeBasedPricing
            } else {
              // Legacy time-based pricing
              const tier = resolveTimeBasedTier(service, numberOfUnits);
              if (tier) {
                updateData.unit_price = tier.price;
                updateData.total_price = tier.price;
              } else if (service.basePrice && service.basePrice > 0) {
                updateData.unit_price = service.basePrice;
                updateData.total_price = service.basePrice * numberOfUnits;
              }
            }
          } else {
            updateData.total_price = serviceRequest.unit_price * numberOfUnits;
          }
        }
      }
    }

    // Handle per hour rate-based pricing field updates (durationType, duration, numberOfPersons)
    if (durationType !== undefined || duration !== undefined || numberOfPersons !== undefined) {
      if (!service) {
        service = await Service.findById(serviceRequest.service_id);
      }

      if (service && service.unitType === 'per_hour') {
        const hasNewRatePricing = service.perHourRate > 0 && service.perDayRate > 0 && service.perMonthRate > 0;

        if (hasNewRatePricing && serviceRequest.request_type !== 'Quotation') {
          // Get current or new values for each field
          const newDurationType = durationType || serviceRequest.durationType;
          const newDuration = duration !== undefined ? Number(duration) : (serviceRequest.duration || 1);
          const newNumberOfPersons = numberOfPersons !== undefined ? Number(numberOfPersons) : (serviceRequest.numberOfPersons || 1);

          // Validate durationType
          if (!newDurationType || !['hours', 'days', 'months'].includes(newDurationType)) {
            return sendError(res, 400, 'durationType must be hours, days, or months', 'INVALID_DURATION_TYPE');
          }

          // Validate duration
          if (!Number.isFinite(newDuration) || newDuration < 1 || !Number.isInteger(newDuration)) {
            return sendError(res, 400, 'duration must be a positive integer', 'INVALID_DURATION');
          }

          // Validate numberOfPersons
          if (!Number.isFinite(newNumberOfPersons) || newNumberOfPersons < 1 || !Number.isInteger(newNumberOfPersons)) {
            return sendError(res, 400, 'numberOfPersons must be a positive integer', 'INVALID_NUMBER_OF_PERSONS');
          }

          // Get the appropriate rate based on durationType
          const rateMap = {
            hours: service.perHourRate,
            days: service.perDayRate,
            months: service.perMonthRate
          };
          const selectedRate = rateMap[newDurationType];

          // Calculate new total price: selectedRate × duration × numberOfPersons
          updateData.durationType = newDurationType;
          updateData.duration = newDuration;
          updateData.numberOfPersons = newNumberOfPersons;
          updateData.unit_price = selectedRate;
          updateData.total_price = selectedRate * newDuration * newNumberOfPersons;
        }
      }
    }

    if (payment_method !== undefined) {
      const normalizedPaymentMethod = payment_method
        .trim()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      const validPaymentMethods = ['Cash On Delivery', 'Online Payment'];
      if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
        return sendError(res, 400, `Payment method must be one of: ${validPaymentMethods.join(', ')}`, 'INVALID_PAYMENT_METHOD');
      }
      updateData.paymentMethod = normalizedPaymentMethod;
      // Update payment status if switching to online payment
      if (normalizedPaymentMethod === 'Online Payment') {
        updateData.paymentStatus = 'Pending';
      } else if (normalizedPaymentMethod === 'Cash On Delivery') {
        updateData.paymentStatus = undefined; // Reset payment status for COD
      }
    }

    // Handle sub-services update if provided
    if (selectedSubServices !== undefined) {
      // Always fetch with subServices for sub-services validation
      service = await Service.findById(serviceRequest.service_id).select('+subServices');

      if (selectedSubServices && selectedSubServices.length > 0) {
        if (!service.subServices || service.subServices.length === 0) {
          return sendError(res, 400, 'Service does not have sub-services available', 'SERVICE_NO_SUBSERVICES');
        }

        // Validate each selected sub-service
        const parsedSelectedSubServices = typeof selectedSubServices === 'string'
          ? JSON.parse(selectedSubServices)
          : selectedSubServices;

        for (const selected of parsedSelectedSubServices) {
          const matchingSubService = service.subServices.find(
            sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
          );

          if (!matchingSubService) {
            return sendError(res, 400, `Sub-service "${selected.name}" not found`, 'SUBSERVICE_NOT_FOUND');
          }
        }

        updateData.selectedSubServices = parsedSelectedSubServices.map(selected => {
          const matchingSubService = service.subServices.find(
            sub => sub.name.toLowerCase().trim() === selected.name.toLowerCase().trim()
          );
          return {
            name: matchingSubService.name,
            items: matchingSubService.items || 1,
            rate: matchingSubService.rate,
            quantity: selected.quantity !== undefined ? parseInt(selected.quantity) : 1
          };
        });

        // Recalculate pricing based on new sub-services
        if (serviceRequest.request_type !== 'Quotation') {
          let subServicesTotal = 0;
          for (const subService of updateData.selectedSubServices) {
            subServicesTotal += subService.rate * subService.quantity;
          }
          updateData.unit_price = subServicesTotal;
          updateData.total_price = subServicesTotal * (updateData.number_of_units || serviceRequest.number_of_units);
        }
      } else {
        updateData.selectedSubServices = [];
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return sendError(res, 400, 'No valid fields provided to update', 'NO_UPDATE_FIELDS');
    }

    // Apply discount if total_price was recalculated and request is not Quotation
    if (updateData.total_price !== undefined && serviceRequest.request_type !== 'Quotation') {
      // Get service to check for discount (reuse if already fetched)
      if (!service) {
        service = await Service.findById(serviceRequest.service_id);
      }
      
      if (service) {
        // Check for active banner with discount for this service
        const activeBanner = await Banner.findOne({
          service: serviceRequest.service_id,
          isActive: true,
        }).lean();

        // Use service discount if available, otherwise use banner discount
        const discountPercentage = service.discount ?? activeBanner?.discountPercentage ?? null;

        // Apply discount to total price if discount exists
        if (discountPercentage && discountPercentage > 0) {
          const originalTotal = updateData.total_price;
          const discountAmount = (originalTotal * discountPercentage) / 100;
          updateData.total_price = originalTotal - discountAmount;
          // Round to 2 decimal places
          updateData.total_price = Math.round(updateData.total_price * 100) / 100;
          updateData.discountPercentage = discountPercentage;
          updateData.discountAmount = Math.round(discountAmount * 100) / 100;
        }
      }
    }

    // Update the service request
    const updatedRequest = await ServiceRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('service_id', 'name description basePrice unitType')
     .populate('category_id', 'name description');

    // Transform response
    const transformedRequest = {
      _id: updatedRequest._id,
      user_name: updatedRequest.user_name,
      user_phone: updatedRequest.user_phone,
      user_email: updatedRequest.user_email,
      address: updatedRequest.address,
      service_id: updatedRequest.service_id,
      service_name: updatedRequest.service_name,
      category_id: updatedRequest.category_id,
      category_name: updatedRequest.category_name,
      request_type: updatedRequest.request_type,
      requested_date: updatedRequest.requested_date.toISOString(),
      message: updatedRequest.message,
      status: updatedRequest.status,
      unit_type: updatedRequest.unit_type,
      unit_price: updatedRequest.unit_price,
      number_of_units: updatedRequest.number_of_units,
      total_price: updatedRequest.total_price,
      selectedSubServices: updatedRequest.selectedSubServices || [],
      paymentMethod: updatedRequest.paymentMethod,
      paymentStatus: updatedRequest.paymentStatus,
      paymentDetails: updatedRequest.paymentDetails || {},
      createdAt: updatedRequest.createdAt.toISOString(),
      updatedAt: updatedRequest.updatedAt.toISOString()
    };

    // Add discount information if discount was applied
    if (updatedRequest.discountPercentage && updatedRequest.discountPercentage > 0) {
      transformedRequest.discountPercentage = updatedRequest.discountPercentage;
      transformedRequest.discountAmount = updatedRequest.discountAmount;
    }

    const response = {
      success: true,
      exception: null,
      description: 'Service request updated successfully',
      content: {
        serviceRequest: transformedRequest
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel service request by user (only when status is Pending)
// @route   PUT /api/service-requests/:id/cancel
// @access  Private (User only - verified via JWT token)
const userCancelServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid request ID', 'INVALID_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Verify ownership via JWT token - match user's email or phone from token
    const User = require('../models/User');
    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return sendError(res, 401, 'User not found', 'USER_NOT_FOUND');
    }

    // Check if the service request belongs to the authenticated user
    const emailMatch = currentUser.email && serviceRequest.user_email.toLowerCase() === currentUser.email.toLowerCase();
    const phoneMatch = currentUser.phoneNumber && serviceRequest.user_phone === currentUser.phoneNumber;

    if (!emailMatch && !phoneMatch) {
      return sendError(res, 403, 'You are not authorized to cancel this service request', 'UNAUTHORIZED_ACCESS');
    }

    // Check if status is Pending - only allow cancel when Pending
    if (serviceRequest.status !== 'Pending') {
      return sendError(
        res,
        400,
        `Cannot cancel service request. Current status is "${serviceRequest.status}". Only requests with "Pending" status can be cancelled.`,
        'REQUEST_NOT_CANCELLABLE'
      );
    }

    // Update status to Cancelled
    const updatedRequest = await ServiceRequest.findByIdAndUpdate(
      id,
      { status: 'Cancelled' },
      { new: true, runValidators: true }
    ).populate('service_id', 'name description')
     .populate('category_id', 'name description');

    // Transform response
    const transformedRequest = {
      _id: updatedRequest._id,
      user_name: updatedRequest.user_name,
      user_phone: updatedRequest.user_phone,
      user_email: updatedRequest.user_email,
      address: updatedRequest.address,
      service_id: updatedRequest.service_id,
      service_name: updatedRequest.service_name,
      category_id: updatedRequest.category_id,
      category_name: updatedRequest.category_name,
      request_type: updatedRequest.request_type,
      requested_date: updatedRequest.requested_date.toISOString(),
      message: updatedRequest.message,
      status: updatedRequest.status,
      vendor: updatedRequest.vendor,
      unit_type: updatedRequest.unit_type,
      unit_price: updatedRequest.unit_price,
      number_of_units: updatedRequest.number_of_units,
      total_price: updatedRequest.total_price,
      selectedSubServices: updatedRequest.selectedSubServices || [],
      paymentMethod: updatedRequest.paymentMethod,
      paymentStatus: updatedRequest.paymentStatus,
      paymentDetails: updatedRequest.paymentDetails || {},
      createdAt: updatedRequest.createdAt.toISOString(),
      updatedAt: updatedRequest.updatedAt.toISOString()
    };

    const response = {
      success: true,
      exception: null,
      description: 'Service request cancelled successfully',
      content: {
        serviceRequest: transformedRequest
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service request by user (only when status is Pending)
// @route   DELETE /api/service-requests/:id/request-delete
// @access  Private (User only - verified via JWT token)
const userDeleteServiceRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid request ID', 'INVALID_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Verify ownership via JWT token - match user's email or phone from token
    const User = require('../models/User');
    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return sendError(res, 401, 'User not found', 'USER_NOT_FOUND');
    }

    // Check if the service request belongs to the authenticated user
    const emailMatch = currentUser.email && serviceRequest.user_email.toLowerCase() === currentUser.email.toLowerCase();
    const phoneMatch = currentUser.phoneNumber && serviceRequest.user_phone === currentUser.phoneNumber;

    if (!emailMatch && !phoneMatch) {
      return sendError(res, 403, 'You are not authorized to delete this service request', 'UNAUTHORIZED_ACCESS');
    }

    // Check if status is Pending - only allow delete when Pending
    if (serviceRequest.status !== 'Pending') {
      return sendError(
        res,
        400,
        `Cannot delete service request. Current status is "${serviceRequest.status}". Only requests with "Pending" status can be deleted.`,
        'REQUEST_NOT_DELETABLE'
      );
    }

    // Delete the service request
    await ServiceRequest.findByIdAndDelete(id);

    const response = {
      success: true,
      exception: null,
      description: 'Service request deleted successfully',
      content: {
        deletedRequest: {
          _id: serviceRequest._id,
          user_name: serviceRequest.user_name,
          user_email: serviceRequest.user_email,
          service_name: serviceRequest.service_name,
          status: serviceRequest.status
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update quotation price (Admin only)
 * @route   PUT /api/admin/service-requests/:id/quote
 * @access  Admin only
 */
const updateQuotationPrice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { total_price, unit_price, status, admin_notes } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid service request ID format', 'INVALID_ID_FORMAT');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Validate it's a quotation type
    if (serviceRequest.request_type !== 'Quotation') {
      return sendError(
        res,
        400,
        'This endpoint is only for Quotation type requests',
        'NOT_QUOTATION_TYPE'
      );
    }

    // Validate price
    if (total_price === undefined || total_price === null || total_price <= 0) {
      return sendError(res, 400, 'Total price must be greater than 0', 'INVALID_PRICE');
    }

    // Update quotation
    serviceRequest.total_price = Number(total_price);
    serviceRequest.unit_price = unit_price ? Number(unit_price) : Number(total_price);

    // Update status if provided (e.g., from "Pending" to "Quoted")
    if (status && ['Pending', 'Quoted', 'Assigned', 'Accepted', 'InProgress', 'Completed', 'Cancelled'].includes(status)) {
      serviceRequest.status = status;
    } else if (!status) {
      // Default to "Quoted" if no status provided
      serviceRequest.status = 'Quoted';
    }

    // Add admin notes if provided
    if (admin_notes) {
      if (!serviceRequest.message) {
        serviceRequest.message = `[Admin Notes] ${admin_notes}`;
      } else {
        serviceRequest.message = `${serviceRequest.message}\n\n[Admin Notes] ${admin_notes}`;
      }
    }

    await serviceRequest.save();

    // TODO: Send notification to user (email/SMS)
    // Example: notificationService.sendQuotationReady(serviceRequest);

    const response = {
      success: true,
      exception: null,
      description: 'Quotation price updated successfully',
      content: {
        serviceRequest: {
          _id: serviceRequest._id,
          user_name: serviceRequest.user_name,
          user_email: serviceRequest.user_email,
          user_phone: serviceRequest.user_phone,
          service_name: serviceRequest.service_name,
          request_type: serviceRequest.request_type,
          total_price: serviceRequest.total_price,
          unit_price: serviceRequest.unit_price,
          paymentMethod: serviceRequest.paymentMethod,
          paymentStatus: serviceRequest.paymentStatus,
          status: serviceRequest.status,
          message: serviceRequest.message,
          requested_date: serviceRequest.requested_date.toISOString()
        }
      }
    };

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitServiceRequest,
  adminSubmitServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus,
  assignRequest,
  deleteServiceRequest,
  bulkDeleteServiceRequests,
  getOrderDetails,
  userUpdateServiceRequest,
  userCancelServiceRequest,
  userDeleteServiceRequest,
  updateQuotationPrice
};