# Testing CCAvenue Payment Integration

This guide will help you test the CCAvenue payment integration step by step.

## Prerequisites

1. **Environment Setup**
   - Ensure your `.env` file has the CCAvenue credentials:
   ```env
   CCAVENUE_MERCHANT_ID=45990
   CCAVENUE_ACCESS_CODE=AVYR05ML69BN93RYNB
   CCAVENUE_WORKING_KEY=3975E51578741CE0758A7C8B148F642A
   CCAVENUE_PAYMENT_URL=https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction
   FRONTEND_URL=http://localhost:3000
   ```

2. **Server Running**
   - Make sure your Node.js server is running (`npm run dev` or `npm start`)

## Test Credentials (Provided by CCAvenue)

- **Card Number:** `5123450000000008`
- **Expiry Date:** `01/39` (or any future date)
- **CVV:** `100`

## Testing Methods

### Method 1: Using Postman/API Client

#### Step 1: Create a Service Request with Online Payment

**Endpoint:** `POST http://localhost:3001/api/submit-service-requests`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "user_name": "Test User",
  "user_phone": "+971501234567",
  "user_email": "test@example.com",
  "address": "123 Test Street, Dubai, UAE",
  "service_id": "YOUR_SERVICE_ID",
  "service_name": "Test Service",
  "category_id": "YOUR_CATEGORY_ID",
  "category_name": "Test Category",
  "request_type": "OnTime",
  "requested_date": "2024-12-31T10:00:00.000Z",
  "number_of_units": 1,
  "payment_method": "Online Payment"
}
```

**Note:** Replace `YOUR_SERVICE_ID` and `YOUR_CATEGORY_ID` with actual IDs from your database.

**Expected Response:**
```json
{
  "success": true,
  "description": "Service request submitted successfully",
  "content": {
    "serviceRequest": {
      "_id": "65abc123...",
      "paymentMethod": "Online Payment",
      "paymentStatus": "Pending",
      "total_price": 150.00,
      ...
    }
  }
}
```

**Save the `_id` from the response - you'll need it for the next step.**

#### Step 2: Initiate Payment

**Endpoint:** `POST http://localhost:3001/api/payments/initiate`

**Body:**
```json
{
  "serviceRequestId": "65abc123..." // Use the _id from Step 1
}
```

**Expected Response:**
```json
{
  "success": true,
  "description": "Payment initiated successfully",
  "content": {
    "paymentUrl": "https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction",
    "paymentFormData": {
      "encRequest": "encrypted_string_here",
      "access_code": "AVYR05ML69BN93RYNB"
    },
    "orderId": "65abc123...",
    "amount": 150.00,
    "currency": "AED"
  }
}
```

#### Step 3: Test Payment Form Submission

You have two options:

**Option A: Using Browser (Recommended)**

1. Copy the `paymentUrl` and `paymentFormData` from Step 2
2. Create an HTML file with this content:

```html
<!DOCTYPE html>
<html>
<head>
    <title>CCAvenue Payment Test</title>
</head>
<body>
    <h1>Redirecting to CCAvenue...</h1>
    <form id="paymentForm" method="POST" action="https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction">
        <input type="hidden" name="encRequest" value="PASTE_encRequest_HERE">
        <input type="hidden" name="access_code" value="PASTE_access_code_HERE">
    </form>
    <script>
        document.getElementById('paymentForm').submit();
    </script>
</body>
</html>
```

3. Replace `PASTE_encRequest_HERE` and `PASTE_access_code_HERE` with values from Step 2
4. Open the HTML file in your browser
5. You'll be redirected to CCAvenue payment page
6. Use test credentials:
   - Card: `5123450000000008`
   - Expiry: `01/39`
   - CVV: `100`
7. Click "Make Payment"
8. On the ACS Emulator page, click "Submit" directly
9. You'll be redirected back to your callback URL

**Option B: Using cURL**

```bash
curl -X POST "https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction" \
  -d "encRequest=PASTE_encRequest_HERE" \
  -d "access_code=PASTE_access_code_HERE" \
  -L -o payment_response.html
```

Then open `payment_response.html` in your browser.

#### Step 4: Check Payment Status

**Endpoint:** `GET http://localhost:3001/api/payments/status/65abc123...`

Replace `65abc123...` with your service request ID.

**Expected Response (After Successful Payment):**
```json
{
  "success": true,
  "description": "Payment status retrieved successfully",
  "content": {
    "serviceRequestId": "65abc123...",
    "paymentMethod": "Online Payment",
    "paymentStatus": "Success",
    "paymentDetails": {
      "transactionId": "1234567890",
      "orderId": "65abc123...",
      "amount": 150.00,
      "currency": "AED",
      "paymentDate": "2024-01-15T10:30:00.000Z",
      "bankReferenceNumber": "REF123456"
    },
    "totalPrice": 150.00
  }
}
```

