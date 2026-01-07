const ServiceRequest = require('../models/ServiceRequest');
const ccavenueService = require('../utils/ccavenueService');
const { sendSuccess, sendError } = require('../utils/response');
const mongoose = require('mongoose');

/**
 * @desc    Initiate CCAvenue payment for a service request
 * @route   POST /api/payments/initiate
 * @access  Public
 */
const initiatePayment = async (req, res, next) => {
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

    // Validate payment method
    if (serviceRequest.paymentMethod !== 'Online Payment') {
      return sendError(res, 400, 'Payment method is not Online Payment', 'INVALID_PAYMENT_METHOD');
    }

    // Validate that total price exists
    if (!serviceRequest.total_price || serviceRequest.total_price <= 0) {
      return sendError(res, 400, 'Invalid total price for payment', 'INVALID_TOTAL_PRICE');
    }

    // Check if payment is already successful
    if (serviceRequest.paymentStatus === 'Success') {
      return sendError(res, 400, 'Payment already completed for this order', 'PAYMENT_ALREADY_COMPLETED');
    }

    // Generate unique order ID (using service request ID)
    const orderId = serviceRequest._id.toString();

    // Get backend URL for payment callbacks (CCAvenue will call our backend)
    // Use BACKEND_URL env var if set, otherwise construct from request
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
      cancelUrl: `${frontendUrl}/payment/cancelled?orderId=${orderId}`,
      customerName: serviceRequest.user_name,
      customerEmail: serviceRequest.user_email,
      customerPhone: serviceRequest.user_phone,
      billingAddress: serviceRequest.address,
      billingCity: '', // Extract from address if needed
      billingState: '',
      billingZip: '',
      billingCountry: 'AE'
    };

    // Generate encrypted payment form data
    const paymentFormData = ccavenueService.generatePaymentData(paymentData);

    // Debug: Log payment form data (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Payment Form Data:', {
        encRequestLength: paymentFormData.encRequest?.length,
        access_code: paymentFormData.access_code,
        paymentUrl: ccavenueService.paymentUrl
      });
    }

    // Update service request with payment initiation
    serviceRequest.paymentStatus = 'Pending';
    serviceRequest.paymentDetails = {
      orderId: orderId,
      amount: serviceRequest.total_price,
      currency: 'AED'
    };
    await serviceRequest.save();

    // Validate that encrypted data exists
    if (!paymentFormData.encRequest || paymentFormData.encRequest.length === 0) {
      return sendError(res, 500, 'Failed to generate encrypted payment data', 'ENCRYPTION_FAILED');
    }

    // Return payment form data and URL
    const response = {
      success: true,
      exception: null,
      description: 'Payment initiated successfully',
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
 * @desc    Handle CCAvenue payment callback
 * @route   POST /api/payments/callback
 * @access  Public (called by CCAvenue)
 */
const handlePaymentCallback = async (req, res, next) => {
  try {
    // CCAvenue sends callback via POST with form data (application/x-www-form-urlencoded)
    // Check multiple possible locations and field names for encResponse
    const encResponse = req.body?.encResponse || 
                       req.body?.encResp || 
                       req.query?.encResponse || 
                       req.query?.encResp;

    // Debug: Log what we received
    if (process.env.NODE_ENV === 'development') {
      console.log('Payment callback received:', {
        method: req.method,
        contentType: req.headers['content-type'],
        body: req.body,
        query: req.query,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        encResponse: encResponse ? encResponse.substring(0, 50) + '...' : null
      });
    }

    if (!encResponse) {
      const errorDetails = {
        method: req.method,
        contentType: req.headers['content-type'],
        body: req.body,
        query: req.query,
        bodyType: typeof req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        rawBody: req.body ? JSON.stringify(req.body).substring(0, 200) : 'No body'
      };
      
      console.error('Missing encResponse. Request details:', errorDetails);
      
      // Return more detailed error for debugging
      return sendError(res, 400, `Missing payment response. Received: ${JSON.stringify(errorDetails)}`, 'MISSING_PAYMENT_RESPONSE');
    }

    // Parse and decrypt payment response
    const paymentResponse = ccavenueService.parsePaymentResponse(encResponse);

    // Get order ID from response
    const orderId = paymentResponse.order_id || paymentResponse.merchant_param1;
    
    if (!orderId) {
      return sendError(res, 400, 'Order ID not found in payment response', 'ORDER_ID_NOT_FOUND');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(orderId);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Get payment status
    const paymentStatus = ccavenueService.getPaymentStatus(paymentResponse);

    // Update service request with payment details
    serviceRequest.paymentStatus = paymentStatus;
    serviceRequest.paymentDetails = {
      transactionId: paymentResponse.tracking_id || '',
      orderId: paymentResponse.order_id || orderId,
      amount: parseFloat(paymentResponse.amount || serviceRequest.total_price),
      currency: paymentResponse.currency || 'AED',
      paymentDate: paymentResponse.trans_date ? new Date(paymentResponse.trans_date) : new Date(),
      failureReason: paymentResponse.failure_message || paymentResponse.status_message || '',
      bankReferenceNumber: paymentResponse.bank_ref_no || ''
    };

    // If payment is successful, you might want to update order status
    if (paymentStatus === 'Success') {
      // Optionally update service request status
      // serviceRequest.status = 'Pending'; // Keep as Pending until service is completed
    }

    await serviceRequest.save();

    // Redirect to frontend success/failure page
    const frontendUrl = process.env.FRONTEND_URL || 'https://zushh.com';
    const redirectUrl = paymentStatus === 'Success' 
      ? `${frontendUrl}/payment/success?orderId=${orderId}`
      : `${frontendUrl}/payment/failure?orderId=${orderId}&reason=${encodeURIComponent(paymentResponse.failure_message || paymentResponse.status_message || 'Payment failed')}`;

    // Return HTML redirect page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment ${paymentStatus === 'Success' ? 'Success' : 'Failed'}</title>
        <meta http-equiv="refresh" content="0;url=${redirectUrl}">
      </head>
      <body>
        <p>Redirecting...</p>
        <script>window.location.href = "${redirectUrl}";</script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Payment callback error:', error);
    next(error);
  }
};

/**
 * @desc    Handle payment cancellation
 * @route   GET /api/payments/cancel
 * @access  Public
 */
const handlePaymentCancel = async (req, res, next) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return sendError(res, 400, 'Order ID is required', 'MISSING_ORDER_ID');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(orderId);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Update payment status to cancelled
    serviceRequest.paymentStatus = 'Cancelled';
    await serviceRequest.save();

    // Redirect to frontend cancellation page
    const frontendUrl = process.env.FRONTEND_URL || 'https://zushh.com';
    const redirectUrl = `${frontendUrl}/payment/cancelled?orderId=${orderId}`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Cancelled</title>
        <meta http-equiv="refresh" content="0;url=${redirectUrl}">
      </head>
      <body>
        <p>Redirecting...</p>
        <script>window.location.href = "${redirectUrl}";</script>
      </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment status for a service request
 * @route   GET /api/payments/status/:serviceRequestId
 * @access  Public
 */
const getPaymentStatus = async (req, res, next) => {
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

    const response = {
      success: true,
      exception: null,
      description: 'Payment status retrieved successfully',
      content: {
        serviceRequestId: serviceRequest._id.toString(),
        paymentMethod: serviceRequest.paymentMethod,
        paymentStatus: serviceRequest.paymentStatus,
        paymentDetails: serviceRequest.paymentDetails || {},
        totalPrice: serviceRequest.total_price
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiatePayment,
  handlePaymentCallback,
  handlePaymentCancel,
  getPaymentStatus
};

