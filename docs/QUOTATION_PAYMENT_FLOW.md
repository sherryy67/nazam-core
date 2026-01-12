# Quotation Type Service - Payment Flow

## Overview

Quotation type services don't have an upfront price. The admin manually reviews the request, calculates/negotiates the price, and then the user can proceed with payment.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     USER SUBMITS QUOTATION REQUEST                       │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                User selects payment method:
                ┌──────────────┴──────────────┐
                │                             │
        ┌───────▼────────┐          ┌────────▼─────────┐
        │ Cash on        │          │  Online Payment  │
        │ Delivery       │          │                  │
        └───────┬────────┘          └────────┬─────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
        ┌─────────────────────────────────────────────┐
        │  Service Request Created:                   │
        │  - request_type: "Quotation"                │
        │  - total_price: null                        │
        │  - paymentMethod: "CoD" or "Online Payment" │
        │  - paymentStatus: "Pending"                 │
        │  - status: "Pending"                        │
        └─────────────────────────────────────────────┘
                               │
                               ▼
        ┌─────────────────────────────────────────────┐
        │       ADMIN REVIEWS QUOTATION REQUEST       │
        │  - Checks service details                   │
        │  - Calculates price based on requirements   │
        │  - May contact user for clarification       │
        └─────────────────────────────────────────────┘
                               │
                               ▼
        ┌─────────────────────────────────────────────┐
        │      ADMIN UPDATES QUOTATION PRICE          │
        │  PUT /api/admin/service-requests/:id/quote  │
        │  Body: {                                    │
        │    total_price: 500,                        │
        │    unit_price: 500,                         │
        │    status: "Quoted" (optional)              │
        │  }                                          │
        └─────────────────────────────────────────────┘
                               │
                               ▼
        ┌─────────────────────────────────────────────┐
        │         USER RECEIVES NOTIFICATION          │
        │  - Email/SMS: "Your quotation is ready"    │
        │  - Amount: AED 500                          │
        │  - Link to view order                       │
        └─────────────────────────────────────────────┘
                               │
                               ▼
        ┌─────────────────────────────────────────────┐
        │       USER VIEWS ORDER ON /orders PAGE      │
        │  - Sees updated price                       │
        │  - Sees payment status                      │
        └─────────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
        ┌───────▼────────┐          ┌────────▼─────────┐
        │ Cash on        │          │  Online Payment  │
        │ Delivery       │          │                  │
        └───────┬────────┘          └────────┬─────────┘
                │                             │
                │                             ▼
                │              ┌─────────────────────────┐
                │              │ "Pay Now" button appears│
                │              │ (since total_price > 0) │
                │              └──────────┬──────────────┘
                │                         │
                │                         ▼
                │              ┌─────────────────────────┐
                │              │  Payment gateway flow   │
                │              │  (CCAvenue)             │
                │              └──────────┬──────────────┘
                │                         │
                │                         ▼
                │              ┌─────────────────────────┐
                │              │ paymentStatus: "Success"│
                │              └──────────┬──────────────┘
                │                         │
                └─────────────────────────┘
                               │
                               ▼
        ┌─────────────────────────────────────────────┐
        │         ORDER CONFIRMED & SCHEDULED         │
        │  - Admin assigns vendor                     │
        │  - Service gets delivered                   │
        └─────────────────────────────────────────────┘
