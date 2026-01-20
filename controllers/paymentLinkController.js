const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
const ccavenueService = require('../utils/ccavenueService');
const { generatePaymentToken } = require('../utils/tokenGenerator');
const { sendSuccess, sendError } = require('../utils/response');
const emailService = require('../utils/emailService');
const mongoose = require('mongoose');

/**
 * @desc    Generate payment link for a service request (Admin only)
 * @route   POST /api/admin/payments/generate-link
 * @access  Admin
 */
const generatePaymentLink = async (req, res, next) => {
  try {
    const { serviceRequestId, expiryHours = 48 } = req.body;

    // Validate service request ID
    if (!serviceRequestId || !mongoose.Types.ObjectId.isValid(serviceRequestId)) {
      return sendError(res, 400, 'Invalid service request ID', 'INVALID_SERVICE_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Validate payment method
    if (serviceRequest.paymentMethod !== 'Online Payment') {
      return sendError(res, 400, 'Service request does not have online payment method', 'INVALID_PAYMENT_METHOD');
    }

    // Validate that total price exists
    if (!serviceRequest.total_price || serviceRequest.total_price <= 0) {
      return sendError(res, 400, 'Invalid total price for payment', 'INVALID_TOTAL_PRICE');
    }

    // Check if payment is already successful
    if (serviceRequest.paymentStatus === 'Success') {
      return sendError(res, 400, 'Payment already completed for this order', 'PAYMENT_ALREADY_COMPLETED');
    }

    // Try to find and link user account by email or phone
    if (!serviceRequest.user) {
      const user = await User.findOne({
        $or: [
          { email: serviceRequest.user_email },
          { phoneNumber: serviceRequest.user_phone }
        ]
      });

      if (user) {
        serviceRequest.user = user._id;
        await serviceRequest.save();
      }
    }

    // Generate unique secure token
    const token = generatePaymentToken();

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Get base URL for payment links
    const baseUrl = process.env.FRONTEND_URL || process.env.BACKEND_URL ||
      (req.protocol + '://' + req.get('host'));

    const paymentUrl = `${baseUrl}/pay/${token}`;

    // Update service request with payment link details
    serviceRequest.paymentLink = {
      token: token,
      url: paymentUrl,
      generatedBy: req.user?._id || req.admin?._id, // Admin ID from auth middleware
      generatedAt: new Date(),
      expiresAt: expiresAt,
      isExpired: false,
      isUsed: false
    };

    await serviceRequest.save();

    // Send payment link email to customer
    let emailSent = false;
    let emailError = null;
    if (serviceRequest.user_email) {
      try {
        await emailService.sendPaymentLinkEmail(
          serviceRequest.user_email,
          serviceRequest.user_name,
          serviceRequest,
          paymentUrl,
          expiresAt
        );
        emailSent = true;
      } catch (err) {
        console.error('Failed to send payment link email:', err.message);
        emailError = err.message;
      }
    }

    const response = {
      success: true,
      exception: null,
      description: 'Payment link generated successfully',
      content: {
        paymentLink: paymentUrl,
        token: token,
        serviceRequestId: serviceRequest._id.toString(),
        amount: serviceRequest.total_price,
        currency: 'AED',
        customerName: serviceRequest.user_name,
        customerEmail: serviceRequest.user_email,
        expiresAt: expiresAt,
        expiryHours: expiryHours,
        emailSent: emailSent,
        emailError: emailError
      }
    };

    res.status(200).json(response);
  } catch (error) {
    // Handle duplicate token error (very rare)
    if (error.code === 11000) {
      return sendError(res, 500, 'Failed to generate unique token, please retry', 'TOKEN_GENERATION_FAILED');
    }
    next(error);
  }
};

/**
 * @desc    Get payment link details and validate
 * @route   GET /api/payments/link/:token
 * @access  Public
 */
const getPaymentLinkDetails = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return sendError(res, 400, 'Payment token is required', 'MISSING_TOKEN');
    }

    // Find service request by payment link token
    const serviceRequest = await ServiceRequest.findOne({
      'paymentLink.token': token
    });

    if (!serviceRequest) {
      return sendError(res, 404, 'Invalid payment link', 'INVALID_PAYMENT_LINK');
    }

    // Check if link has expired
    const now = new Date();
    if (now > serviceRequest.paymentLink.expiresAt) {
      serviceRequest.paymentLink.isExpired = true;
      await serviceRequest.save();
      return sendError(res, 400, 'Payment link has expired', 'LINK_EXPIRED');
    }

    // Check if already paid
    if (serviceRequest.paymentStatus === 'Success') {
      return sendError(res, 400, 'This order has already been paid', 'ALREADY_PAID');
    }

    // Check if link was already used
    if (serviceRequest.paymentLink.isUsed) {
      return sendError(res, 400, 'This payment link has already been used', 'LINK_ALREADY_USED');
    }

    const response = {
      success: true,
      exception: null,
      description: 'Payment link is valid',
      content: {
        serviceRequestId: serviceRequest._id.toString(),
        serviceName: serviceRequest.service_name,
        categoryName: serviceRequest.category_name,
        amount: serviceRequest.total_price,
        currency: 'AED',
        customerName: serviceRequest.user_name,
        customerEmail: serviceRequest.user_email,
        customerPhone: serviceRequest.user_phone,
        requestType: serviceRequest.request_type,
        requestedDate: serviceRequest.requested_date,
        expiresAt: serviceRequest.paymentLink.expiresAt,
        isExpired: false,
        alreadyPaid: false
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initiate payment via payment link
 * @route   POST /api/payments/link/:token/initiate
 * @access  Public
 */
const initiatePaymentViaLink = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return sendError(res, 400, 'Payment token is required', 'MISSING_TOKEN');
    }

    // Find service request by payment link token
    const serviceRequest = await ServiceRequest.findOne({
      'paymentLink.token': token
    });

    if (!serviceRequest) {
      return sendError(res, 404, 'Invalid payment link', 'INVALID_PAYMENT_LINK');
    }

    // Check if link has expired
    const now = new Date();
    if (now > serviceRequest.paymentLink.expiresAt) {
      serviceRequest.paymentLink.isExpired = true;
      await serviceRequest.save();
      return sendError(res, 400, 'Payment link has expired', 'LINK_EXPIRED');
    }

    // Check if already paid
    if (serviceRequest.paymentStatus === 'Success') {
      return sendError(res, 400, 'Payment already completed for this order', 'PAYMENT_ALREADY_COMPLETED');
    }

    // Check if link was already used
    if (serviceRequest.paymentLink.isUsed) {
      return sendError(res, 400, 'This payment link has already been used', 'LINK_ALREADY_USED');
    }

    // Validate that total price exists
    if (!serviceRequest.total_price || serviceRequest.total_price <= 0) {
      return sendError(res, 400, 'Invalid total price for payment', 'INVALID_TOTAL_PRICE');
    }

    // Try to find and link user account by email or phone (if not already linked)
    if (!serviceRequest.user) {
      const user = await User.findOne({
        $or: [
          { email: serviceRequest.user_email },
          { phoneNumber: serviceRequest.user_phone }
        ]
      });

      if (user) {
        serviceRequest.user = user._id;
        // Will be saved later with payment details
      }
    }

    // Generate unique order ID (using service request ID)
    const orderId = serviceRequest._id.toString();

    // Get backend URL for payment callbacks
    const backendUrl = process.env.BACKEND_URL ||
      (req.protocol + '://' + req.get('host'));

    // Get frontend URL for user redirects
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Prepare payment data
    const paymentData = {
      orderId: orderId,
      amount: serviceRequest.total_price,
      currency: 'AED',
      redirectUrl: `${backendUrl}/api/payments/callback`,
      cancelUrl: `${backendUrl}/api/payments/cancel?orderId=${orderId}`,
      customerName: serviceRequest.user_name,
      customerEmail: serviceRequest.user_email,
      customerPhone: serviceRequest.user_phone,
      billingAddress: serviceRequest.address || '',
      billingCity: '',
      billingState: '',
      billingZip: '',
      billingCountry: 'AE'
    };

    // Generate encrypted payment form data
    const paymentFormData = ccavenueService.generatePaymentData(paymentData);

    // Validate that encrypted data exists
    if (!paymentFormData.encRequest || paymentFormData.encRequest.length === 0) {
      return sendError(res, 500, 'Failed to generate encrypted payment data', 'ENCRYPTION_FAILED');
    }

    // Update service request with payment initiation
    serviceRequest.paymentStatus = 'Pending';
    serviceRequest.paymentDetails = {
      orderId: orderId,
      amount: serviceRequest.total_price,
      currency: 'AED'
    };

    // Mark link as used (optional - you can remove this if you want to allow multiple payment attempts)
    // serviceRequest.paymentLink.isUsed = true;

    await serviceRequest.save();

    // Return payment form data and URL
    const response = {
      success: true,
      exception: null,
      description: 'Payment initiated successfully via link',
      content: {
        paymentUrl: ccavenueService.paymentUrl,
        paymentFormData: paymentFormData,
        orderId: orderId,
        amount: serviceRequest.total_price,
        currency: 'AED'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Invalidate/expire a payment link (Admin only)
 * @route   POST /api/admin/payments/invalidate-link
 * @access  Admin
 */
const invalidatePaymentLink = async (req, res, next) => {
  try {
    const { serviceRequestId } = req.body;

    // Validate service request ID
    if (!serviceRequestId || !mongoose.Types.ObjectId.isValid(serviceRequestId)) {
      return sendError(res, 400, 'Invalid service request ID', 'INVALID_SERVICE_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Check if payment link exists
    if (!serviceRequest.paymentLink || !serviceRequest.paymentLink.token) {
      return sendError(res, 400, 'No payment link found for this service request', 'NO_PAYMENT_LINK');
    }

    // Invalidate the link
    serviceRequest.paymentLink.isExpired = true;
    await serviceRequest.save();

    const response = {
      success: true,
      exception: null,
      description: 'Payment link invalidated successfully',
      content: {
        serviceRequestId: serviceRequest._id.toString()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Regenerate payment link for a service request (Admin only)
 * @route   POST /api/admin/payments/regenerate-link
 * @access  Admin
 */
const regeneratePaymentLink = async (req, res, next) => {
  try {
    const { serviceRequestId, expiryHours = 48 } = req.body;

    // Validate service request ID
    if (!serviceRequestId || !mongoose.Types.ObjectId.isValid(serviceRequestId)) {
      return sendError(res, 400, 'Invalid service request ID', 'INVALID_SERVICE_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Validate payment method
    if (serviceRequest.paymentMethod !== 'Online Payment') {
      return sendError(res, 400, 'Service request does not have online payment method', 'INVALID_PAYMENT_METHOD');
    }

    // Check if payment is already successful
    if (serviceRequest.paymentStatus === 'Success') {
      return sendError(res, 400, 'Payment already completed for this order', 'PAYMENT_ALREADY_COMPLETED');
    }

    // Generate new unique secure token
    const token = generatePaymentToken();

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    // Get base URL for payment links
    const baseUrl = process.env.FRONTEND_URL || process.env.BACKEND_URL ||
      (req.protocol + '://' + req.get('host'));

    const paymentUrl = `${baseUrl}/pay/${token}`;

    // Invalidate old link if exists
    if (serviceRequest.paymentLink && serviceRequest.paymentLink.token) {
      serviceRequest.paymentLink.isExpired = true;
    }

    // Update service request with new payment link details
    serviceRequest.paymentLink = {
      token: token,
      url: paymentUrl,
      generatedBy: req.user?._id || req.admin?._id,
      generatedAt: new Date(),
      expiresAt: expiresAt,
      isExpired: false,
      isUsed: false
    };

    await serviceRequest.save();

    // Send payment link email to customer
    let emailSent = false;
    let emailError = null;
    if (serviceRequest.user_email) {
      try {
        await emailService.sendPaymentLinkEmail(
          serviceRequest.user_email,
          serviceRequest.user_name,
          serviceRequest,
          paymentUrl,
          expiresAt
        );
        emailSent = true;
      } catch (err) {
        console.error('Failed to send payment link email:', err.message);
        emailError = err.message;
      }
    }

    const response = {
      success: true,
      exception: null,
      description: 'Payment link regenerated successfully',
      content: {
        paymentLink: paymentUrl,
        token: token,
        serviceRequestId: serviceRequest._id.toString(),
        amount: serviceRequest.total_price,
        currency: 'AED',
        customerName: serviceRequest.user_name,
        customerEmail: serviceRequest.user_email,
        expiresAt: expiresAt,
        expiryHours: expiryHours,
        emailSent: emailSent,
        emailError: emailError
      }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 500, 'Failed to generate unique token, please retry', 'TOKEN_GENERATION_FAILED');
    }
    next(error);
  }
};

/**
 * @desc    Get payment link status for admin (Admin only)
 * @route   GET /api/admin/payments/link-status/:serviceRequestId
 * @access  Admin
 */
const getPaymentLinkStatus = async (req, res, next) => {
  try {
    const { serviceRequestId } = req.params;

    // Validate service request ID
    if (!serviceRequestId || !mongoose.Types.ObjectId.isValid(serviceRequestId)) {
      return sendError(res, 400, 'Invalid service request ID', 'INVALID_SERVICE_REQUEST_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Check if payment link exists
    if (!serviceRequest.paymentLink || !serviceRequest.paymentLink.token) {
      return sendError(res, 404, 'No payment link found for this service request', 'NO_PAYMENT_LINK');
    }

    const now = new Date();
    const isExpired = now > serviceRequest.paymentLink.expiresAt || serviceRequest.paymentLink.isExpired;

    const response = {
      success: true,
      exception: null,
      description: 'Payment link status retrieved successfully',
      content: {
        serviceRequestId: serviceRequest._id.toString(),
        paymentLink: serviceRequest.paymentLink.url,
        token: serviceRequest.paymentLink.token,
        generatedAt: serviceRequest.paymentLink.generatedAt,
        expiresAt: serviceRequest.paymentLink.expiresAt,
        isExpired: isExpired,
        isUsed: serviceRequest.paymentLink.isUsed,
        paymentStatus: serviceRequest.paymentStatus,
        amount: serviceRequest.total_price,
        currency: 'AED',
        customerName: serviceRequest.user_name,
        customerEmail: serviceRequest.user_email
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generatePaymentLink,
  getPaymentLinkDetails,
  initiatePaymentViaLink,
  invalidatePaymentLink,
  regeneratePaymentLink,
  getPaymentLinkStatus
};