### Method 2: Using Node.js Test Script

Create a test script to automate the testing:

```javascript
// test-payment.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testPayment() {
  try {
    // Step 1: Create service request
    console.log('Step 1: Creating service request...');
    const serviceRequest = await axios.post(`${BASE_URL}/submit-service-requests`, {
      user_name: "Test User",
      user_phone: "+971501234567",
      user_email: "test@example.com",
      address: "123 Test Street, Dubai, UAE",
      service_id: "YOUR_SERVICE_ID", // Replace with actual ID
      service_name: "Test Service",
      category_id: "YOUR_CATEGORY_ID", // Replace with actual ID
      category_name: "Test Category",
      request_type: "OnTime",
      requested_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      number_of_units: 1,
      payment_method: "Online Payment"
    });

    const serviceRequestId = serviceRequest.data.content.serviceRequest._id;
    console.log('Service Request ID:', serviceRequestId);

    // Step 2: Initiate payment
    console.log('\nStep 2: Initiating payment...');
    const payment = await axios.post(`${BASE_URL}/payments/initiate`, {
      serviceRequestId: serviceRequestId
    });

    console.log('Payment URL:', payment.data.content.paymentUrl);
    console.log('Encrypted Request:', payment.data.content.paymentFormData.encRequest);
    console.log('\nCopy the encrypted request and use it in the HTML form or browser');

    // Step 3: Wait a bit, then check status
    console.log('\nStep 3: Waiting 5 seconds before checking status...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    const status = await axios.get(`${BASE_URL}/payments/status/${serviceRequestId}`);
    console.log('Payment Status:', status.data.content.paymentStatus);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testPayment();
```

Run it with:
```bash
node test-payment.js
```

### Method 3: Testing Payment Callback Directly

To test the callback handler without going through CCAvenue:

1. **Generate a test encrypted response** (you'll need to encrypt a test response)
2. **Call the callback endpoint:**

```bash
curl -X POST "http://localhost:3001/api/payments/callback" \
  -d "encResponse=TEST_ENCRYPTED_RESPONSE"
```

**Note:** For actual testing, you should go through the full CCAvenue flow to get a real encrypted response.

## Testing Different Scenarios

### 1. Successful Payment

1. Complete the payment flow with test credentials
2. Verify `paymentStatus` changes to `"Success"`
3. Verify `paymentDetails` are populated

### 2. Failed Payment

1. On CCAvenue test page, you can simulate failure (if available)
2. Verify `paymentStatus` changes to `"Failure"`
3. Verify `failureReason` is populated in `paymentDetails`

### 3. Cancelled Payment

1. Click cancel on CCAvenue payment page
2. Verify redirect to `/api/payments/cancel`
3. Verify `paymentStatus` changes to `"Cancelled"`

### 4. Payment Status Check

1. Before payment: Status should be `"Pending"`
2. After successful payment: Status should be `"Success"`
3. After failed payment: Status should be `"Failure"`

## Common Issues & Solutions

### Issue 1: "Invalid service request ID"
- **Solution:** Make sure you're using a valid MongoDB ObjectId

### Issue 2: "Payment method is not Online Payment"
- **Solution:** Ensure the service request was created with `payment_method: "Online Payment"`

### Issue 3: "Payment already completed"
- **Solution:** Create a new service request for testing

### Issue 4: Encryption/Decryption errors
- **Solution:** Verify your `CCAVENUE_WORKING_KEY` is correct in `.env`

### Issue 5: Callback not working
- **Solution:** 
  - Check that your server is accessible from the internet (for production)
  - For local testing, use a tool like ngrok to expose your local server
  - Verify the callback URL in your CCAvenue merchant panel

## Using ngrok for Local Testing

Since CCAvenue needs to call your callback URL, you may need to expose your local server:

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   # or download from https://ngrok.com/
   ```

2. **Start your server:**
   ```bash
   npm run dev
   ```

3. **Expose your server:**
   ```bash
   ngrok http 3001
   ```

4. **Update FRONTEND_URL in .env:**
   ```env
   FRONTEND_URL=https://your-ngrok-url.ngrok.io
   ```

5. **Update callback URLs** in payment initiation to use ngrok URL

## Verification Checklist

- [ ] Service request created with "Online Payment"
- [ ] Payment initiation returns encrypted data
- [ ] Payment form redirects to CCAvenue
- [ ] Test payment completes successfully
- [ ] Callback updates payment status
- [ ] Payment status endpoint returns correct status
- [ ] Payment details are saved correctly
- [ ] Redirect to frontend works (if frontend is set up)

## Next Steps

After successful testing:

1. Update environment variables with production credentials
2. Update `FRONTEND_URL` to your production frontend URL
3. Test with real payment cards (small amounts)
4. Monitor payment callbacks and logs
5. Set up error alerting for failed payments

