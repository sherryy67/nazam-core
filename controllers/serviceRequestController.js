const ServiceRequest = require('../models/ServiceRequest');
const Service = require('../models/Service');
const Category = require('../models/Category');
const mongoose = require('mongoose');
const { sendSuccess, sendError, sendCreated } = require('../utils/response');

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
      selectedSubServices
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
      paymentMethod: paymentMethod
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

    // Add pricing fields only for non-Quotation requests or if available
    if (request_type !== 'Quotation') {
      serviceRequestData.unit_type = unitType;
      serviceRequestData.unit_price = unitPrice;
      serviceRequestData.total_price = totalPrice;
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

    // Create the service request
    const serviceRequest = await ServiceRequest.create(serviceRequestData);

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
      paymentMethod: serviceRequest.paymentMethod,
      createdAt: serviceRequest.createdAt.toISOString(),
      updatedAt: serviceRequest.updatedAt.toISOString()
    };

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

    // Validate vendor exists (you might want to add vendor validation here)
    // const vendor = await Vendor.findById(vendorId);
    // if (!vendor) {
    //   return sendError(res, 404, 'Vendor not found', 'VENDOR_NOT_FOUND');
    // }

    // Update service request with vendor assignment
    const updatedRequest = await ServiceRequest.findByIdAndUpdate(
      requestId,
      { 
        vendor: vendorId,
        status: 'Assigned'
      },
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

module.exports = {
  submitServiceRequest,
  getServiceRequests,
  updateServiceRequestStatus,
  assignRequest,
  deleteServiceRequest,
  getOrderDetails
};