# Milestone Payments Implementation Guide

## Overview

This guide explains how to implement and use milestone-based payments in the Nazam Core system. Users can now choose to pay in full or break payments into multiple milestones.

## Features

- **Flexible Payment Options**: Users can pay in full or in milestones
- **Sequential Payment Control**: Option to require milestones to be paid in order
- **Payment Link Generation**: Generate unique payment links for each milestone
- **Status Tracking**: Track both payment status and service completion status for each milestone
- **CCAvenue Integration**: Each milestone payment is processed through CCAvenue

## Database Schema

### ServiceRequest Model Updates

The `ServiceRequest` model now includes:

```javascript
{
  // Payment type selection
  paymentType: "full" | "milestone", // Default: "full"

  // Milestone configuration
  requireSequentialPayment: Boolean, // Default: true

  // Milestones array
  milestones: [{
    name: String,                    // e.g., "Initial Deposit"
    description: String,
    amount: Number,                  // Amount in AED
    percentage: Number,              // Percentage of total price (optional)
    order: Number,                   // Sequence (1, 2, 3, etc.)

    // Payment tracking
    paymentStatus: "Pending" | "Success" | "Failure" | "Cancelled",
    paymentDetails: {
      transactionId: String,
      orderId: String,
      amount: Number,
      currency: String,
      paymentDate: Date,
      failureReason: String,
      bankReferenceNumber: String
    },

    // Payment link (optional)
    paymentLink: {
      token: String,
      url: String,
      generatedBy: ObjectId,
      generatedAt: Date,
      expiresAt: Date,
      isExpired: Boolean,
      isUsed: Boolean
    },

    // Service completion tracking
    completionStatus: "NotStarted" | "InProgress" | "Completed",
    completedAt: Date,
    dueDate: Date,
    isRequired: Boolean,
    createdAt: Date
  }]
}
```

## API Endpoints

### 1. Create Milestones

**Endpoint**: `POST /api/milestones/service-requests/:id/milestones`

**Description**: Create milestones for a service request

**Request Body**:
```json
{
  "requireSequentialPayment": true,
  "milestones": [
    {
      "name": "Initial Deposit",
      "description": "20% upfront payment",
      "percentage": 20,
      "order": 1,
      "dueDate": "2026-02-01T00:00:00.000Z",
      "isRequired": true
    },
    {
      "name": "Work Completion",
      "description": "50% upon work completion",
      "percentage": 50,
      "order": 2,
      "isRequired": true
    },
    {
      "name": "Final Payment",
      "description": "30% final payment",
      "percentage": 30,
      "order": 3,
      "isRequired": true
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "exception": null,
  "description": "Milestones created successfully",
  "content": {
    "serviceRequestId": "6789...",
    "paymentType": "milestone",
    "requireSequentialPayment": true,
    "milestones": [...],
    "totalMilestoneAmount": "1000.00",
    "totalPrice": 1000
  }
}
```

**Notes**:
- You can specify either `amount` or `percentage` for each milestone
- Total milestone amounts cannot exceed the service request's total price
- Milestones are automatically sorted by order

### 2. Get Milestones

**Endpoint**: `GET /api/milestones/service-requests/:id/milestones`

**Description**: Get all milestones for a service request

**Response**:
```json
{
  "success": true,
  "exception": null,
  "description": "Milestones retrieved successfully",
  "content": {
    "serviceRequestId": "6789...",
    "paymentType": "milestone",
    "paymentMethod": "Online Payment",
    "totalPrice": 1000,
    "requireSequentialPayment": true,
    "milestones": [...],
    "overallPaymentStatus": "Partially Paid (1/3)"
  }
}
```

### 3. Update Milestone

**Endpoint**: `PUT /api/milestones/service-requests/:id/milestones/:milestoneId`

**Description**: Update milestone details (not payment status)

**Request Body**:
```json
{
  "name": "Updated Milestone Name",
  "description": "Updated description",
  "completionStatus": "InProgress",
  "dueDate": "2026-02-15T00:00:00.000Z"
}
```

**Allowed Fields**: `name`, `description`, `dueDate`, `completionStatus`, `completedAt`, `isRequired`

### 4. Delete Milestone

**Endpoint**: `DELETE /api/milestones/service-requests/:id/milestones/:milestoneId`

