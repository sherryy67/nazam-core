# Payment Link - Quick Start Guide

## What Was Implemented

Admin can now generate secure payment links for service requests and send them directly to users. Users click the link and pay without needing to log into the app.

---

## Quick Usage

### 1. Admin Generates Payment Link

```bash
POST /api/admin/payments/generate-link
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "serviceRequestId": "64a1b2c3d4e5f6789abcdef1",
  "expiryHours": 48
}
```

**Response:**
```json
{
  "success": true,
  "content": {
    "paymentLink": "http://yourapp.com/pay/abc123def456...",
    "token": "abc123def456...",
    "amount": 5000,
    "currency": "AED",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "expiresAt": "2024-01-17T10:30:00.000Z"
  }
}
```

### 2. Send Link to User

Admin sends the `paymentLink` to the user via:
- Email
- SMS
- WhatsApp
- Any messaging platform

### 3. User Clicks Link

User opens: `http://yourapp.com/pay/abc123def456...`

Your frontend calls:
```bash
GET /api/payments/link/abc123def456...
```

**Response:**
```json
{
  "success": true,
  "content": {
    "serviceName": "Website Development",
    "amount": 5000,
    "currency": "AED",
    "customerName": "John Doe",
    "expiresAt": "2024-01-17T10:30:00.000Z"
  }
}
```

### 4. User Initiates Payment

User clicks "Pay Now" button.

Your frontend calls:
```bash
POST /api/payments/link/abc123def456.../initiate
```

**Response:**
```json
{
  "success": true,
  "content": {
    "paymentUrl": "https://secure.ccavenue.ae/...",
    "paymentFormData": {
      "encRequest": "...",
      "access_code": "AVYR05ML69BN93RYNB"
    },
    "orderId": "64a1b2c3d4e5f6789abcdef1",
    "amount": 5000
  }
}
```

### 5. Submit to CCAvenue

Your frontend creates a form and submits:
```html
<form method="post" action="{{paymentUrl}}">
  <input type="hidden" name="encRequest" value="{{encRequest}}" />
  <input type="hidden" name="access_code" value="{{access_code}}" />
  <button type="submit">Pay</button>
</form>
```

### 6. Payment Complete

CCAvenue processes payment → Calls callback → Redirects user to success/failure page

---

## Files Created/Modified

### New Files
1. ✅ `utils/tokenGenerator.js` - Token generation utility
2. ✅ `controllers/paymentLinkController.js` - Payment link logic
3. ✅ `routes/paymentLinks.js` - Payment link routes
4. ✅ `test-payment-link.js` - Test script
5. ✅ `PAYMENT_LINK_API_DOCUMENTATION.md` - Full documentation
6. ✅ `PAYMENT_LINK_QUICK_START.md` - This file

### Modified Files
1. ✅ `models/ServiceRequest.js` - Added paymentLink schema
2. ✅ `routes/index.js` - Added payment link routes

---

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/admin/payments/generate-link` | POST | Admin | Generate payment link |
| `/api/admin/payments/invalidate-link` | POST | Admin | Invalidate payment link |
| `/api/payments/link/:token` | GET | Public | Validate link & get details |
| `/api/payments/link/:token/initiate` | POST | Public | Initiate payment via link |

---

## Testing

### 1. Update Test Script
Open `test-payment-link.js` and update:
```javascript
const ADMIN_TOKEN = 'YOUR_ADMIN_JWT_TOKEN';
const SERVICE_REQUEST_ID = 'YOUR_SERVICE_REQUEST_ID';
```

### 2. Run Test
```bash
node test-payment-link.js
```

### 3. Test with CCAvenue
Use test card:
- Card Number: `5123456789012346`
- CVV: `123`
- Expiry: Any future date

---

## Security Features

✅ **64-character cryptographic token** - Extremely difficult to guess
✅ **Expiration control** - Links expire after configured hours
✅ **Payment validation** - Checks if already paid
✅ **No authentication required** - User doesn't need to log in
✅ **HTTPS recommended** - Protect token in transit

---

## Common Use Cases

### Use Case 1: Send Invoice to Customer
```
1. Admin creates service request
2. Admin generates payment link
3. Admin emails link to customer
4. Customer clicks link and pays
```

### Use Case 2: Quotation Payment
```
1. Customer requests quote
2. Admin sets price
3. Admin generates payment link
4. Customer pays via link
```

### Use Case 3: Resend Payment Link
```
1. Customer lost link
2. Admin regenerates new link
3. Customer receives and pays
```

---

## Next Steps

### For Full Milestone Implementation (Future)
If you want to implement milestone-based payments:
1. Add milestones array to ServiceRequest model
2. Create milestone management endpoints
3. Update payment link to support specific milestones
4. See full plan in previous conversation

### For Email/SMS Integration
1. Set up email service (SendGrid, AWS SES, etc.)
2. Set up SMS service (Twilio, AWS SNS, etc.)
3. Create email/SMS templates
4. Add notification endpoints

---

## Environment Variables

Make sure these are set in `.env`:
```env
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000
CCAVENUE_MERCHANT_ID=your_merchant_id
CCAVENUE_ACCESS_CODE=your_access_code
CCAVENUE_WORKING_KEY=your_working_key
```

---

## Support

- Full API docs: `PAYMENT_LINK_API_DOCUMENTATION.md`
- Test script: `test-payment-link.js`
- Payment flow docs: `MOBILE_PAYMENT_API_DOCUMENTATION.md`

---

## Summary

✅ Payment link generation is **COMPLETE**
✅ Admin can generate links for any service request
✅ Users can pay via link without logging in
✅ Secure token-based authentication
✅ Integrates with existing CCAvenue setup
✅ Ready for testing with test cards

**What's NOT included (for future):**
- Milestone-based payments (can be added later)
- Email/SMS sending (admin manually sends links for now)
- Vendor fund release (not needed as per requirements)
