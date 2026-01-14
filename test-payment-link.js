/**
 * Test Script for Payment Link Generation and Payment Flow
 *
 * This script demonstrates:
 * 1. Admin generates a payment link for a service request
 * 2. User accesses the payment link
 * 3. User initiates payment via the link
 *
 * Prerequisites:
 * - Server must be running
 * - A service request with "Online Payment" method must exist
 * - Admin authentication token must be available
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test data - UPDATE THESE VALUES
const ADMIN_TOKEN = 'YOUR_ADMIN_JWT_TOKEN'; // Get from login
const SERVICE_REQUEST_ID = 'YOUR_SERVICE_REQUEST_ID'; // Use existing service request ID

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  step: (msg) => console.log(`\n${colors.yellow}▶ ${msg}${colors.reset}`),
  data: (label, data) => console.log(`${colors.gray}  ${label}:${colors.reset}`, data)
};

// Step 1: Admin generates payment link
async function generatePaymentLink() {
  log.step('STEP 1: Admin generates payment link');

  try {
    const response = await axios.post(
      `${API_URL}/admin/payments/generate-link`,
      {
        serviceRequestId: SERVICE_REQUEST_ID,
        expiryHours: 48
      },
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      log.success('Payment link generated successfully');
      log.data('Payment Link', response.data.content.paymentLink);
      log.data('Token', response.data.content.token);
      log.data('Amount', `AED ${response.data.content.amount}`);
      log.data('Customer', response.data.content.customerName);
      log.data('Expires At', response.data.content.expiresAt);

      return response.data.content.token;
    } else {
      log.error('Failed to generate payment link');
      log.data('Error', response.data.description);
      return null;
    }
  } catch (error) {
    log.error('Error generating payment link');
    if (error.response) {
      log.data('Status', error.response.status);
      log.data('Error', error.response.data.description || error.response.data);
    } else {
      log.data('Error', error.message);
    }
    return null;
  }
}

// Step 2: User accesses payment link (validates token)
async function validatePaymentLink(token) {
  log.step('STEP 2: User accesses payment link (validates token)');

  try {
    const response = await axios.get(
      `${API_URL}/payments/link/${token}`
    );

    if (response.data.success) {
      log.success('Payment link is valid');
      log.data('Service', response.data.content.serviceName);
      log.data('Category', response.data.content.categoryName);
      log.data('Amount', `AED ${response.data.content.amount}`);
      log.data('Customer', response.data.content.customerName);
      log.data('Email', response.data.content.customerEmail);
      log.data('Phone', response.data.content.customerPhone);
      log.data('Expires At', response.data.content.expiresAt);

      return true;
    } else {
      log.error('Payment link validation failed');
      log.data('Error', response.data.description);
      return false;
    }
  } catch (error) {
    log.error('Error validating payment link');
    if (error.response) {
      log.data('Status', error.response.status);
      log.data('Error', error.response.data.description || error.response.data);
    } else {
      log.data('Error', error.message);
    }
    return false;
  }
}

// Step 3: User initiates payment via link
async function initiatePaymentViaLink(token) {
  log.step('STEP 3: User initiates payment via link');

  try {
    const response = await axios.post(
      `${API_URL}/payments/link/${token}/initiate`
    );

    if (response.data.success) {
      log.success('Payment initiated successfully');
      log.data('Payment URL', response.data.content.paymentUrl);
      log.data('Order ID', response.data.content.orderId);
      log.data('Amount', `AED ${response.data.content.amount}`);
      log.info('Next step: Submit form to CCAvenue with encRequest and access_code');
      log.data('Encrypted Request Length', response.data.content.paymentFormData.encRequest.length);
      log.data('Access Code', response.data.content.paymentFormData.access_code);

      return true;
    } else {
      log.error('Payment initiation failed');
      log.data('Error', response.data.description);
      return false;
    }
  } catch (error) {
    log.error('Error initiating payment');
    if (error.response) {
      log.data('Status', error.response.status);
      log.data('Error', error.response.data.description || error.response.data);
    } else {
      log.data('Error', error.message);
    }
    return false;
  }
}

// Step 4: Check payment status
async function checkPaymentStatus(serviceRequestId) {
  log.step('STEP 4: Check payment status');

  try {
    const response = await axios.get(
      `${API_URL}/payments/status/${serviceRequestId}`
    );

    if (response.data.success) {
      log.success('Payment status retrieved');
      log.data('Payment Status', response.data.content.paymentStatus);
      log.data('Payment Method', response.data.content.paymentMethod);
      log.data('Total Price', `AED ${response.data.content.totalPrice}`);

      if (response.data.content.paymentDetails && response.data.content.paymentDetails.transactionId) {
        log.data('Transaction ID', response.data.content.paymentDetails.transactionId);
        log.data('Payment Date', response.data.content.paymentDetails.paymentDate);
      }

      return true;
    } else {
      log.error('Failed to get payment status');
      log.data('Error', response.data.description);
      return false;
    }
  } catch (error) {
    log.error('Error checking payment status');
    if (error.response) {
      log.data('Status', error.response.status);
      log.data('Error', error.response.data.description || error.response.data);
    } else {
      log.data('Error', error.message);
    }
    return false;
  }
}

// Main test flow
async function runTest() {
  console.log('\n' + '='.repeat(70));
  console.log('  PAYMENT LINK GENERATION & PAYMENT FLOW TEST');
  console.log('='.repeat(70));

  log.info('Base URL: ' + BASE_URL);
  log.info('Service Request ID: ' + SERVICE_REQUEST_ID);

  if (!ADMIN_TOKEN || ADMIN_TOKEN === 'YOUR_ADMIN_JWT_TOKEN') {
    log.error('Please update ADMIN_TOKEN in the script');
    return;
  }

  if (!SERVICE_REQUEST_ID || SERVICE_REQUEST_ID === 'YOUR_SERVICE_REQUEST_ID') {
    log.error('Please update SERVICE_REQUEST_ID in the script');
    return;
  }

  // Step 1: Generate payment link
  const token = await generatePaymentLink();
  if (!token) {
    log.error('Test failed at Step 1');
    return;
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Validate payment link
  const isValid = await validatePaymentLink(token);
  if (!isValid) {
    log.error('Test failed at Step 2');
    return;
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 3: Initiate payment
  const initiated = await initiatePaymentViaLink(token);
  if (!initiated) {
    log.error('Test failed at Step 3');
    return;
  }

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 4: Check payment status
  await checkPaymentStatus(SERVICE_REQUEST_ID);

  console.log('\n' + '='.repeat(70));
  log.success('Test completed successfully!');
  log.info('Next steps:');
  log.info('1. User would now see CCAvenue payment gateway');
  log.info('2. After payment, CCAvenue calls the callback endpoint');
  log.info('3. User is redirected to success/failure page');
  console.log('='.repeat(70) + '\n');
}

// Run the test
runTest().catch(error => {
  log.error('Unexpected error in test');
  console.error(error);
});