**Description**: Delete a milestone (only if not paid)

### 5. Generate Payment Link

**Endpoint**: `POST /api/milestones/service-requests/:id/milestones/:milestoneId/payment-link`

**Description**: Generate a unique payment link for a milestone

**Request Body**:
```json
{
  "expiryHours": 72  // Optional, default: 72 hours
}
```

**Response**:
```json
{
  "success": true,
  "exception": null,
  "description": "Payment link generated successfully",
  "content": {
    "serviceRequestId": "6789...",
    "milestoneId": "abc123...",
    "milestoneName": "Initial Deposit",
    "amount": 200,
    "paymentLink": "https://zushh.com/pay-milestone/abc123xyz...",
    "token": "abc123xyz...",
    "expiresAt": "2026-01-23T12:00:00.000Z"
  }
}
```

### 6. Get Milestone by Token

**Endpoint**: `GET /api/milestones/payment-link/:token`

**Description**: Get milestone details by payment link token (public endpoint)

**Response**:
```json
{
  "success": true,
  "exception": null,
  "description": "Milestone payment details retrieved",
  "content": {
    "canPay": true,
    "blockingMilestone": null,
    "serviceRequest": {
      "_id": "6789...",
      "service_name": "Home Cleaning",
      "user_name": "John Doe",
      "total_price": 1000
    },
    "milestone": {
      "_id": "abc123...",
      "name": "Initial Deposit",
      "amount": 200,
      "order": 1,
      "paymentStatus": "Pending"
    }
  }
}
```

## Payment Flow

### Full Payment Flow

1. User selects "Online Payment" as payment method
2. Frontend calls `POST /api/payments/initiate` with:
   ```json
   {
     "serviceRequestId": "6789..."
   }
   ```
3. User is redirected to CCAvenue payment gateway
4. After payment, CCAvenue calls backend callback
5. Backend updates payment status and redirects user to success/failure page

### Milestone Payment Flow

1. Admin/Vendor creates milestones for a service request
2. Admin generates payment link for first milestone
3. User receives payment link and opens it
4. Frontend calls `GET /api/milestones/payment-link/:token` to get milestone details
5. User clicks "Pay Now"
6. Frontend calls `POST /api/payments/initiate` with:
   ```json
   {
     "serviceRequestId": "6789...",
     "milestoneId": "abc123..."
   }
   ```
7. User is redirected to CCAvenue with milestone-specific amount
8. After payment, CCAvenue calls backend callback
9. Backend updates milestone payment status
10. If all milestones paid, overall payment status becomes "Success"
11. User is redirected to success page with milestone information

## Sequential Payment Enforcement

When `requireSequentialPayment` is `true`:

- Milestone 2 cannot be paid until Milestone 1 is successful
- Milestone 3 cannot be paid until Milestone 2 is successful
- Payment link generation will fail if previous milestones are unpaid
- Payment initiation will fail with error message indicating which milestone must be paid first

## Order ID Format

To differentiate between full and milestone payments:

- **Full Payment**: `{serviceRequestId}` (e.g., `6789abc123def456`)
- **Milestone Payment**: `{serviceRequestId}-M{order}` (e.g., `6789abc123def456-M1`)

This allows tracking which milestone a payment is for during callbacks.

## Frontend Integration

### Display Payment Options

```javascript
// Check if service request has milestones
if (serviceRequest.paymentType === 'milestone') {
  // Show milestone payment UI
  // List all milestones with their status
  // Show payment links for unpaid milestones
} else {
  // Show single payment button
}
```

### Pay Milestone

```javascript
// 1. Get milestone details
const response = await fetch(`/api/milestones/payment-link/${token}`);
const data = await response.json();

// 2. Check if payment is allowed
if (!data.content.canPay) {
  alert(`Please pay "${data.content.blockingMilestone.name}" first`);
  return;
}

// 3. Initiate payment
const paymentResponse = await fetch('/api/payments/initiate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serviceRequestId: data.content.serviceRequest._id,
    milestoneId: data.content.milestone._id
  })
});

const paymentData = await paymentResponse.json();

// 4. Submit to CCAvenue
// Create form and submit with paymentData.content.paymentFormData
```

### Handle Success Page

