# User Account Linking for Payment Links & Service Requests

## Overview

This document explains how service requests and payments are automatically linked to user accounts, ensuring that all orders appear in the user's account history.

---

## How It Works

### 1. Service Request Creation

When a service request is submitted (via `/api/submit-service-requests`):

1. **User lookup** - The system searches for an existing user account matching:
   - Email address (user_email)
   - Phone number (user_phone)

2. **Automatic linking** - If a user account is found:
   - The service request's `user` field is set to the user's ID
   - The order automatically appears in that user's account

3. **Guest orders** - If no user account exists:
   - The service request is created without a `user` reference
   - Order is still tracked by email/phone
   - If user registers later with same email/phone, they'll see the order

### Code Implementation

```javascript
// In submitServiceRequest controller
const User = require('../models/User');
const existingUser = await User.findOne({
  $or: [
    { email: user_email.trim().toLowerCase() },
    { phoneNumber: user_phone.trim() }
  ]
});

const serviceRequestData = {
  // ... other fields
  user: existingUser ? existingUser._id : undefined
};
```

---

### 2. Payment Link Generation

When an admin generates a payment link (via `/api/admin/payments/generate-link`):

1. **User lookup** - The system checks if the service request is already linked to a user
2. **Link if not linked** - If no user is linked yet, it searches for a user matching:
   - Email address
   - Phone number
3. **Update service request** - If found, links the service request to that user

### Code Implementation

```javascript
// In generatePaymentLink controller
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
```

---

### 3. Payment Initiation via Link

When a user initiates payment through a payment link (via `/api/payments/link/:token/initiate`):

1. **User lookup** - Same as payment link generation
2. **Link before payment** - Ensures user is linked before payment is processed
3. **Order appears in account** - User can see the order immediately in their account

### Code Implementation

```javascript
// In initiatePaymentViaLink controller
if (!serviceRequest.user) {
  const user = await User.findOne({
    $or: [
      { email: serviceRequest.user_email },
      { phoneNumber: serviceRequest.user_phone }
    ]
  });

  if (user) {
    serviceRequest.user = user._id;
    // Will be saved with payment details
  }
}
```

---

### 4. Viewing User Orders

Users can view all their orders via `/api/users/orders`:

1. **Multi-criteria search** - Finds service requests matching:
   - Direct user reference (`user` field)
   - Email address (`user_email` field)
   - Phone number (`user_phone` field)

2. **Includes all orders** - Returns orders created:
   - Before registration (matched by email/phone)
   - After registration (matched by user ID)
   - Via payment links (automatically linked)

### Code Implementation

```javascript
// In getUserOrderHistory controller
const query = {
  $or: [
    { user: userId }, // Direct user reference
    { user_email: user.email.toLowerCase() },
    { user_phone: user.phoneNumber }
  ]
};

const serviceRequests = await ServiceRequest.find(query)
  .populate('service_id')
  .populate('category_id')
  .populate('vendor')
  .sort({ createdAt: -1 });
```

---

## User Flow Examples

### Example 1: User Registers First, Then Orders

```
1. User registers account
   - Email: john@example.com
   - Phone: +971-50-123-4567

2. User submits service request
   - System finds existing user account
   - Links service request to user._id
   - Order appears in user's account immediately

3. User views orders at /api/users/orders
   - Sees the order
```

### Example 2: User Orders First, Then Registers

```
1. Guest submits service request (no account)
   - Email: jane@example.com
   - Phone: +971-50-987-6543
   - No user reference (guest order)

2. Admin generates payment link
   - System checks for user account
   - No user found yet
   - Payment link works without user link

3. User registers account
   - Email: jane@example.com
   - Phone: +971-50-987-6543

4. User views orders at /api/users/orders
   - Query matches by email/phone
   - Sees the guest order!
```

### Example 3: Admin Creates Order and Sends Payment Link

```
1. Admin creates service request for customer
   - Email: customer@example.com
   - Phone: +971-50-111-2222

2. Admin generates payment link
   - System finds user by email
   - Links service request to user._id
   - Saves the link

3. Customer clicks payment link and pays
   - Payment is processed
   - Order is already linked to user

4. Customer logs into app
   - Views /api/users/orders
   - Sees the order with payment status "Success"
```

### Example 4: Payment Link for Guest Order

```
1. Guest submits service request (quotation)
   - Email: guest@example.com (no account)
   - Total price: null

2. Admin sets price and generates payment link
   - System checks for user account
   - No user found
   - Payment link still generated

3. Guest clicks link and pays
   - Payment successful
   - Service request still not linked to user

4. Guest later registers with same email
   - Creates account: guest@example.com

5. Guest views orders
   - Query matches by email
   - Sees the previous order!
```

---

## API Endpoints Summary