```

## API Endpoints

### 1. User Submits Quotation Request
**POST** `/api/submit-service-requests`

**Request:**
```json
{
  "user_name": "John Doe",
  "user_phone": "+971501234567",
  "user_email": "john@example.com",
  "address": "Business Bay, Dubai",
  "service_id": "694980f67c24ffa5f79963eb",
  "service_name": "CUSTOM RENOVATION",
  "category_id": "69568d8c2e785ff7bee8e724",
  "category_name": "INTERIOR RENOVATIONS",
  "request_type": "Quotation",
  "requested_date": "2026-01-20T10:00:00.000Z",
  "number_of_units": 1,
  "message": "Need full kitchen renovation with marble countertops",
  "payment_method": "Online Payment"
}
```

**Response:**
```json
{
  "success": true,
  "content": {
    "serviceRequest": {
      "_id": "69626a4167820cd0914bc087",
      "request_type": "Quotation",
      "total_price": null,
      "paymentMethod": "Online Payment",
      "paymentStatus": "Pending",
      "status": "Pending"
    }
  }
}
```

---

### 2. Admin Updates Quotation Price
**PUT** `/api/admin/service-requests/:id/quote`

**Request:**
```json
{
  "total_price": 5000,
  "unit_price": 5000,
  "status": "Quoted",
  "admin_notes": "Price includes materials and labor for 2-day project"
}
```

**Response:**
```json
{
  "success": true,
  "content": {
    "serviceRequest": {
      "_id": "69626a4167820cd0914bc087",
      "request_type": "Quotation",
      "total_price": 5000,
      "unit_price": 5000,
      "paymentMethod": "Online Payment",
      "paymentStatus": "Pending",
      "status": "Quoted"
    }
  }
}
```

---

### 3. User Views Orders
**GET** `/api/user/orders`

Now the order shows with `total_price: 5000`, and:
- **If CoD**: Shows "Confirm Order" button
- **If Online Payment**: Shows "Pay Now" button (handled by existing flow)

---

## Frontend Implementation

### Orders Page - Quotation Handling

```typescript
const isQuotationReady = (order: Order) => {
  return (
    order.request_type === "Quotation" &&
    order.total_price !== null &&
    order.total_price > 0
  );
};

const isQuotationPending = (order: Order) => {
  return (
    order.request_type === "Quotation" &&
    (order.total_price === null || order.total_price === 0)
  );
};

// In the order card:
{isQuotationPending(order) && (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
    <AlertCircle className="inline h-4 w-4 text-yellow-600 mr-2" />
    <span className="text-yellow-800">
      Quotation pending. Our team will contact you soon with a price.
    </span>
  </div>
)}

{isQuotationReady(order) && order.paymentMethod === "Online Payment" && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm mb-3">
    <CheckCircle className="inline h-4 w-4 text-green-600 mr-2" />
    <span className="text-green-800">
      Quotation ready: AED {order.total_price}
    </span>
  </div>
)}

{needsPayment(order) && (
  <button onClick={() => handlePayNow(order)}>
    <CreditCard size={16} />
    Pay Now - AED {order.total_price}
  </button>
)}

{isQuotationReady(order) && order.paymentMethod === "Cash on Delivery" && (
  <button onClick={() => handleConfirmQuotation(order)}>
    <CheckCircle size={16} />
    Confirm Quotation - AED {order.total_price}
  </button>
)}
```

---

## Backend Controller Addition

Add this to `serviceRequestController.js`:

```javascript
/**
 * @desc    Update quotation price (Admin only)
 * @route   PUT /api/admin/service-requests/:id/quote
 * @access  Admin only
 */
