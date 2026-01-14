# Payment Link API Documentation

## Overview
This document describes the Payment Link feature that allows admins to generate secure payment links for service requests and send them to users. Users can click these links to directly complete payment without needing to log into the app.

---

## Table of Contents
1. [Features](#features)
2. [Use Cases](#use-cases)
3. [API Endpoints](#api-endpoints)
4. [Complete Flow](#complete-flow)
5. [Security](#security)
6. [Testing](#testing)

---

## Features

✅ **Admin Link Generation** - Admins can generate secure payment links for any service request
✅ **Token-based Security** - Each link has a unique 64-character cryptographic token
✅ **Expiration Control** - Links expire after configurable hours (default: 48 hours)
✅ **Link Validation** - Validates token, expiry, and payment status before allowing payment
✅ **Single Order Payment** - One link per service request (not milestone-based)
✅ **No Authentication Required** - Users don't need to log in to pay via link
✅ **CCAvenue Integration** - Seamlessly integrates with existing CCAvenue payment gateway

---

## Use Cases

### Use Case 1: Admin Creates Order and Sends Payment Link
```
1. Admin creates a service request for a customer
2. Admin generates payment link
3. Admin sends link to customer via Email/SMS/WhatsApp
4. Customer clicks link and pays
```

### Use Case 2: Customer Requests Quote, Admin Sends Payment Link
```
1. Customer submits quotation request
2. Admin sets the price
3. Admin generates payment link
4. Customer receives link and completes payment
```

### Use Case 3: Resend Payment Link
```
1. Customer lost the original payment link
2. Admin regenerates payment link
3. Customer receives new link and pays
```

---

## API Endpoints

### 1. Generate Payment Link (Admin Only)

**Endpoint:** `POST /api/admin/payments/generate-link`
**Authentication:** Required (Admin JWT token)
**Purpose:** Generate a secure payment link for a service request

#### Request Headers
```http
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```

#### Request Body
```json
{
  "serviceRequestId": "64a1b2c3d4e5f6789abcdef1",
  "expiryHours": 48
}
```

#### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| serviceRequestId | String | Yes | Valid MongoDB ObjectId of service request |
| expiryHours | Number | No | Link expiry in hours (default: 48, max: 168) |

#### Success Response (200 OK)
```json
{
  "success": true,
  "exception": null,
  "description": "Payment link generated successfully",
  "content": {
    "paymentLink": "http://yourapp.com/pay/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
    "serviceRequestId": "64a1b2c3d4e5f6789abcdef1",
    "amount": 5000,
    "currency": "AED",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "expiresAt": "2024-01-17T10:30:00.000Z",
    "expiryHours": 48
  }
}
```

#### Error Responses

| Status | Exception | Description |
|--------|-----------|-------------|
| 400 | INVALID_SERVICE_REQUEST_ID | Invalid MongoDB ObjectId format |
| 404 | SERVICE_REQUEST_NOT_FOUND | Service request doesn't exist |
| 400 | INVALID_PAYMENT_METHOD | Payment method is not "Online Payment" |
| 400 | PAYMENT_ALREADY_COMPLETED | Payment already successful |
| 400 | INVALID_TOTAL_PRICE | Total price is 0 or null |
| 500 | TOKEN_GENERATION_FAILED | Failed to generate unique token |

#### Example cURL
```bash
curl -X POST http://localhost:3000/api/admin/payments/generate-link \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceRequestId": "64a1b2c3d4e5f6789abcdef1",
    "expiryHours": 48
  }'
```

---

### 2. Get Payment Link Details (Public)

**Endpoint:** `GET /api/payments/link/:token`
**Authentication:** None (Public endpoint, secured by token)
**Purpose:** Validate payment link and get payment details

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | String (Path) | Yes | 64-character payment token |

#### Success Response (200 OK)
```json
{
  "success": true,
  "exception": null,
  "description": "Payment link is valid",
  "content": {
    "serviceRequestId": "64a1b2c3d4e5f6789abcdef1",
    "serviceName": "Website Development",
    "categoryName": "IT Services",
    "amount": 5000,
    "currency": "AED",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "+971-50-123-4567",
    "requestType": "OnTime",
    "requestedDate": "2024-01-20T10:00:00.000Z",
    "expiresAt": "2024-01-17T10:30:00.000Z",
    "isExpired": false,
    "alreadyPaid": false
  }
}
```

#### Error Responses

| Status | Exception | Description |
|--------|-----------|-------------|
| 400 | MISSING_TOKEN | Token parameter not provided |
| 404 | INVALID_PAYMENT_LINK | Token doesn't match any service request |
| 400 | LINK_EXPIRED | Payment link has expired |
| 400 | ALREADY_PAID | Order already paid |
| 400 | LINK_ALREADY_USED | Link was already used (if single-use enabled) |

#### Example cURL
```bash
curl -X GET http://localhost:3000/api/payments/link/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

### 3. Initiate Payment via Link (Public)

**Endpoint:** `POST /api/payments/link/:token/initiate`
**Authentication:** None (Public endpoint, secured by token)
**Purpose:** Start payment process via payment link

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| token | String (Path) | Yes | 64-character payment token |

#### Success Response (200 OK)
```json
{
  "success": true,
  "exception": null,
  "description": "Payment initiated successfully via link",
  "content": {
    "paymentUrl": "https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction",
    "paymentFormData": {
      "encRequest": "encrypted_payment_data_here...",
      "access_code": "AVYR05ML69BN93RYNB"
    },
    "orderId": "64a1b2c3d4e5f6789abcdef1",
    "amount": 5000,
    "currency": "AED"
  }
}
```

#### Error Responses

| Status | Exception | Description |
|--------|-----------|-------------|
| 400 | MISSING_TOKEN | Token parameter not provided |
| 404 | INVALID_PAYMENT_LINK | Token doesn't match any service request |
| 400 | LINK_EXPIRED | Payment link has expired |
| 400 | PAYMENT_ALREADY_COMPLETED | Payment already successful |
| 400 | LINK_ALREADY_USED | Link was already used |
| 400 | INVALID_TOTAL_PRICE | Total price is invalid |
| 500 | ENCRYPTION_FAILED | Failed to encrypt payment data |

#### Example cURL
```bash
curl -X POST http://localhost:3000/api/payments/link/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2/initiate
```

#### Next Steps After Success
1. Use the returned `paymentUrl`, `encRequest`, and `access_code`
2. Create an HTML form and submit to CCAvenue
3. User completes payment on CCAvenue
4. CCAvenue calls callback endpoint
5. User is redirected to success/failure page

---

### 4. Invalidate Payment Link (Admin Only)

**Endpoint:** `POST /api/admin/payments/invalidate-link`
**Authentication:** Required (Admin JWT token)
**Purpose:** Expire/invalidate a payment link before its natural expiry

#### Request Headers
```http
Authorization: Bearer YOUR_ADMIN_JWT_TOKEN
Content-Type: application/json
```

#### Request Body
```json
{
  "serviceRequestId": "64a1b2c3d4e5f6789abcdef1"
}
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "exception": null,
  "description": "Payment link invalidated successfully",
  "content": {
    "serviceRequestId": "64a1b2c3d4e5f6789abcdef1"
  }
}
```

#### Error Responses

| Status | Exception | Description |
|--------|-----------|-------------|
| 400 | INVALID_SERVICE_REQUEST_ID | Invalid MongoDB ObjectId |
| 404 | SERVICE_REQUEST_NOT_FOUND | Service request not found |
| 400 | NO_PAYMENT_LINK | No payment link exists for this request |

---

## Complete Flow

### Admin Flow
```
1. Admin logs in
   └─> POST /api/auth/admin/login
       └─> Receives JWT token

2. Admin creates/views service request
   └─> Has service request ID

3. Admin generates payment link
   └─> POST /api/admin/payments/generate-link
       └─> Receives payment link URL and token

4. Admin sends link to customer
   └─> Via Email, SMS, or WhatsApp
       └─> Link: https://yourapp.com/pay/{token}
```

### User Flow
```
1. User receives payment link
   └─> Email/SMS/WhatsApp notification
       └─> "Click here to pay AED 5,000"

2. User clicks payment link
   └─> Opens in browser/app
       └─> GET /api/payments/link/{token}
           └─> Shows payment details page

3. User reviews payment details
   └─> Service name, amount, customer details
       └─> Clicks "Pay Now" button

4. App initiates payment
   └─> POST /api/payments/link/{token}/initiate
       └─> Receives CCAvenue payment data

5. App submits to CCAvenue
   └─> Creates form with encRequest and access_code
       └─> Submits to CCAvenue gateway
           └─> User enters card details

6. Payment processing
   └─> CCAvenue processes payment
       └─> Calls backend callback
           └─> Backend updates payment status

7. User redirected
   └─> Success: /payment/success?orderId=...
   └─> Failure: /payment/failure?orderId=...&reason=...
```

### Flow Diagram
```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │
       │ 1. Generates payment link
       │
       ▼
┌──────────────┐
│   Backend    │───────> Creates unique token
└──────┬───────┘        Saves to ServiceRequest
       │
       │ 2. Returns payment link
       │    https://app.com/pay/{token}
       │
       ▼
┌─────────────┐
│    Admin    │───────> Sends link to user
└─────────────┘         (Email/SMS/WhatsApp)
       │
       ▼
┌─────────────┐
│    User     │───────> Clicks payment link
└──────┬──────┘
       │
       │ 3. GET /api/payments/link/{token}
       │
       ▼
┌──────────────┐
│   Backend    │───────> Validates token & expiry
└──────┬───────┘         Returns payment details
       │
       │ 4. Shows payment page
       │
       ▼
┌─────────────┐
│    User     │───────> Clicks "Pay Now"
└──────┬──────┘
       │
       │ 5. POST /api/payments/link/{token}/initiate
       │
       ▼
┌──────────────┐
│   Backend    │───────> Generates CCAvenue data
└──────┬───────┘
       │
       │ 6. Returns encrypted payment data
       │
       ▼
┌─────────────┐
│    User     │───────> Submits form to CCAvenue
└──────┬──────┘
       │
       ▼
┌──────────────┐
│  CCAvenue    │───────> Processes payment
└──────┬───────┘
       │
       │ 7. Callback to backend
       │
       ▼
┌──────────────┐
│   Backend    │───────> Updates payment status
└──────┬───────┘
       │
       │ 8. Redirects user
       │
       ▼
┌─────────────┐
│    User     │───────> Sees success/failure page
└─────────────┘
```

---

## Security

### Token Generation
- **Method:** Cryptographically secure random bytes
- **Length:** 64 hexadecimal characters (32 bytes)
- **Uniqueness:** Database enforces unique constraint
- **Collision Probability:** Negligible (2^256 possible tokens)

### Security Features
1. **Token-based Access Control**
   - No authentication required, but valid token needed
   - Token is extremely difficult to guess

2. **Expiration Control**
   - Links expire after configured hours
   - Expired links cannot be used
   - Admin can manually invalidate links

3. **Single-use Option**
   - Can be configured to mark link as used after payment initiation
   - Prevents multiple payment attempts with same link

4. **Payment Status Validation**
   - Checks if payment already completed
   - Prevents duplicate payments

5. **HTTPS Requirement**
   - All payment link URLs should use HTTPS in production
   - Protects token in transit

### Best Practices
1. ✅ Always use HTTPS for payment links
2. ✅ Set reasonable expiry times (24-72 hours)
3. ✅ Send links via secure channels (Email/SMS)
4. ✅ Monitor for unusual token access patterns
5. ✅ Invalidate links when order is cancelled
6. ✅ Never log or expose full tokens in error messages

---

## Testing

### Test Script
A test script is provided: `test-payment-link.js`

**Setup:**
1. Update `ADMIN_TOKEN` with your admin JWT token
2. Update `SERVICE_REQUEST_ID` with a valid service request ID
3. Run: `node test-payment-link.js`

**Test Flow:**
```bash
▶ STEP 1: Admin generates payment link
✓ Payment link generated successfully
  Payment Link: http://localhost:3000/pay/abc123...
  Token: abc123def456...
  Amount: AED 5000

▶ STEP 2: User accesses payment link (validates token)
✓ Payment link is valid
  Service: Website Development
  Amount: AED 5000

▶ STEP 3: User initiates payment via link
✓ Payment initiated successfully
  Payment URL: https://secure.ccavenue.ae/...
  Order ID: 64a1b2c3d4e5f6789abcdef1

▶ STEP 4: Check payment status
✓ Payment status retrieved
  Payment Status: Pending
```

### Manual Testing with CCAvenue

#### Test Card Details
```
Card Number: 5123456789012346
CVV: 123
Expiry: Any future date (e.g., 12/25)
Cardholder Name: Test User
```

#### Test Scenarios

**1. Successful Payment Flow**
```
1. Generate payment link
2. Access link in browser
3. Initiate payment
4. Use test card on CCAvenue
5. Verify payment status = Success
```

**2. Expired Link**
```
1. Generate payment link with expiryHours: 0.01 (36 seconds)
2. Wait 1 minute
3. Try to access link
4. Verify error: LINK_EXPIRED
```

**3. Already Paid**
```
1. Generate payment link
2. Complete payment successfully
3. Try to access same link again
4. Verify error: ALREADY_PAID
```

**4. Invalid Token**
```
1. Try to access: /api/payments/link/invalid_token_123
2. Verify error: INVALID_PAYMENT_LINK
```

**5. Invalidate Link**
```
1. Generate payment link
2. Admin invalidates link
3. User tries to access link
4. Verify error: LINK_EXPIRED
```

---

## Integration Examples

### Frontend Payment Page (React)

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function PaymentLinkPage({ token }) {
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch payment details
    axios.get(`/api/payments/link/${token}`)
      .then(response => {
        setPaymentDetails(response.data.content);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.description || 'Invalid payment link');
        setLoading(false);
      });
  }, [token]);

  const handlePayNow = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/payments/link/${token}/initiate`);

      // Create form and submit to CCAvenue
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = response.data.content.paymentUrl;

      const encRequestInput = document.createElement('input');
      encRequestInput.type = 'hidden';
      encRequestInput.name = 'encRequest';
      encRequestInput.value = response.data.content.paymentFormData.encRequest;

      const accessCodeInput = document.createElement('input');
      accessCodeInput.type = 'hidden';
      accessCodeInput.name = 'access_code';
      accessCodeInput.value = response.data.content.paymentFormData.access_code;

      form.appendChild(encRequestInput);
      form.appendChild(accessCodeInput);
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err.response?.data?.description || 'Payment initiation failed');
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="payment-page">
      <h1>Payment Details</h1>
      <div className="details">
        <p><strong>Service:</strong> {paymentDetails.serviceName}</p>
        <p><strong>Category:</strong> {paymentDetails.categoryName}</p>
        <p><strong>Amount:</strong> AED {paymentDetails.amount}</p>
        <p><strong>Customer:</strong> {paymentDetails.customerName}</p>
        <p><strong>Email:</strong> {paymentDetails.customerEmail}</p>
      </div>
      <button onClick={handlePayNow} disabled={loading}>
        Pay Now
      </button>
    </div>
  );
}
```

### Email Template (HTML)

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; display: inline-block; margin: 20px 0; }
    .details { background-color: white; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Request</h1>
    </div>
    <div class="content">
      <p>Dear {{customerName}},</p>
      <p>Your payment for the following service is ready:</p>

      <div class="details">
        <p><strong>Service:</strong> {{serviceName}}</p>
        <p><strong>Amount:</strong> AED {{amount}}</p>
        <p><strong>Request Date:</strong> {{requestDate}}</p>
      </div>

      <p>Click the button below to complete your payment:</p>
      <a href="{{paymentLink}}" class="button">Pay Now</a>

      <p><small>This link will expire on {{expiryDate}}</small></p>
      <p><small>If you have any questions, please contact our support team.</small></p>
    </div>
  </div>
</body>
</html>
```

---

## Environment Variables

Add these to your `.env` file:

```env
# Frontend URL for payment links
FRONTEND_URL=https://yourapp.com

# Backend URL for CCAvenue callbacks
BACKEND_URL=https://api.yourapp.com

# CCAvenue credentials (already configured)
CCAVENUE_MERCHANT_ID=your_merchant_id
CCAVENUE_ACCESS_CODE=your_access_code
CCAVENUE_WORKING_KEY=your_working_key
```

---

## Troubleshooting

### Issue: "Invalid payment link"
**Cause:** Token doesn't exist in database
**Solution:** Verify token is correct, regenerate link if needed

### Issue: "Payment link has expired"
**Cause:** Link expiry time has passed
**Solution:** Admin regenerates new payment link

### Issue: "Payment already completed"
**Cause:** Service request payment status is "Success"
**Solution:** Check payment status, no action needed

### Issue: "Invalid total price"
**Cause:** Service request has no price set (quotation)
**Solution:** Admin sets price first, then generates link

### Issue: CCAvenue not opening
**Cause:** Encrypted data generation failed
**Solution:** Check CCAvenue credentials in .env file

---

## Support

For issues or questions:
- Check the test script output for detailed error messages
- Verify all environment variables are set
- Check CCAvenue integration is working
- Review service request has correct payment method and price

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial payment link implementation |
