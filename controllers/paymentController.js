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
    const { serviceRequestId, milestoneId } = req.body;

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

    // Determine payment type (full or milestone)
    let paymentAmount;
    let orderIdSuffix = '';
    let milestone = null;

    if (serviceRequest.paymentType === 'milestone' && milestoneId) {
      // Milestone payment
      milestone = serviceRequest.milestones.id(milestoneId);

      if (!milestone) {
        return sendError(res, 404, 'Milestone not found', 'MILESTONE_NOT_FOUND');
      }

      // Check if milestone is already paid
      if (milestone.paymentStatus === 'Success') {
        return sendError(res, 400, 'Milestone already paid', 'MILESTONE_ALREADY_PAID');
      }

      // Check if sequential payment is required
      if (serviceRequest.requireSequentialPayment) {
        const previousMilestones = serviceRequest.milestones.filter(m => m.order < milestone.order);
        const unpaidPrevious = previousMilestones.find(m => m.paymentStatus !== 'Success');

        if (unpaidPrevious) {
          return sendError(
            res,
            400,
            `Previous milestone "${unpaidPrevious.name}" must be paid first`,
            'PREVIOUS_MILESTONE_UNPAID'
          );
        }
      }

      paymentAmount = milestone.amount;
      orderIdSuffix = `-M${milestone.order}`;
    } else {
      // Full payment
      if (!serviceRequest.total_price || serviceRequest.total_price <= 0) {
        return sendError(res, 400, 'Invalid total price for payment', 'INVALID_TOTAL_PRICE');
      }

      // Check if payment is already successful
      if (serviceRequest.paymentStatus === 'Success') {
        return sendError(res, 400, 'Payment already completed for this order', 'PAYMENT_ALREADY_COMPLETED');
      }

      paymentAmount = serviceRequest.total_price;
    }

    // Generate unique order ID
    const orderId = serviceRequest._id.toString() + orderIdSuffix;

    // Get backend URL for payment callbacks (CCAvenue will call our backend)
    // Use BACKEND_URL env var if set, otherwise construct from request
    const backendUrl = process.env.BACKEND_URL || 
      (req.protocol + '://' + req.get('host'));
    
    // Get frontend URL for user redirects
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Prepare payment data
    // Both redirect_url and cancel_url go to backend first, then backend redirects to frontend
    // This ensures payment status is updated before user sees the result page
    const paymentData = {
      orderId: orderId,
      amount: paymentAmount,
      currency: 'AED',
      redirectUrl: `${backendUrl}/api/payments/callback`,
      cancelUrl: `${backendUrl}/api/payments/cancel?orderId=${orderId}`,
      customerName: serviceRequest.user_name,
      customerEmail: serviceRequest.user_email,
      customerPhone: serviceRequest.user_phone,
      billingAddress: serviceRequest.address,
      billingCity: '', // Extract from address if needed
      billingState: '',
      billingZip: '',
      billingCountry: 'AE',
      // Add milestone info as merchant params for tracking
      merchant_param1: serviceRequest._id.toString(),
      merchant_param2: milestoneId || 'full',
      merchant_param3: milestone ? milestone.order.toString() : '0'
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
    if (milestone) {
      // Update milestone payment status
      milestone.paymentStatus = 'Pending';
      milestone.paymentDetails = {
        orderId: orderId,
        amount: paymentAmount,
        currency: 'AED'
      };
      // Mark milestone payment link as used if it exists
      if (milestone.paymentLink && milestone.paymentLink.token) {
        milestone.paymentLink.isUsed = true;
      }
    } else {
      // Update full payment status
      serviceRequest.paymentStatus = 'Pending';
      serviceRequest.paymentDetails = {
        orderId: orderId,
        amount: paymentAmount,
        currency: 'AED'
      };
    }
    await serviceRequest.save();

    // Validate that encrypted data exists
    if (!paymentFormData.encRequest || paymentFormData.encRequest.length === 0) {
      return sendError(res, 500, 'Failed to generate encrypted payment data', 'ENCRYPTION_FAILED');
    }

    // Return payment form data and URL
    const response = {
      success: true,
      exception: null,
      description: milestone
        ? `Payment initiated for milestone: ${milestone.name}`
        : 'Payment initiated successfully',
      content: {
        paymentUrl: ccavenueService.paymentUrl,
        paymentFormData: paymentFormData,
        orderId: orderId,
        amount: paymentAmount,
        currency: 'AED',
        paymentType: serviceRequest.paymentType,
        milestoneId: milestoneId || null,
        milestoneName: milestone ? milestone.name : null,
        milestoneOrder: milestone ? milestone.order : null
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

    // Get order ID and extract service request ID and milestone info
    const orderId = paymentResponse.order_id;
    const serviceRequestId = paymentResponse.merchant_param1;
    const milestoneIdOrType = paymentResponse.merchant_param2;
    const milestoneOrder = paymentResponse.merchant_param3;

    if (!orderId || !serviceRequestId) {
      return sendError(res, 400, 'Order ID or Service Request ID not found in payment response', 'ORDER_ID_NOT_FOUND');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(serviceRequestId);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Get payment status
    const paymentStatus = ccavenueService.getPaymentStatus(paymentResponse);

    // Determine if this is a milestone payment or full payment
    const isMilestonePayment = milestoneIdOrType && milestoneIdOrType !== 'full';
    let milestone = null;

    if (isMilestonePayment) {
      // Find milestone by ID or by order
      milestone = milestoneIdOrType && mongoose.Types.ObjectId.isValid(milestoneIdOrType)
        ? serviceRequest.milestones.id(milestoneIdOrType)
        : serviceRequest.milestones.find(m => m.order === parseInt(milestoneOrder));

      if (milestone) {
        // Update milestone payment details
        milestone.paymentStatus = paymentStatus;
        milestone.paymentDetails = {
          transactionId: paymentResponse.tracking_id || '',
          orderId: paymentResponse.order_id || orderId,
          amount: parseFloat(paymentResponse.amount || milestone.amount),
          currency: paymentResponse.currency || 'AED',
          paymentDate: paymentResponse.trans_date ? new Date(paymentResponse.trans_date) : new Date(),
          failureReason: paymentResponse.failure_message || paymentResponse.status_message || '',
          bankReferenceNumber: paymentResponse.bank_ref_no || ''
        };

        // If milestone payment is successful, start the milestone work
        if (paymentStatus === 'Success' && milestone.completionStatus === 'NotStarted') {
          milestone.completionStatus = 'InProgress';
        }

        // Update overall payment status based on all milestones
        const allMilestonesPaid = serviceRequest.milestones.every(m => m.paymentStatus === 'Success');
        serviceRequest.paymentStatus = allMilestonesPaid ? 'Success' : 'Pending';
      }
    } else {
      // Full payment - update service request payment details
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
    }

    await serviceRequest.save();

    // Redirect to frontend success/failure page
    const frontendUrl = process.env.FRONTEND_URL || 'https://zushh.com';

    // Build redirect URL with milestone info if applicable
    let redirectUrl;
    if (paymentStatus === 'Success') {
      redirectUrl = `${frontendUrl}/payment/success?orderId=${orderId}&serviceRequestId=${serviceRequestId}`;
      if (milestone) {
        redirectUrl += `&milestoneId=${milestone._id.toString()}&milestoneName=${encodeURIComponent(milestone.name)}`;
      }
    } else {
      redirectUrl = `${frontendUrl}/payment/failure?orderId=${orderId}&serviceRequestId=${serviceRequestId}&reason=${encodeURIComponent(paymentResponse.failure_message || paymentResponse.status_message || 'Payment failed')}`;
      if (milestone) {
        redirectUrl += `&milestoneId=${milestone._id.toString()}`;
      }
    }

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