const updateQuotationPrice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { total_price, unit_price, status, admin_notes } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid service request ID format', 'INVALID_ID_FORMAT');
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findById(id);
    if (!serviceRequest) {
      return sendError(res, 404, 'Service request not found', 'SERVICE_REQUEST_NOT_FOUND');
    }

    // Validate it's a quotation type
    if (serviceRequest.request_type !== 'Quotation') {
      return sendError(
        res,
        400,
        'This endpoint is only for Quotation type requests',
        'NOT_QUOTATION_TYPE'
      );
    }

    // Validate price
    if (!total_price || total_price <= 0) {
      return sendError(res, 400, 'Total price must be greater than 0', 'INVALID_PRICE');
    }

    // Update quotation
    serviceRequest.total_price = Number(total_price);
    serviceRequest.unit_price = unit_price ? Number(unit_price) : Number(total_price);

    if (status) {
      serviceRequest.status = status; // e.g., "Quoted"
    }

    if (admin_notes) {
      serviceRequest.admin_notes = admin_notes;
    }

    await serviceRequest.save();

    // TODO: Send notification to user (email/SMS)
    // notificationService.sendQuotationReady(serviceRequest);

    return res.status(200).json({
      success: true,
      exception: null,
      description: 'Quotation price updated successfully',
      content: {
        serviceRequest: {
          _id: serviceRequest._id,
          request_type: serviceRequest.request_type,
          total_price: serviceRequest.total_price,
          unit_price: serviceRequest.unit_price,
          paymentMethod: serviceRequest.paymentMethod,
          paymentStatus: serviceRequest.paymentStatus,
          status: serviceRequest.status,
          user_email: serviceRequest.user_email,
          user_phone: serviceRequest.user_phone
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // ... existing exports
  updateQuotationPrice
};
```

---

## Payment Rules for Quotations

### ✅ When "Pay Now" Button Appears:
1. `request_type === "Quotation"`
2. `total_price !== null && total_price > 0` (Admin has set price)
3. `paymentMethod === "Online Payment"`
4. `paymentStatus !== "Success"`
5. `status !== "Cancelled"`

### ✅ When "Confirm Order" Button Appears (CoD):
1. `request_type === "Quotation"`
2. `total_price !== null && total_price > 0` (Admin has set price)
3. `paymentMethod === "Cash on Delivery"`
4. `status === "Quoted" || status === "Pending"`

### ⏳ When "Pending Quotation" Message Shows:
1. `request_type === "Quotation"`
2. `total_price === null || total_price === 0` (Admin hasn't set price yet)

---

## Database Schema Updates

Add optional field to ServiceRequest model:

```javascript
admin_notes: {
  type: String,
  default: ''
},
status: {
  type: String,
  enum: ['Pending', 'Quoted', 'Assigned', 'Accepted', 'InProgress', 'Completed', 'Cancelled'],
  default: 'Pending'
}
```

The **"Quoted"** status indicates that admin has reviewed and provided a price for the quotation.

---

## Mobile App Considerations

### For React Native WebView:
- Show quotation status clearly on orders list
- Push notification when quotation is ready
- Deep link to open order detail with "Pay Now" button

### For Native Implementation:
```typescript
// Check if quotation needs admin review
if (order.request_type === 'Quotation' && !order.total_price) {
  showPendingQuotationUI();
}

// Check if quotation is ready for payment
if (order.request_type === 'Quotation' && order.total_price > 0) {
  if (order.paymentMethod === 'Online Payment') {
    showPayNowButton();
  } else {
    showConfirmOrderButton();
  }
}
```

---

## Notification Templates

### Email to User (Quotation Ready):
```
Subject: Your Quotation is Ready - AED 5,000

Hi John,

Good news! We've reviewed your request for CUSTOM RENOVATION.

Quoted Price: AED 5,000
Service: CUSTOM RENOVATION
Requested Date: Jan 20, 2026

[View Details & Pay Now]
[View Details & Confirm] (for CoD)

Thank you for choosing ZUSH!
```

### SMS to User:
```
ZUSH: Your quotation is ready. Amount: AED 5,000.
View & pay: https://zushh.com/orders
```

---

## Testing Scenarios

### Scenario 1: Quotation with Online Payment
1. User submits quotation request with "Online Payment"
2. Admin sets price via `/api/admin/service-requests/:id/quote`
3. User sees "Pay Now" button on orders page
4. User completes payment via CCAvenue
5. Order status changes to confirmed

### Scenario 2: Quotation with CoD
1. User submits quotation request with "Cash on Delivery"
2. Admin sets price
3. User sees "Confirm Order" button
4. User confirms → Order is scheduled
5. Payment collected upon service delivery

### Scenario 3: User Changes Mind
1. User submits quotation with Online Payment
2. Admin sets price
3. User changes payment method to CoD via order edit
4. User confirms instead of paying online

---

## Summary

For **Quotation type services**:
- ✅ User CAN select payment method during request submission
- ✅ Order is created with `total_price = null`
- ✅ Admin reviews and sets price via new endpoint
- ✅ User receives notification when quotation is ready
- ✅ "Pay Now" button appears ONLY after admin sets price
- ✅ For CoD, user confirms the quotation
- ✅ No payment gateway initiated until price is set
