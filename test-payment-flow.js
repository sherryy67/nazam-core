/**
 * CCAvenue Payment Integration Test Script
 * 
 * This script helps test the payment flow programmatically.
 * Make sure to update SERVICE_ID and CATEGORY_ID with actual values from your database.
 * 
 * Usage: node test-payment-flow.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const SERVICE_ID = 'YOUR_SERVICE_ID_HERE'; // Replace with actual service ID
const CATEGORY_ID = 'YOUR_CATEGORY_ID_HERE'; // Replace with actual category ID

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testPaymentFlow() {
  try {
    log('\n=== CCAvenue Payment Integration Test ===\n', 'cyan');

    // Step 1: Create Service Request
    log('Step 1: Creating service request with Online Payment...', 'blue');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const serviceRequestData = {
      user_name: "Test User",
      user_phone: "+971501234567",
      user_email: "test@example.com",
      address: "123 Test Street, Dubai, UAE",
      service_id: SERVICE_ID,
      service_name: "Test Service",
      category_id: CATEGORY_ID,
      category_name: "Test Category",
      request_type: "OnTime",
      requested_date: tomorrow.toISOString(),
      number_of_units: 1,
      payment_method: "Online Payment"
    };

    if (SERVICE_ID === 'YOUR_SERVICE_ID_HERE' || CATEGORY_ID === 'YOUR_CATEGORY_ID_HERE') {
      log('ERROR: Please update SERVICE_ID and CATEGORY_ID in the script!', 'red');
      log('You can find these IDs from your database or by calling GET /api/services and GET /api/categories', 'yellow');
      return;
    }

    const serviceRequestResponse = await axios.post(
      `${BASE_URL}/submit-service-requests`,
      serviceRequestData
    );

    if (!serviceRequestResponse.data.success) {
      log('Failed to create service request', 'red');
      console.error(serviceRequestResponse.data);
      return;
    }

    const serviceRequestId = serviceRequestResponse.data.content.serviceRequest._id;
    const totalPrice = serviceRequestResponse.data.content.serviceRequest.total_price;

    log(`✓ Service request created: ${serviceRequestId}`, 'green');
    log(`  Total Price: AED ${totalPrice}`, 'green');
    log(`  Payment Method: ${serviceRequestResponse.data.content.serviceRequest.paymentMethod}`, 'green');
    log(`  Payment Status: ${serviceRequestResponse.data.content.serviceRequest.paymentStatus}`, 'green');

    // Step 2: Initiate Payment
    log('\nStep 2: Initiating payment...', 'blue');
    const paymentResponse = await axios.post(
      `${BASE_URL}/payments/initiate`,
      { serviceRequestId }
    );

    if (!paymentResponse.data.success) {
      log('Failed to initiate payment', 'red');
      console.error(paymentResponse.data);
      return;
    }

    const paymentData = paymentResponse.data.content;
    log('✓ Payment initiated successfully', 'green');
    log(`  Order ID: ${paymentData.orderId}`, 'green');
    log(`  Amount: ${paymentData.currency} ${paymentData.amount}`, 'green');
    log(`  Payment URL: ${paymentData.paymentUrl}`, 'green');

    // Step 3: Display payment form instructions
    log('\nStep 3: Payment Form Data', 'blue');
    log('Copy the following data to test payment:', 'yellow');
    console.log('\n--- Payment Form Data ---');
    console.log('encRequest:', paymentData.paymentFormData.encRequest);
    console.log('access_code:', paymentData.paymentFormData.access_code);
    console.log('--- End Payment Form Data ---\n');

    // Generate HTML form
    const htmlForm = `
<!DOCTYPE html>
<html>
<head>
    <title>CCAvenue Payment Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
        }
        .info {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        button {
            background: #4CAF50;
            color: white;
            padding: 15px 30px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <h1>CCAvenue Payment Test</h1>
    <div class="info">
        <h3>Test Credentials:</h3>
        <p><strong>Card Number:</strong> 5123450000000008</p>
        <p><strong>Expiry Date:</strong> 01/39</p>
        <p><strong>CVV:</strong> 100</p>
    </div>
    <p>Click the button below to proceed to CCAvenue payment page:</p>
    <form id="paymentForm" method="POST" action="${paymentData.paymentUrl}">
        <input type="hidden" name="encRequest" value="${paymentData.paymentFormData.encRequest}">
        <input type="hidden" name="access_code" value="${paymentData.paymentFormData.access_code}">
        <button type="submit">Proceed to Payment</button>
    </form>
    <p><small>Order ID: ${paymentData.orderId}</small></p>
</body>
</html>
    `;

    // Save HTML form to file
    const fs = require('fs');
    fs.writeFileSync('payment-test.html', htmlForm);
    log('✓ Payment test HTML file created: payment-test.html', 'green');
    log('  Open this file in your browser to test the payment', 'yellow');

    // Step 4: Check initial payment status
    log('\nStep 4: Checking payment status...', 'blue');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

    const statusResponse = await axios.get(
      `${BASE_URL}/payments/status/${serviceRequestId}`
    );

    if (statusResponse.data.success) {
      const status = statusResponse.data.content;
      log(`✓ Payment Status: ${status.paymentStatus}`, 'green');
      log(`  Payment Method: ${status.paymentMethod}`, 'green');
    }

    // Summary
    log('\n=== Test Summary ===', 'cyan');
    log(`Service Request ID: ${serviceRequestId}`, 'yellow');
    log(`Payment Status URL: ${BASE_URL}/payments/status/${serviceRequestId}`, 'yellow');
    log('\nNext Steps:', 'blue');
    log('1. Open payment-test.html in your browser', 'yellow');
    log('2. Complete the payment on CCAvenue using test credentials', 'yellow');
    log('3. After payment, check status using the URL above', 'yellow');
    log('4. Or run: node test-payment-flow.js --check-status ' + serviceRequestId, 'yellow');

  } catch (error) {
    log('\n✗ Error occurred:', 'red');
    if (error.response) {
      console.error('Response:', error.response.data);
      console.error('Status:', error.response.status);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Check if we should only check status
if (process.argv[2] === '--check-status' && process.argv[3]) {
  const serviceRequestId = process.argv[3];
  log(`\nChecking payment status for: ${serviceRequestId}`, 'blue');
  
  axios.get(`${BASE_URL}/payments/status/${serviceRequestId}`)
    .then(response => {
      if (response.data.success) {
        const status = response.data.content;
        log(`\nPayment Status: ${status.paymentStatus}`, 'green');
        log(`Payment Method: ${status.paymentMethod}`, 'green');
        if (status.paymentDetails && status.paymentDetails.transactionId) {
          log(`Transaction ID: ${status.paymentDetails.transactionId}`, 'green');
          log(`Payment Date: ${status.paymentDetails.paymentDate}`, 'green');
        }
      }
    })
    .catch(error => {
      log('Error checking status:', 'red');
      console.error(error.response?.data || error.message);
    });
} else {
  testPaymentFlow();
}