### For Users

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/users/orders` | GET | View all orders (past and present) |
| `/api/submit-service-requests` | POST | Create new service request |
| `/api/payments/link/:token` | GET | View payment link details |
| `/api/payments/link/:token/initiate` | POST | Pay via payment link |

### For Admins

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/payments/generate-link` | POST | Generate payment link for order |
| `/api/admin/payments/invalidate-link` | POST | Cancel/expire payment link |

---

## Database Schema

### ServiceRequest Model

```javascript
{
  // User identification (multiple methods)
  user: ObjectId, // Reference to User model (if linked)
  user_name: String, // Always present
  user_email: String, // Always present
  user_phone: String, // Always present

  // Service details
  service_id: ObjectId,
  service_name: String,
  category_id: ObjectId,
  category_name: String,

  // Payment information
  paymentMethod: String,
  paymentStatus: String,
  paymentDetails: {
    transactionId: String,
    amount: Number,
    // ...
  },

  // Payment link (if generated)
  paymentLink: {
    token: String,
    url: String,
    expiresAt: Date,
    // ...
  }
}
```

### User Model

```javascript
{
  name: String,
  email: String, // Unique
  phoneNumber: String, // Unique
  password: String,
  // ...
}
```

---

## Matching Logic

### User Lookup Query

```javascript
const user = await User.findOne({
  $or: [
    { email: serviceRequest.user_email },
    { phoneNumber: serviceRequest.user_phone }
  ]
});
```

### Order Retrieval Query

```javascript
const orders = await ServiceRequest.find({
  $or: [
    { user: userId }, // Direct reference
    { user_email: user.email },
    { user_phone: user.phoneNumber }
  ]
});
```

---

## Benefits

✅ **Seamless Experience** - Users see all orders automatically, even those placed before registration

✅ **Guest Checkout Support** - Users don't need an account to place orders

✅ **Automatic Linking** - No manual intervention needed to link orders to accounts

✅ **Payment Link Flexibility** - Works for both registered users and guests

✅ **Historical Data** - Users see complete order history when they register

---

## Important Notes

1. **Email/Phone Matching** - Orders are matched by exact email or phone number
   - Email matching is case-insensitive
   - Phone number must match exactly

2. **User field is optional** - Service requests can exist without a user reference
   - Allows guest orders
   - Orders are still accessible via email/phone matching

3. **Automatic Linking Points** - User linking happens at:
   - Service request creation (if user exists)
   - Payment link generation (if user exists)
   - Payment initiation (if user exists)

4. **Payment Status** - Included in order history response
   - Users can see payment status for each order
   - Payment details included if payment was made

---

## Testing

### Test Scenario 1: Registered User Places Order

```bash
# 1. User registers
POST /api/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "phoneNumber": "+971501234567",
  "password": "password123"
}

# 2. User creates service request
POST /api/submit-service-requests
{
  "user_email": "test@example.com",
  "user_phone": "+971501234567",
  // ... other fields
}
# Result: Service request automatically linked to user

# 3. User views orders
GET /api/users/orders
Authorization: Bearer USER_JWT_TOKEN
# Result: Order appears in list
```

### Test Scenario 2: Guest Order Later Visible After Registration

```bash
# 1. Guest creates service request (no auth)
POST /api/submit-service-requests
{
  "user_email": "newuser@example.com",
  "user_phone": "+971509876543",
  // ... other fields
}
# Result: Service request created without user link

# 2. Admin generates payment link
POST /api/admin/payments/generate-link
{
  "serviceRequestId": "SERVICE_REQUEST_ID"
}
# Result: Payment link generated (no user found yet)

# 3. User registers
POST /api/auth/register
{
  "email": "newuser@example.com",
  "phoneNumber": "+971509876543",
  "password": "password123"
}

# 4. User views orders
GET /api/users/orders
Authorization: Bearer USER_JWT_TOKEN
# Result: Guest order appears in list (matched by email/phone)!
```

---

## Troubleshooting

### Issue: Order not appearing in user account

**Possible causes:**
1. Email/phone mismatch
   - Check email is exact match (case-insensitive)
   - Check phone number is exact match

2. User not logged in
   - Ensure valid JWT token is provided

3. Service request doesn't exist
   - Verify service request ID is correct

### Solution:
```bash
# Check service request details
GET /api/service-requests/:id/details

# Verify user email/phone matches
GET /api/users/profile
```

---

## Future Enhancements

Potential improvements:

1. **Phone Number Normalization** - Auto-format phone numbers for better matching
2. **Email Verification** - Verify email before linking orders
3. **Manual Linking** - Admin can manually link orders to users
4. **Order Transfer** - Move orders from one user to another
5. **Duplicate Detection** - Detect and merge duplicate orders

---

## Summary

✅ **Service requests automatically link to users** by email/phone
✅ **Payment links preserve user linkage** when generated
✅ **Guest orders appear after registration** via email/phone matching
✅ **Users see complete order history** including pre-registration orders
✅ **No manual linking required** - everything is automatic

The system ensures a seamless experience for both registered users and guests, while maintaining complete order history tracking.
