# CCAvenue Payment Integration Guide

This document explains how to integrate and use the CCAvenue payment gateway in the Nazam Core application.

## Overview

The CCAvenue payment integration allows customers to pay for service requests online using credit/debit cards. The integration includes:

- Payment initiation
- Encrypted payment form submission
- Payment callback handling
- Payment status tracking

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```env
# CCAvenue Payment Gateway Configuration
CCAVENUE_MERCHANT_ID=45990
CCAVENUE_ACCESS_CODE=AVYR05ML69BN93RYNB
CCAVENUE_WORKING_KEY=3975E51578741CE0758A7C8B148F642A
CCAVENUE_PAYMENT_URL=https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction

# Frontend URL (for payment redirects)
FRONTEND_URL=http://localhost:3000
```

**Note:** For production, update these values with your live credentials.

## API Endpoints

### 1. Initiate Payment

**Endpoint:** `POST /api/payments/initiate`

**Request Body:**
```json
{
  "serviceRequestId": "64a1b2c3d4e5f6789abcdef1"
}
```

**Response:**
```json
{
  "success": true,
  "description": "Payment initiated successfully",
  "content": {
    "paymentUrl": "https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction",
    "paymentFormData": {
      "encRequest": "encrypted_payment_data",
      "access_code": "AVYR05ML69BN93RYNB"
    },
    "orderId": "64a1b2c3d4e5f6789abcdef1",
    "amount": 150.00,
    "currency": "AED"
  }
}
```

### 2. Payment Callback

**Endpoint:** `POST /api/payments/callback` or `GET /api/payments/callback`

This endpoint is called by CCAvenue after payment processing. It automatically redirects users to the frontend success/failure page.

### 3. Payment Status

**Endpoint:** `GET /api/payments/status/:serviceRequestId`

**Response:**
```json
{
  "success": true,
  "description": "Payment status retrieved successfully",
  "content": {
    "serviceRequestId": "64a1b2c3d4e5f6789abcdef1",
    "paymentMethod": "Online Payment",
    "paymentStatus": "Success",
    "paymentDetails": {
      "transactionId": "1234567890",
      "orderId": "64a1b2c3d4e5f6789abcdef1",
      "amount": 150.00,
      "currency": "AED",
      "paymentDate": "2024-01-15T10:30:00.000Z",
      "bankReferenceNumber": "REF123456"
    },
    "totalPrice": 150.00
  }
}
```

## Frontend Integration

### Step 1: Create Service Request with Online Payment

When creating a service request, set `payment_method` to `"Online Payment"`:

```javascript
const response = await fetch('/api/submit-service-requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // ... other service request fields
    payment_method: 'Online Payment'
  })
});
```

### Step 2: Initiate Payment

After creating the service request, initiate the payment:

```javascript
const paymentResponse = await fetch('/api/payments/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serviceRequestId: serviceRequestId
  })
});

const paymentData = await paymentResponse.json();
```

### Step 3: Submit Payment Form to CCAvenue

Create and submit a form to CCAvenue:

```javascript
function submitPaymentToCCAvenue(paymentData) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentData.content.paymentUrl;

  // Add encrypted request
  const encRequestInput = document.createElement('input');
  encRequestInput.type = 'hidden';
  encRequestInput.name = 'encRequest';
  encRequestInput.value = paymentData.content.paymentFormData.encRequest;
  form.appendChild(encRequestInput);

  // Add access code
  const accessCodeInput = document.createElement('input');
  accessCodeInput.type = 'hidden';
  accessCodeInput.name = 'access_code';
  accessCodeInput.value = paymentData.content.paymentFormData.access_code;
  form.appendChild(accessCodeInput);

  // Submit form
  document.body.appendChild(form);
  form.submit();
}
```

### Step 4: Handle Payment Response

CCAvenue will redirect users back to your callback URL, which then redirects to your frontend:

- **Success:** `/payment/success?orderId=...`
- **Failure:** `/payment/failure?orderId=...&reason=...`
- **Cancelled:** `/payment/cancelled?orderId=...`

### Step 5: Check Payment Status

You can check the payment status at any time:

```javascript
const statusResponse = await fetch(`/api/payments/status/${serviceRequestId}`);
const statusData = await statusResponse.json();

console.log('Payment Status:', statusData.content.paymentStatus);
```

## Payment Status Values

- **Pending:** Payment initiated but not yet completed
- **Success:** Payment completed successfully
- **Failure:** Payment failed
- **Cancelled:** Payment was cancelled by user

## Testing

### Test Credentials

- **Card Number:** 5123450000000008
- **Expiry Date:** 01/39
- **CVV:** 100

### Test Flow

1. Create a service request with `payment_method: "Online Payment"`
2. Initiate payment using the service request ID
3. Submit the payment form to CCAvenue
4. On the CCAvenue test page, click "Submit" directly (no actual card needed)
5. You'll be redirected back to your application

## Service Request Model Updates

The `ServiceRequest` model now includes:

- `paymentStatus`: Payment status (Pending, Success, Failure, Cancelled)
- `paymentDetails`: Object containing:
  - `transactionId`: CCAvenue tracking ID
  - `orderId`: Order ID
  - `amount`: Payment amount
  - `currency`: Currency code
  - `paymentDate`: Payment date
  - `failureReason`: Failure reason (if failed)
  - `bankReferenceNumber`: Bank reference number

## Error Handling

Common error codes:

- `INVALID_SERVICE_REQUEST_ID`: Invalid service request ID format
- `SERVICE_REQUEST_NOT_FOUND`: Service request doesn't exist
- `INVALID_PAYMENT_METHOD`: Payment method is not "Online Payment"
- `INVALID_TOTAL_PRICE`: Total price is invalid or missing
- `PAYMENT_ALREADY_COMPLETED`: Payment already completed for this order
- `MISSING_PAYMENT_RESPONSE`: Payment response is missing from callback

## Security Notes

1. **Encryption:** All payment parameters are encrypted using AES-128-CBC before sending to CCAvenue
2. **HTTPS:** Always use HTTPS in production
3. **Environment Variables:** Never commit credentials to version control
4. **Validation:** Always validate payment responses before updating order status

## Support

For CCAvenue integration issues, refer to:
- CCAvenue Integration Kit: [Node.js Integration Kit](https://drive.google.com/file/d/1P6XnwVifUbG0TPxsWU7sQVHWIfCBx5YM/view?usp=share_link)
- CCAvenue Support: Contact CCAvenue support for production credentials

