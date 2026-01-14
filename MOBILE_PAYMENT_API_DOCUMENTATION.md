# Payment Method API Documentation for Mobile Team

## Overview
This document provides complete details about online payment integration endpoints for the mobile application. The payment system uses CCAvenue payment gateway for processing online payments.

---

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Base URL](#base-url)
3. [Payment Methods](#payment-methods)
4. [API Endpoints](#api-endpoints)
5. [Payment Flow](#payment-flow)
6. [Error Handling](#error-handling)
7. [Testing](#testing)

---

## Quick Reference

### When to Call Which Endpoint

| User Action | Endpoint to Call | Timing |
|-------------|------------------|--------|
| User clicks "Pay Now" | `POST /api/payments/initiate` | Before opening payment gateway |
| Got payment data | Submit form to CCAvenue | Immediately after initiate |
| Payment processing... | `GET /api/payments/status/:id` | Poll every 2-3 seconds |
| User clicks Cancel in WebView | `GET /api/payments/cancel` | When WebView is dismissed |
| Deep link received | `GET /api/payments/status/:id` | First thing after redirect |
| App resumes | `GET /api/payments/status/:id` | Check if payment was pending |
| Before retry payment | `GET /api/payments/status/:id` | Prevent duplicate payments |

### Endpoint Summary

| Endpoint | Method | You Call It? | Purpose |
|----------|--------|--------------|---------|
| `/api/payments/initiate` | POST | ✅ Yes | Start payment, get gateway URL |
| Submit to CCAvenue | POST | ✅ Yes | Open payment gateway WebView |
| `/api/payments/callback` | POST/GET | ❌ No | Backend only - CCAvenue calls this |
| `/api/payments/status/:id` | GET | ✅ Yes | Verify payment result |
| `/api/payments/cancel` | GET | ✅ Yes (optional) | Cancel pending payment |

---

## Complete Request & Payment Flow

### 1. Creating a Service Request (Before Payment)

**Endpoint:** `POST /api/submit-service-requests`

**When to Call:** When user submits a service request form

**Request Body (relevant payment fields):**
```json
{
  "service_id": "64a1b2c3d4e5f6789abcdef1",
  "payment_method": "Online Payment",  // or "Cash On Delivery"
  "user_name": "John Doe",
  // ... other service request fields
}
```

**Response:**
```json
{
  "success": true,
  "content": {
    "_id": "64a1b2c3d4e5f6789abcdef1",
    "paymentMethod": "Online Payment",
    "paymentStatus": "Pending",
    "totalPrice": 150.00,  // May be null for quotations
    // ... other fields
  }
}
```

### 2. When to Show "Pay Now" Button

Display "Pay Now" button when **ALL** of these conditions are met:

| Condition | Check | Why |
|-----------|-------|-----|
| Payment method is online | `paymentMethod === "Online Payment"` | CoD doesn't need online payment |
| Payment not completed | `paymentStatus !== "Success"` | Already paid |
| Price is set | `totalPrice !== null && totalPrice > 0` | Can't pay without price |
| Request is active | `status !== "Cancelled"` | Don't allow payment for cancelled |

**For Regular Requests:**
```javascript
function shouldShowPayNow(serviceRequest) {
  return serviceRequest.paymentMethod === "Online Payment" &&
         serviceRequest.paymentStatus !== "Success" &&
         serviceRequest.totalPrice > 0 &&
         serviceRequest.status !== "Cancelled";
}
```

**For Quotation Requests:**
```javascript
function shouldShowPayNow(serviceRequest) {
  return serviceRequest.paymentMethod === "Online Payment" &&
         serviceRequest.paymentStatus !== "Success" &&
         serviceRequest.totalPrice !== null &&  // Wait for admin to set price
         serviceRequest.totalPrice > 0 &&
         serviceRequest.status === "Quoted" &&   // Admin has quoted
         serviceRequest.status !== "Cancelled";
}
```

### 3. Button States & Labels

| Scenario | Button Label | Button State | Action |
|----------|--------------|--------------|--------|
| CoD selected | "Confirm Order" | Enabled | Just confirm, no payment |
| Online Payment, no price | "Waiting for Quote" | Disabled | Admin hasn't set price yet |
| Online Payment, has price, pending | "Pay Now" | Enabled | Call initiate payment |
| Online Payment, processing | "Processing..." | Disabled | Payment in progress |
| Online Payment, success | "Paid ✓" | Disabled | Already completed |
| Online Payment, failed | "Retry Payment" | Enabled | Call initiate payment again |

### 4. Complete User Journey Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Create Service Request                                 │
└─────────────────────────────────────────────────────────────────┘
  User fills form → Selects payment method → Submits
  │
  ├─ Cash On Delivery selected?
  │   └─> Show "Confirm Order" button → No payment needed
  │
  └─ Online Payment selected?
      └─> Create request with paymentStatus: "Pending"
          │
          ┌─────────────────────────────────────────────────────────┐
          │ STEP 2: Check if Price is Set                          │
          └─────────────────────────────────────────────────────────┘
          │
          ├─ Regular request (has totalPrice)?
          │   └─> Show "Pay Now" button ✅
          │
          └─ Quotation request (totalPrice = null)?
              └─> Show "Waiting for Quote" (disabled) ⏳
                  │
                  └─> Admin sets price (backend updates totalPrice)
                      │
                      └─> Notify user "Quote ready!"
                          │
                          └─> Show "Pay Now" button ✅

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: User Clicks "Pay Now"                                  │
└─────────────────────────────────────────────────────────────────┘
  │
  ├─> Validate: paymentStatus should be "Pending" or "Failure"
  │   (If "Success" → Show "Already Paid" message)
  │
  └─> POST /api/payments/initiate
      │
      ├─ Success?
      │   └─> Receive encRequest, access_code, paymentUrl
      │       │
      │       ┌─────────────────────────────────────────────────┐
      │       │ STEP 4: Open Payment Gateway                   │
      │       └─────────────────────────────────────────────────┘
      │       │
      │       └─> Open WebView with CCAvenue
      │           │
      │           ├─> Start polling: GET /api/payments/status/:id
      │           │   (every 2-3 seconds)
      │           │
      │           └─> User completes payment on CCAvenue
      │               │
      │               ┌─────────────────────────────────────────┐
      │               │ STEP 5: Payment Response               │
      │               └─────────────────────────────────────────┘
      │               │
      │               ├─> CCAvenue calls backend callback
      │               │   (Mobile doesn't call this)
      │               │
      │               ├─> Backend updates paymentStatus
      │               │
      │               └─> CCAvenue redirects to deep link:
      │                   • yourapp://payment/success?orderId=...
      │                   • yourapp://payment/failure?orderId=...
      │
      └─ Error?
          └─> Show error message from API response

┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: Handle Redirect & Verify                               │
└─────────────────────────────────────────────────────────────────┘
  │
  ├─> App receives deep link
  │   │
  │   └─> Extract orderId from URL
  │       │
  │       └─> GET /api/payments/status/:id
  │           │
  │           ├─ paymentStatus === "Success"?
  │           │   └─> Show success screen ✅
  │           │       • Transaction ID
  │           │       • Amount paid
  │           │       • Date/Time
  │           │       • "View Order" button
  │           │
  │           ├─ paymentStatus === "Failure"?
  │           │   └─> Show failure screen ❌
  │           │       • Failure reason
  │           │       • "Retry Payment" button
  │           │       • "Contact Support" button
  │           │
  │           └─ paymentStatus === "Pending"?
  │               └─> Continue polling
  │                   (Callback might be delayed)
  │
  └─ If polling detects status change:
      └─> Stop polling → Show appropriate screen
```

### 5. UI State Management

```javascript
// Example state management for payment button
const PaymentButton = ({ serviceRequest }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Determine button state
  const getButtonConfig = () => {
    // Cash on Delivery
    if (serviceRequest.paymentMethod === "Cash On Delivery") {
      return {
        label: "Confirm Order",
        disabled: false,
        action: () => confirmOrder()
      };
    }

    // Online Payment - Check conditions
    if (serviceRequest.paymentMethod === "Online Payment") {
      // No price set (quotation)
      if (!serviceRequest.totalPrice || serviceRequest.totalPrice === 0) {
        return {
          label: "Waiting for Quote",
          disabled: true,
          action: null
        };
      }

      // Already paid
      if (serviceRequest.paymentStatus === "Success") {
        return {
          label: "Paid ✓",
          disabled: true,
          action: null
        };
      }

      // Processing
      if (isProcessing) {
        return {
          label: "Processing...",
          disabled: true,
          action: null
        };
      }

      // Failed - allow retry
      if (serviceRequest.paymentStatus === "Failure") {
        return {
          label: "Retry Payment",
          disabled: false,
          action: () => initiatePayment()
        };
      }

      // Pending or Cancelled - allow payment
      return {
        label: "Pay Now",
        disabled: false,
        action: () => initiatePayment()
      };
    }
  };

  const config = getButtonConfig();

  return (
    <button
      disabled={config.disabled}
      onClick={config.action}
    >
      {config.label}
    </button>
  );
};
```

### 6. Notification: When Admin Sets Quote

For quotation requests, when admin sets the price:

**Option A: Push Notification**
```json
{
  "type": "quote_ready",
  "title": "Your quote is ready!",
  "message": "Admin has quoted AED 5000 for your request",
  "data": {
    "serviceRequestId": "64a1b2c3d4e5f6789abcdef1",
    "totalPrice": 5000,
    "action": "open_payment"
  }
}
```

**Option B: In-App Badge**
- Show badge on service request list
- "New Quote Available" label
- Navigate to request details → Show "Pay Now"

---

## Base URL
```
Production: YOUR_PRODUCTION_URL
Development: YOUR_DEV_URL
```

---

## Payment Methods

The system supports two payment methods:

| Payment Method | Value | Description |
|----------------|-------|-------------|
| Cash on Delivery | `"Cash On Delivery"` | Payment collected at service delivery |
| Online Payment | `"Online Payment"` | Payment via CCAvenue gateway (AED) |

---

## API Endpoints

### 1. Initiate Payment

**Endpoint:** `POST /api/payments/initiate`

**Purpose:** Initiates an online payment transaction for a service request. Returns encrypted payment data to submit to CCAvenue gateway.

**When to Call:**
- When user clicks "Pay Now" button on a service request with "Online Payment" method
- After service request has been created successfully
- Before opening the payment gateway WebView
- For quotation requests: Only after admin has set the price (check that `total_price` is not null)

**Authentication:** None required (public endpoint)

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "serviceRequestId": "64a1b2c3d4e5f6789abcdef1"
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| serviceRequestId | String | Yes | Valid MongoDB ObjectId of the service request |

**Success Response (200 OK):**
```json
{
  "success": true,
  "exception": null,
  "description": "Payment initiated successfully",
  "content": {
    "paymentUrl": "https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction",
    "paymentFormData": {
      "encRequest": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
      "access_code": "AVYR05ML69BN93RYNB"
    },
    "orderId": "64a1b2c3d4e5f6789abcdef1",
    "amount": 150.00,
    "currency": "AED"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| paymentUrl | String | CCAvenue payment gateway URL |
| paymentFormData.encRequest | String | Encrypted payment request data |
| paymentFormData.access_code | String | CCAvenue merchant access code |
| orderId | String | Service request ID (used as order ID) |
| amount | Number | Payment amount |
| currency | String | Currency code (always "AED") |

**Error Responses:**

| Status Code | Exception | Description |
|-------------|-----------|-------------|
| 400 | INVALID_SERVICE_REQUEST_ID | Invalid MongoDB ObjectId format |
| 404 | SERVICE_REQUEST_NOT_FOUND | Service request does not exist |
| 400 | INVALID_PAYMENT_METHOD | Payment method is not "Online Payment" |
| 400 | PAYMENT_ALREADY_COMPLETED | Payment status is already "Success" |
| 400 | INVALID_AMOUNT | Total price is 0 or negative |
| 500 | ENCRYPTION_FAILED | Failed to encrypt payment data |

**Example Error Response:**
```json
{
  "success": false,
  "exception": "INVALID_PAYMENT_METHOD",
  "description": "Service request does not have online payment method",
  "content": null
}
```

**Validation Rules:**
- Service request must exist in database
- Payment method must be "Online Payment"
- Payment status must not be "Success"
- Total price must be greater than 0
- For quotation requests, price must be set by admin first

---

### 2. Submit Payment to CCAvenue

**Purpose:** After receiving payment initiation response, submit payment form to CCAvenue gateway.

**When to Call:**
- Immediately after successfully receiving response from `POST /api/payments/initiate`
- When you have the `paymentUrl`, `encRequest`, and `access_code` from step 1
- Open in a WebView or in-app browser (NOT external browser) to maintain app control

**Action:** Create and submit a form to CCAvenue using the data from initiate payment response.

**Implementation Example:**

```html
<form method="post" action="{{ paymentUrl }}" id="ccavenueForm">
  <input type="hidden" name="encRequest" value="{{ encRequest }}" />
  <input type="hidden" name="access_code" value="{{ access_code }}" />
</form>

<script>
  document.getElementById('ccavenueForm').submit();
</script>
```

**Mobile Implementation:**
- Open the payment URL in a WebView or in-app browser
- Submit the form automatically or use a "Pay Now" button
- CCAvenue will handle the payment process
- User will be redirected back after payment completion

---

### 3. Payment Callback (Handled by Backend)

**Endpoint:** `POST/GET /api/payments/callback`

**Purpose:** Receives payment response from CCAvenue gateway. This is automatically called by CCAvenue after payment completion.

**When to Call:**
- **You DON'T call this endpoint** - CCAvenue calls it automatically
- This is for your information only
- After payment is complete, CCAvenue redirects the user back to your app via deep link

**Note:** This endpoint is for reference only. Mobile app does not call this directly. CCAvenue calls this endpoint and redirects the user to your app.

**Redirect URLs:**
- Success: `/payment/success?orderId=<serviceRequestId>`
- Failure: `/payment/failure?orderId=<serviceRequestId>&reason=<failure_message>`

**Mobile Deep Link Setup:**
Configure CCAvenue redirect URL to your app's deep link scheme:
```
yourapp://payment/success?orderId=...
yourapp://payment/failure?orderId=...&reason=...
```

---

### 4. Get Payment Status

**Endpoint:** `GET /api/payments/status/:serviceRequestId`

**Purpose:** Retrieves the current payment status and details for a service request. Use this after payment completion to verify the transaction.

**When to Call:**
- **After receiving deep link redirect** from CCAvenue (success/failure) - Call this FIRST to confirm payment status
- **While waiting for payment** - Poll every 2-3 seconds to check if payment completed
- **Before displaying payment status** to user - Always verify with server
- **On app resume** - If user was in payment flow, check status when they return to app
- **Before allowing retry** - Check current status to prevent duplicate payments

**Authentication:** None required (public endpoint)

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| serviceRequestId | String | Yes | Valid MongoDB ObjectId of the service request |

**Success Response (200 OK):**
```json
{
  "success": true,
  "exception": null,
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
      "failureReason": null,
      "bankReferenceNumber": "REF123456"
    },
    "totalPrice": 150.00
  }
}
```

**Payment Status Values:**

| Status | Description |
|--------|-------------|
| Pending | Payment not yet completed or in progress |
| Success | Payment completed successfully |
| Failure | Payment failed or was declined |
| Cancelled | Payment cancelled by user |

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| serviceRequestId | String | Service request ID |
| paymentMethod | String | "Cash On Delivery" or "Online Payment" |
| paymentStatus | String | Current payment status |
| paymentDetails | Object | Payment transaction details (null for CoD) |
| paymentDetails.transactionId | String | CCAvenue tracking ID |
| paymentDetails.orderId | String | Order ID (same as serviceRequestId) |
| paymentDetails.amount | Number | Payment amount |
| paymentDetails.currency | String | Currency code |
| paymentDetails.paymentDate | Date | Transaction date/time (ISO 8601) |
| paymentDetails.failureReason | String | Reason for failure (if applicable) |
| paymentDetails.bankReferenceNumber | String | Bank reference number |
| totalPrice | Number | Total service request price |

**Error Responses:**

| Status Code | Exception | Description |
|-------------|-----------|-------------|
| 400 | INVALID_SERVICE_REQUEST_ID | Invalid MongoDB ObjectId format |
| 404 | SERVICE_REQUEST_NOT_FOUND | Service request does not exist |

**Example Error Response:**
```json
{
  "success": false,
  "exception": "SERVICE_REQUEST_NOT_FOUND",
  "description": "Service request not found",
  "content": null
}
```

---

### 5. Cancel Payment

**Endpoint:** `GET /api/payments/cancel`

**Purpose:** Cancels a pending payment transaction. Use this when user explicitly cancels payment before completion.

**When to Call:**
- When user clicks "Cancel" or "Back" button while in payment gateway WebView
- When user explicitly chooses to cancel payment before submitting card details
- On WebView close/dismiss if payment wasn't completed
- **Do NOT call** if payment was already successful or failed (check status first)

**Authentication:** None required (public endpoint)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| orderId | String | Yes | Service request ID |

**Example Request:**
```
GET /api/payments/cancel?orderId=64a1b2c3d4e5f6789abcdef1
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "exception": null,
  "description": "Payment cancelled",
  "content": null
}
```

**Error Responses:**

| Status Code | Exception | Description |
|-------------|-----------|-------------|
| 400 | MISSING_ORDER_ID | Order ID query parameter not provided |
| 404 | SERVICE_REQUEST_NOT_FOUND | Service request does not exist |

---

## Payment Flow

### Complete Mobile Integration Flow

```
1. User selects service and chooses "Online Payment" method
   └─> POST /api/submit-service-requests (with payment_method: "Online Payment")
       └─> Returns serviceRequestId

2. User clicks "Pay Now" button
   └─> POST /api/payments/initiate (with serviceRequestId)
       └─> Returns paymentUrl, encRequest, access_code

3. Display payment gateway in WebView
   └─> Submit form to paymentUrl with encRequest and access_code
       └─> CCAvenue handles payment process

4. User completes/cancels payment on CCAvenue
   └─> CCAvenue calls backend callback endpoint
       └─> Backend processes payment response
           └─> User redirected to success/failure deep link

5. App receives deep link redirect
   └─> Extract orderId from deep link
       └─> GET /api/payments/status/:serviceRequestId
           └─> Display payment result to user

6. Optional: Poll payment status
   └─> Periodically call GET /api/payments/status/:serviceRequestId
       └─> Update UI when status changes from "Pending"
```

### Flow Diagram

```
┌─────────────┐
│ Mobile App  │
└──────┬──────┘
       │
       │ 1. POST /api/payments/initiate
       │    { serviceRequestId }
       │
       ▼
┌──────────────┐
│   Backend    │───────> Encrypts payment data
└──────┬───────┘
       │
       │ 2. Returns encrypted data
       │    { paymentUrl, encRequest, access_code }
       │
       ▼
┌─────────────┐
│ Mobile App  │───────> Opens WebView
└──────┬──────┘
       │
       │ 3. Submits form to CCAvenue
       │
       ▼
┌──────────────┐
│  CCAvenue    │───────> User enters card details
│   Gateway    │
└──────┬───────┘
       │
       │ 4. Payment processed
       │
       ▼
┌──────────────┐
│   Backend    │───────> Receives callback
│   Callback   │         Decrypts response
└──────┬───────┘         Updates DB
       │
       │ 5. Redirects to app deep link
       │
       ▼
┌─────────────┐
│ Mobile App  │───────> 6. GET /api/payments/status/:id
└──────┬──────┘
       │
       │ 7. Display result
       │
       ▼
┌─────────────┐
│    User     │
└─────────────┘
```

---

## Error Handling

### Standard Error Response Format

All endpoints return errors in this format:

```json
{
  "success": false,
  "exception": "ERROR_CODE",
  "description": "Human-readable error message",
  "content": null
}
```

### Common Error Codes

| Error Code | HTTP Status | Description | Action |
|------------|-------------|-------------|--------|
| INVALID_SERVICE_REQUEST_ID | 400 | Invalid ID format | Validate ID before sending |
| SERVICE_REQUEST_NOT_FOUND | 404 | Service request not found | Check if service request exists |
| INVALID_PAYMENT_METHOD | 400 | Payment method not "Online Payment" | Verify payment method selection |
| PAYMENT_ALREADY_COMPLETED | 400 | Payment already successful | Check status before initiating |
| INVALID_AMOUNT | 400 | Amount is 0 or negative | Verify total price is set |
| ENCRYPTION_FAILED | 500 | Server encryption error | Retry or contact support |
| MISSING_ORDER_ID | 400 | Order ID not provided | Include orderId in request |

### Recommended Error Handling

```javascript
// Example error handling
try {
  const response = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceRequestId: '...' })
  });

  const data = await response.json();

  if (!data.success) {
    switch (data.exception) {
      case 'INVALID_PAYMENT_METHOD':
        alert('This service request does not support online payment');
        break;
      case 'PAYMENT_ALREADY_COMPLETED':
        alert('Payment has already been completed');
        break;
      case 'INVALID_AMOUNT':
        alert('Please wait for admin to set the price');
        break;
      default:
        alert(data.description || 'Payment initiation failed');
    }
    return;
  }

  // Proceed with payment
  openPaymentGateway(data.content);

} catch (error) {
  console.error('Network error:', error);
  alert('Unable to connect to server. Please check your internet connection.');
}
```

---

## Payment Status Polling

For better user experience, poll payment status while waiting for callback:

```javascript
async function pollPaymentStatus(serviceRequestId, maxAttempts = 30, interval = 2000) {
  let attempts = 0;

  const poll = async () => {
    try {
      const response = await fetch(`/api/payments/status/${serviceRequestId}`);
      const data = await response.json();

      if (data.success && data.content.paymentStatus !== 'Pending') {
        // Payment completed (Success, Failure, or Cancelled)
        return data.content;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, interval);
      } else {
        // Timeout: payment still pending
        return null;
      }

    } catch (error) {
      console.error('Polling error:', error);
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, interval);
      }
    }
  };

  return poll();
}

// Usage
const result = await pollPaymentStatus('64a1b2c3d4e5f6789abcdef1');
if (result) {
  if (result.paymentStatus === 'Success') {
    showSuccessScreen(result);
  } else {
    showFailureScreen(result);
  }
} else {
  showTimeoutMessage();
}
```

---

## Testing

### Test Credentials

**CCAvenue Test Card Details:**
- Card Number: `5123456789012346`
- CVV: `123`
- Expiry: Any future date
- Cardholder Name: Any name

### Test Flow Script

A comprehensive test script is available at `test-payment-flow.js` that demonstrates:
1. Creating a service request with online payment
2. Initiating payment
3. Checking payment status

### Test Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Successful Payment | 1. Initiate payment<br>2. Submit to CCAvenue<br>3. Use test card | Status: Success |
| Failed Payment | 1. Initiate payment<br>2. Submit to CCAvenue<br>3. Use invalid card | Status: Failure |
| Cancelled Payment | 1. Initiate payment<br>2. Click "Cancel" on CCAvenue | Status: Cancelled |
| Quotation Flow | 1. Create quotation request<br>2. Wait for admin price<br>3. Initiate payment | Price must be set |
| Already Paid | 1. Complete payment<br>2. Try to initiate again | Error: Already completed |

---

## Special Cases

### Quotation Payment Flow

For service requests of type "Quotation":

1. User submits request WITHOUT a price (total_price = null)
2. Admin reviews and sets price via backend admin API
3. User receives notification that quote is ready
4. User clicks "Pay Now" to initiate payment
5. Normal payment flow continues

**Important:** Payment cannot be initiated for quotations until admin sets the price.

### Cash on Delivery

For service requests with payment method "Cash On Delivery":

- Payment initiation endpoint will return error
- No online payment processing needed
- Payment is collected at service delivery time
- Payment status remains "Pending" until admin updates after cash collection

---

## Deep Link Configuration

Configure your mobile app to handle payment redirects:

### iOS (URL Scheme)

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>yourapp</string>
    </array>
  </dict>
</array>
```

### Android (Intent Filter)

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="yourapp" />
</intent-filter>
```

### Handle Deep Links

```javascript
// React Native example
import { Linking } from 'react-native';

Linking.addEventListener('url', handleDeepLink);

function handleDeepLink(event) {
  const url = event.url;

  if (url.includes('payment/success')) {
    const orderId = extractOrderId(url);
    navigateToPaymentSuccess(orderId);
  } else if (url.includes('payment/failure')) {
    const orderId = extractOrderId(url);
    const reason = extractReason(url);
    navigateToPaymentFailure(orderId, reason);
  }
}
```

---

## Security Considerations

1. **Never store card details** - All card information is handled by CCAvenue
2. **Use HTTPS only** - All API calls must use secure connections
3. **Validate responses** - Always verify payment status with GET /api/payments/status
4. **Handle timeouts** - Implement timeout logic for payment status checks
5. **Prevent double payments** - Check payment status before initiating new payment
6. **Secure WebView** - Ensure payment WebView doesn't leak sensitive data

---

## Support & Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid amount" error | Quotation price not set | Wait for admin to set price |
| Payment stuck in "Pending" | Callback not received | Poll status or retry |
| "Payment already completed" | Duplicate payment attempt | Check status before initiating |
| Gateway timeout | Network issue | Retry payment initiation |
| Deep link not working | URL scheme not configured | Configure app URL scheme |

### Debug Checklist

- [ ] Service request exists and has correct payment method
- [ ] Total price is set and greater than 0
- [ ] Previous payment is not already successful
- [ ] Network connection is stable
- [ ] CCAvenue URL is accessible
- [ ] Deep link URL scheme is configured
- [ ] Backend callback URL is accessible to CCAvenue

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial documentation |

---

## Contact

For API issues or questions, contact the backend team.

**Backend Repository:** `d:\Sher Ali\nazam-core`

**Key Files:**
- Routes: `routes/payments.js`
- Controller: `controllers/paymentController.js`
- Service: `utils/ccavenueService.js`
- Model: `models/ServiceRequest.js`