```javascript
// On success page, check URL params
const params = new URLSearchParams(window.location.search);
const milestoneId = params.get('milestoneId');
const milestoneName = params.get('milestoneName');

if (milestoneId) {
  // Show milestone-specific success message
  alert(`Payment successful for milestone: ${milestoneName}`);
  // Check if there are more milestones to pay
  const response = await fetch(`/api/milestones/service-requests/${serviceRequestId}/milestones`);
  const data = await response.json();
  const nextUnpaid = data.content.milestones.find(m => m.paymentStatus === 'Pending');
  if (nextUnpaid) {
    // Show next milestone payment option
  }
} else {
  // Full payment success
  alert('Full payment successful!');
}
```

## Example Use Cases

### Use Case 1: Construction Project

```javascript
// 30% upfront, 40% mid-way, 30% completion
{
  "milestones": [
    {
      "name": "Project Start",
      "percentage": 30,
      "order": 1,
      "description": "Initial payment to begin work"
    },
    {
      "name": "Mid-Point Inspection",
      "percentage": 40,
      "order": 2,
      "description": "Payment after 50% work completion"
    },
    {
      "name": "Final Completion",
      "percentage": 30,
      "order": 3,
      "description": "Final payment upon project completion"
    }
  ]
}
```

### Use Case 2: Service Subscription

```javascript
// Monthly payments
{
  "requireSequentialPayment": false, // Can pay any month
  "milestones": [
    {
      "name": "Month 1",
      "amount": 500,
      "order": 1,
      "dueDate": "2026-02-01"
    },
    {
      "name": "Month 2",
      "amount": 500,
      "order": 2,
      "dueDate": "2026-03-01"
    },
    {
      "name": "Month 3",
      "amount": 500,
      "order": 3,
      "dueDate": "2026-04-01"
    }
  ]
}
```

## Testing

### Test Scenario 1: Create and Pay Milestones

1. Create a service request with total price 1000 AED
2. Create 3 milestones (20%, 50%, 30%)
3. Generate payment link for first milestone
4. Access payment link and initiate payment
5. Complete payment on CCAvenue test environment
6. Verify milestone 1 is marked as "Success"
7. Try to pay milestone 3 (should fail if sequential payment enabled)
8. Generate payment link for milestone 2
9. Complete milestone 2 payment
10. Complete milestone 3 payment
11. Verify overall payment status is "Success"

### Test Scenario 2: Non-Sequential Payment

1. Create service request with milestones
2. Set `requireSequentialPayment: false`
3. Generate payment link for milestone 3
4. Should allow payment without paying milestones 1 and 2

## Security Considerations

1. **Token Security**: Payment link tokens are 32-byte random hex strings
2. **Link Expiry**: Payment links expire after configured hours (default 72)
3. **Used Links**: Links are marked as used after payment initiation
4. **Sequential Validation**: Backend validates payment order requirements
5. **Amount Validation**: Backend ensures milestone amounts don't exceed total price

## Monitoring

Track these metrics:
- Number of milestone vs full payments
- Average number of milestones per service request
- Milestone payment completion rate
- Time between milestone payments
- Failed milestone payments and reasons

## Troubleshooting

### Issue: "Previous milestone must be paid first"

**Solution**: Ensure `requireSequentialPayment` is set correctly. If sequential payment is required, pay milestones in order.

### Issue: "Payment link expired"

**Solution**: Generate a new payment link with longer expiry time.

### Issue: "Total milestone amount exceeds total price"

**Solution**: Adjust milestone percentages/amounts to equal or be less than total price.

### Issue: Payment callback not updating milestone

**Solution**: Check that `merchant_param1`, `merchant_param2`, and `merchant_param3` are being sent correctly to CCAvenue and returned in the callback.

## Next Steps

1. **Frontend Implementation**: Update frontend to display milestone options
2. **Admin Dashboard**: Add milestone management UI for admins
3. **Notifications**: Send email/SMS notifications for milestone payments
4. **Reporting**: Add milestone payment reports and analytics
5. **Vendor Payouts**: Integrate with vendor payout system based on milestone completion

## Support

For questions or issues, contact the development team or refer to:
- [ServiceRequest Model](./models/ServiceRequest.js)
- [Milestone Controller](./controllers/milestoneController.js)
- [Payment Controller](./controllers/paymentController.js)
- [Milestone Routes](./routes/milestones.js)
