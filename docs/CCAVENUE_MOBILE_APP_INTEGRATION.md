# CCAvenue Payment Integration - Mobile Application Flow

This document provides a comprehensive guide for integrating CCAvenue payment gateway in the mobile application, covering all use cases, API endpoints, and flow diagrams.

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Payment Flow Diagram](#payment-flow-diagram)
4. [API Endpoints](#api-endpoints)
5. [Mobile App Implementation](#mobile-app-implementation)
6. [Use Cases](#use-cases)
7. [Error Handling](#error-handling)
8. [Security Considerations](#security-considerations)
9. [Testing](#testing)

---

## Overview

CCAvenue is a payment gateway service that handles online payments for UAE (AED currency). The integration uses:
- **Backend**: Node.js with Express (nazam-core)
- **Frontend/Mobile**: Next.js with React (can be accessed via WebView in mobile apps)
- **Encryption**: AES-128-CBC with MD5 hashed working key

### Supported Payment Methods
1. **Cash on Delivery (CoD)** - No online payment required
2. **Online Payment (CCAvenue)** - Credit/Debit cards via CCAvenue gateway

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │     │    Backend      │     │    CCAvenue     │
│   (WebView)     │     │   (nazam-core)  │     │    Gateway      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. Submit Order      │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  2. Order Created     │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  3. Initiate Payment  │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │  4. Encrypted Data    │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │  5. POST Form to CCAvenue                     │
         │──────────────────────────────────────────────>│
         │                       │                       │
         │  6. Payment Page      │                       │
         │<──────────────────────────────────────────────│
         │                       │                       │
         │  User Enters Card Details                     │
         │                       │                       │
         │                       │  7. Callback (encResponse)
         │                       │<──────────────────────│
         │                       │                       │
         │  8. Redirect to Success/Failure Page         │
         │<──────────────────────│                       │
         │                       │                       │
```

---

## Payment Flow Diagram

### Complete Payment Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: User fills service request form                            │
│  - Selects services                                                 │
│  - Enters address, date, time                                       │
│  - Reviews pricing                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Payment Method Selection Modal                             │
│  ┌─────────────────┐  ┌─────────────────┐                          │
│  │ Cash on Delivery│  │ Online Payment  │                          │
│  │    (Enabled)    │  │   (CCAvenue)    │                          │
│  └─────────────────┘  └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────────┐
│  Cash on Delivery Path    │   │     Online Payment Path           │
│  - Order created          │   │                                   │
│  - Status: Pending        │   │                                   │
│  - Payment: N/A           │   │                                   │
└───────────────────────────┘   └──────────────┬────────────────────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────────────────┐
                    │  STEP 3: Create Service Request                 │
                    │  POST /api/submit-service-requests              │
                    │  Body: { payment_method: "Online Payment", ... }│
                    │  Response: { serviceRequestId: "xxx" }          │
                    └─────────────────────────────────────────────────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────────────────┐
                    │  STEP 4: Initiate Payment                       │
                    │  POST /api/payments/initiate                    │
                    │  Body: { serviceRequestId: "xxx" }              │
                    │  Response: {                                    │
                    │    paymentUrl: "https://secure.ccavenue.ae/...",│
                    │    paymentFormData: {                           │
                    │      encRequest: "encrypted_string",            │
                    │      access_code: "AVYR05ML69BN93RYNB"          │
                    │    },                                           │
                    │    orderId, amount, currency                    │
                    │  }                                              │
                    └─────────────────────────────────────────────────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────────────────┐
                    │  STEP 5: Submit to CCAvenue                     │
                    │  - Create hidden HTML form                      │
                    │  - POST to paymentUrl with:                     │
                    │    - encRequest (encrypted payment data)        │
                    │    - access_code                                │
                    │  - Browser/WebView redirects to CCAvenue        │
                    └─────────────────────────────────────────────────┘
                                               │
                                               ▼
                    ┌─────────────────────────────────────────────────┐
                    │  STEP 6: CCAvenue Payment Page                  │
                    │  - User sees CCAvenue payment interface         │
                    │  - Enters card details:                         │
                    │    - Card Number                                │
                    │    - Expiry Date                                │
                    │    - CVV                                        │
                    │  - Completes 3D Secure verification (if req)    │
                    └─────────────────────────────────────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────┐
                    │                          │                      │
                    ▼                          ▼                      ▼
        ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
        │  Payment Success  │   │  Payment Failed   │   │ Payment Cancelled │
        └─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
                  │                       │                       │
                  ▼                       ▼                       ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │  STEP 7: CCAvenue Callback                                              │
    │  CCAvenue POSTs to: /api/payments/callback                              │
    │  Body: { encResponse: "encrypted_response" }                            │
    │                                                                         │
    │  Backend:                                                               │
    │  1. Decrypts encResponse                                                │
    │  2. Extracts: order_id, tracking_id, order_status, amount, etc.        │
    │  3. Updates ServiceRequest in database                                  │
    │  4. Redirects user via HTML meta refresh                                │
    └─────────────────────────────────────────────────────────────────────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────┐
                    │                          │                      │
                    ▼                          ▼                      ▼
        ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
        │ /payment/success  │   │ /payment/failure  │   │/payment/cancelled │
        │ ?orderId=xxx      │   │ ?orderId=xxx      │   │ ?orderId=xxx      │
        │                   │   │ &reason=xxx       │   │                   │
        └───────────────────┘   └───────────────────┘   └───────────────────┘
```

---

## API Endpoints

### 1. Initiate Payment
**POST** `/api/payments/initiate`

Initiates the payment process for a service request.

**Request:**
```json
{
  "serviceRequestId": "64a1b2c3d4e5f6789abcdef1"
}
```

**Response (Success):**
```json
{
  "success": true,
  "exception": null,
  "description": "Payment initiated successfully",
  "content": {
    "paymentUrl": "https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction",
    "paymentFormData": {
      "encRequest": "a1b2c3d4e5f6...(encrypted string)",
      "access_code": "AVYR05ML69BN93RYNB"
    },
    "orderId": "64a1b2c3d4e5f6789abcdef1",
    "amount": 150.00,
    "currency": "AED"
  }
}
```

**Error Responses:**
| Code | Error Code | Description |
|------|------------|-------------|
| 400 | INVALID_SERVICE_REQUEST_ID | Invalid MongoDB ObjectId format |
| 404 | SERVICE_REQUEST_NOT_FOUND | Service request doesn't exist |
| 400 | INVALID_PAYMENT_METHOD | Payment method is not "Online Payment" |
| 400 | INVALID_TOTAL_PRICE | Missing or zero total price |
| 400 | PAYMENT_ALREADY_COMPLETED | Payment already successful |
| 500 | ENCRYPTION_FAILED | Failed to generate encrypted data |

---

### 2. Payment Callback (CCAvenue → Backend)
**POST/GET** `/api/payments/callback`

Called by CCAvenue after payment processing. This endpoint receives the encrypted response, decrypts it, updates the database, and redirects the user.

**Request (from CCAvenue):**
```
Content-Type: application/x-www-form-urlencoded

encResponse=a1b2c3d4e5f6...(encrypted response)
```

**Decrypted Response Contains:**
```
order_id=64a1b2c3d4e5f6789abcdef1
tracking_id=123456789012
bank_ref_no=1234567890
order_status=Success|Failure|Aborted|Pending
failure_message=
payment_mode=Credit Card
card_name=Visa
status_code=0
status_message=Transaction Successful
currency=AED
amount=150.00
billing_name=John Doe
billing_email=john@example.com
trans_date=10/01/2026 14:30:00
```

**Response:** HTML page with meta refresh redirecting to frontend

---

### 3. Payment Cancellation
**GET** `/api/payments/cancel?orderId=xxx`

Called when user cancels payment on CCAvenue page.

**Response:** Redirects to `/payment/cancelled?orderId=xxx`

---

### 4. Get Payment Status
**GET** `/api/payments/status/:serviceRequestId`

Check the current payment status of a service request.

**Response:**
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
      "transactionId": "123456789012",
      "orderId": "64a1b2c3d4e5f6789abcdef1",
      "amount": 150,
      "currency": "AED",
      "paymentDate": "2026-01-10T14:30:00.000Z",
      "failureReason": "",
      "bankReferenceNumber": "1234567890"
    },
    "totalPrice": 150
  }
}
```

---

## Mobile App Implementation

### Orders Page - Payment Management

The Orders page (`/orders`) provides users with the ability to manage their payments:

**Features:**
- Displays payment status for Online Payment orders
- Shows "Pay Now" button for orders requiring payment
- Allows retry of failed/pending payments
- Users can delete or cancel unpaid orders

**Payment Status Display:**
| Status | Color | Icon | Description |
|--------|-------|------|-------------|
| Success | Green | CheckCircle | Payment completed |
| Pending | Yellow | AlertCircle | Payment not yet completed |
| Failure | Red | XCircle | Payment failed |
| Cancelled | Orange | XCircle | Payment was cancelled |

**"Pay Now" Button Visibility:**
The "Pay Now" button appears when ALL conditions are met:
1. `paymentMethod === "Online Payment"`
2. `paymentStatus !== "Success"`
3. `order.status !== "Cancelled"`
4. `total_price > 0`

```typescript
const needsPayment = (order: Order) => {
  return (
    order.paymentMethod === "Online Payment" &&
    order.paymentStatus !== "Success" &&
    order.status !== "Cancelled" &&
    order.total_price &&
    order.total_price > 0
  );
};
```

---

### For React Native / WebView Integration

#### Option 1: WebView Approach (Recommended)
```jsx
import { WebView } from 'react-native-webview';

const PaymentWebView = ({ paymentUrl, encRequest, accessCode, onPaymentComplete }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body onload="document.forms['paymentForm'].submit();">
      <form id="paymentForm" method="POST" action="${paymentUrl}">
        <input type="hidden" name="encRequest" value="${encRequest}" />
        <input type="hidden" name="access_code" value="${accessCode}" />
      </form>
      <p>Redirecting to payment gateway...</p>
    </body>
    </html>
  `;

  const handleNavigationChange = (navState) => {
    const { url } = navState;

    // Check for success/failure/cancelled URLs
    if (url.includes('/payment/success')) {
      const orderId = extractOrderId(url);
      onPaymentComplete({ status: 'success', orderId });
    } else if (url.includes('/payment/failure')) {
      const orderId = extractOrderId(url);
      const reason = extractReason(url);
      onPaymentComplete({ status: 'failure', orderId, reason });
    } else if (url.includes('/payment/cancelled')) {
      const orderId = extractOrderId(url);
      onPaymentComplete({ status: 'cancelled', orderId });
    }
  };

  return (
    <WebView
      source={{ html }}
      onNavigationStateChange={handleNavigationChange}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
};
```

#### Option 2: Deep Linking Approach
Configure your mobile app to handle deep links for payment results:

```
// URL Schemes
myapp://payment/success?orderId=xxx
myapp://payment/failure?orderId=xxx&reason=xxx
myapp://payment/cancelled?orderId=xxx
```

### Payment Flow Implementation

```typescript
// 1. Create Service Request
const createOrder = async (formData) => {
  const response = await fetch('/api/submit-service-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...formData,
      payment_method: 'Online Payment'
    })
  });
  return response.json();
};

// 2. Initiate Payment
const initiatePayment = async (serviceRequestId: string) => {
  const response = await fetch('/api/payments/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceRequestId })
  });
  return response.json();
};

// 3. Submit to CCAvenue (Web/WebView)
const submitPaymentToCCAvenue = (paymentData) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = paymentData.paymentUrl;

  const encRequestInput = document.createElement('input');
  encRequestInput.type = 'hidden';
  encRequestInput.name = 'encRequest';
  encRequestInput.value = paymentData.encRequest;
  form.appendChild(encRequestInput);

  const accessCodeInput = document.createElement('input');
  accessCodeInput.type = 'hidden';
  accessCodeInput.name = 'access_code';
  accessCodeInput.value = paymentData.access_code;
  form.appendChild(accessCodeInput);

  document.body.appendChild(form);
  form.submit();
};

// 4. Check Payment Status
const checkPaymentStatus = async (serviceRequestId: string) => {
  const response = await fetch(`/api/payments/status/${serviceRequestId}`);
  return response.json();
};
```

---

## Use Cases

### Use Case 1: Successful Payment Flow
```
1. User completes service request form
2. User selects "Online Payment"
3. Frontend calls POST /api/submit-service-requests
4. Service request created with paymentStatus: "Pending"
5. Frontend calls POST /api/payments/initiate
6. Backend returns encrypted payment data
7. Frontend submits form to CCAvenue
8. User redirected to CCAvenue payment page
9. User enters card details and completes payment
10. CCAvenue calls /api/payments/callback with encResponse
11. Backend decrypts response, status = "Success"
12. Backend updates ServiceRequest.paymentStatus = "Success"
13. User redirected to /payment/success
14. User sees success confirmation
```

### Use Case 2: Payment Failure
```
1-8. Same as Use Case 1
9. Payment fails (insufficient funds, card declined, etc.)
10. CCAvenue calls /api/payments/callback with failure status
11. Backend updates ServiceRequest.paymentStatus = "Failure"
12. Backend stores failure_message in paymentDetails
13. User redirected to /payment/failure?reason=xxx
14. User sees failure message with retry option
```

### Use Case 3: User Cancels Payment
```
1-8. Same as Use Case 1
9. User clicks "Cancel" on CCAvenue page
10. CCAvenue redirects to cancel_url: /payment/cancelled?orderId=xxx
11. Backend updates ServiceRequest.paymentStatus = "Cancelled"
12. User sees cancellation message
13. User can retry from orders page
```

### Use Case 4: Payment Timeout/Abandoned (WebView Closed)
```
1-8. Same as Use Case 1
9. User closes WebView/browser without completing payment
10. ServiceRequest remains with paymentStatus: "Pending"
11. Order is STILL created in database (this is by design)
12. User can retry payment from Orders page using "Pay Now" button
```

**Important:** The order is created BEFORE payment initiation. This means:
- Even if user closes WebView, the order exists
- User can complete payment later from Orders page
- Orders with `paymentMethod: "Online Payment"` and `paymentStatus: "Pending"` show "Pay Now" button

### Use Case 5: Retry Failed/Pending Payment from Orders Page
```
1. User goes to Orders page (/orders)
2. User sees order with:
   - paymentMethod: "Online Payment"
   - paymentStatus: "Pending" or "Failure" or "Cancelled"
3. Order card shows "Pay Now" button (green)
4. User clicks "Pay Now"
5. Frontend calls POST /api/payments/initiate with serviceRequestId
6. Backend returns encrypted payment data
7. Frontend submits to CCAvenue
8. User completes payment
9. CCAvenue callback updates paymentStatus to "Success"
10. User redirected to success page
```

### Use Case 6: Cash on Delivery
```
1. User completes service request form
2. User selects "Cash on Delivery"
3. Frontend calls POST /api/submit-service-requests
4. Service request created with paymentMethod: "Cash On Delivery"
5. No payment initiation required
6. Order confirmed immediately
```

### Use Case 7: User Deletes Unpaid Order
```
1. User has order with paymentStatus: "Pending"
2. User decides not to pay
3. User clicks "Delete" on Orders page
4. Order is removed from database
5. No payment required
```

---

## Error Handling

### Frontend Error Handling

```typescript
const handlePaymentFlow = async (serviceRequestId: string) => {
  try {
    // Initiate payment
    const response = await initiatePayment(serviceRequestId);

    if (!response.success) {
      throw new Error(response.description || 'Failed to initiate payment');
    }

    // Validate response
    const { paymentUrl, paymentFormData } = response.content;

    if (!paymentFormData?.encRequest || !paymentFormData?.access_code || !paymentUrl) {
      throw new Error('Invalid payment data received');
    }

    // Submit to CCAvenue
    submitPaymentToCCAvenue({
      paymentUrl,
      encRequest: paymentFormData.encRequest,
      access_code: paymentFormData.access_code
    });

  } catch (error) {
    // Handle specific errors
    switch (error.code) {
      case 'INVALID_SERVICE_REQUEST_ID':
        showError('Invalid order. Please try again.');
        break;
      case 'PAYMENT_ALREADY_COMPLETED':
        showError('Payment already completed for this order.');
        redirectToOrders();
        break;
      case 'INVALID_PAYMENT_METHOD':
        showError('This order is set for Cash on Delivery.');
        break;
      default:
        showError('Payment failed. Please try again.');
    }
  }
};
```

### Backend Error Codes

| Error Code | HTTP Status | Description | User Action |
|------------|-------------|-------------|-------------|
| INVALID_SERVICE_REQUEST_ID | 400 | Invalid order ID format | Check order ID |
| SERVICE_REQUEST_NOT_FOUND | 404 | Order doesn't exist | Contact support |
| INVALID_PAYMENT_METHOD | 400 | Not an online payment order | Use CoD |
| INVALID_TOTAL_PRICE | 400 | Order has no valid price | Contact support |
| PAYMENT_ALREADY_COMPLETED | 400 | Payment already successful | View orders |
| ENCRYPTION_FAILED | 500 | Server error | Retry later |
| MISSING_PAYMENT_RESPONSE | 400 | CCAvenue callback missing data | Retry payment |
| ORDER_ID_NOT_FOUND | 400 | Order ID not in callback | Contact support |

---

## Security Considerations

### 1. Encryption
- All payment data is encrypted using **AES-128-CBC**
- Working key is hashed with **MD5** before use
- Fixed IV as per CCAvenue specifications: `[0x00-0x0f]`

### 2. Environment Variables
Store credentials securely in `.env`:
```env
CCAVENUE_MERCHANT_ID=45990
CCAVENUE_ACCESS_CODE=AVYR05ML69BN93RYNB
CCAVENUE_WORKING_KEY=3975E51578741CE0758A7C8B148F642A
CCAVENUE_PAYMENT_URL=https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction
FRONTEND_URL=https://zushh.com
BACKEND_URL=https://api.zushh.com
```

### 3. HTTPS
- All production endpoints must use HTTPS
- CCAvenue requires secure callbacks

### 4. Input Validation
- MongoDB ObjectId validation on all endpoints
- Payment method verification before initiation
- Amount validation (must be > 0)

### 5. Callback Security
- CCAvenue callback is encrypted
- Only our working key can decrypt the response
- Order ID verification against database

### 6. Session Persistence After Redirect
When user is redirected back from CCAvenue to zushh.com:
- The page loads fresh (full navigation from external domain)
- Auth state (Jotai atoms) resets to initial values
- **Solution**: `useAuth` hook now checks cookies directly as fallback
- Cookies with `sameSite: 'lax'` are preserved during top-level navigations

**Implementation Details:**
```typescript
// useAuth.ts - Fallback cookie check
if (!effectiveIsAuthenticated && typeof window !== 'undefined') {
    const { token, user } = getAuthCookies();
    if (token && user) {
        effectiveUser = user as User;
        effectiveToken = token;
        effectiveIsAuthenticated = true;
    }
}
```

---

## Testing

### Test Card Details (CCAvenue UAE Sandbox)
```
Card Number: 5123450000000008
Expiry Date: 01/39
CVV: 100
```

### Testing Checklist

- [ ] **Successful Payment**
  - Complete payment with test card
  - Verify redirect to success page
  - Check database for paymentStatus: "Success"
  - Verify paymentDetails populated

- [ ] **Failed Payment**
  - Use invalid card/insufficient funds simulation
  - Verify redirect to failure page with reason
  - Check database for paymentStatus: "Failure"
  - Verify failure reason stored

- [ ] **Cancelled Payment**
  - Click cancel on CCAvenue page
  - Verify redirect to cancelled page
  - Check database for paymentStatus: "Cancelled"

- [ ] **Duplicate Payment Prevention**
  - Try to pay for already paid order
  - Should receive PAYMENT_ALREADY_COMPLETED error

- [ ] **Invalid Order**
  - Try to initiate payment with invalid ID
  - Should receive appropriate error

### API Testing with cURL

```bash
# 1. Initiate Payment
curl -X POST https://api.zushh.com/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{"serviceRequestId": "64a1b2c3d4e5f6789abcdef1"}'

# 2. Check Payment Status
curl https://api.zushh.com/api/payments/status/64a1b2c3d4e5f6789abcdef1
```

---

## Database Schema

### ServiceRequest Payment Fields
```javascript
{
  paymentMethod: {
    type: String,
    enum: ["Cash On Delivery", "Online Payment"],
    default: "Cash On Delivery"
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Success", "Failure", "Cancelled"],
    default: "Pending"
  },
  paymentDetails: {
    transactionId: String,        // CCAvenue tracking_id
    orderId: String,              // Our order ID (= serviceRequest._id)
    amount: Number,
    currency: { type: String, default: "AED" },
    paymentDate: Date,
    failureReason: String,
    bankReferenceNumber: String
  }
}
```

---

## File Structure

### Backend (nazam-core)
```
nazam-core/
├── controllers/
│   └── paymentController.js    # Payment API handlers
├── routes/
│   └── payments.js             # Payment route definitions
├── utils/
│   └── ccavenueService.js      # Encryption/decryption service
├── models/
│   └── ServiceRequest.js       # Model with payment fields
└── docs/
    └── CCAVENUE_MOBILE_APP_INTEGRATION.md  # This file
```

### Frontend (nazam)
```
nazam/
├── src/app/
│   ├── _common/
│   │   ├── api.ts              # API functions (initiatePayment, getPaymentStatus)
│   │   ├── paymentUtils.ts     # submitPaymentToCCAvenue utility
│   │   └── interfaces.ts       # TypeScript interfaces (Order with paymentStatus)
│   └── (dashboard)/
│       ├── orders/
│       │   └── page.tsx            # Orders page with Pay Now button & payment status
│       ├── payment/
│       │   ├── success/page.tsx    # Success confirmation page
│       │   ├── failure/page.tsx    # Failure notification page
│       │   └── cancelled/page.tsx  # Cancellation page
│       └── services/
│           └── request/[serviceId]/page.tsx  # Payment flow initiation
```

---

## Summary

The CCAvenue integration provides a secure, reliable payment solution with:
- **AES-128-CBC encryption** for all payment data
- **Multiple payment outcomes** handled (success, failure, cancellation, abandoned)
- **Status tracking** throughout the payment lifecycle
- **Retry mechanism** via "Pay Now" button on Orders page
- **Error handling** with specific error codes
- **WebView compatible** for mobile app integration

For mobile apps, use the WebView approach to load the payment form and intercept navigation events to detect payment completion. The backend handles all encryption, decryption, and status updates automatically.
