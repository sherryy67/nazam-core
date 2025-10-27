# Service Request Pricing API Documentation

## Overview
The Service Request API has been updated to support unit-based pricing calculations. Users can now specify the number of units or hours they need, and the system will automatically calculate the total price based on the service's unit type and base price.

## Updated Endpoint

### POST `/api/submit-service-requests`

Submit a service request with unit-based pricing.

## Request Format

### Required Fields
- `user_name` (string): User's full name
- `user_phone` (string): User's phone number
- `user_email` (string): User's email address
- `address` (string): Service address
- `service_id` (ObjectId): ID of the service
- `service_name` (string): Name of the service
- `category_id` (ObjectId): ID of the category
- `category_name` (string): Name of the category
- `request_type` (string): Type of request (`Quotation`, `OnTime`, `Scheduled`)
- `requested_date` (ISO 8601 date): When the service is needed
- `number_of_units` (integer): Number of units or hours needed (minimum: 1)

### Optional Fields
- `message` (string): Additional message (max 1000 characters)

### Example Request

```json
{
  "user_name": "John Doe",
  "user_phone": "+971501234567",
  "user_email": "john.doe@example.com",
  "address": "123 Main Street, Dubai, UAE",
  "service_id": "64a1b2c3d4e5f6789abcdef1",
  "service_name": "Cleaning Service",
  "category_id": "64a1b2c3d4e5f6789abcdef2",
  "category_name": "Cleaning",
  "request_type": "OnTime",
  "requested_date": "2024-01-15T10:00:00.000Z",
  "number_of_units": 3,
  "message": "Need cleaning service for 3 rooms"
}
```

## Pricing Logic

### Unit Types
The system supports two unit types based on the service configuration:

1. **`per_unit`**: Price is calculated per unit/item
2. **`per_hour`**: Price is calculated per hour

### Price Calculation
```
Total Price = Unit Price × Number of Units
```

Where:
- **Unit Price** = Service's `basePrice`
- **Number of Units** = User-specified `number_of_units`

### Examples

#### Per Unit Service (e.g., Cleaning)
- Service base price: $50 per room
- User requests: 3 rooms
- Calculation: $50 × 3 = $150
- Total price: $150

#### Per Hour Service (e.g., Plumbing)
- Service base price: $80 per hour
- User requests: 2 hours
- Calculation: $80 × 2 = $160
- Total price: $160

## Response Format

### Success Response (201)

```json
{
  "success": true,
  "exception": null,
  "description": "Service request submitted successfully",
  "content": {
    "serviceRequest": {
      "_id": "64a1b2c3d4e5f6789abcdef5",
      "user_name": "John Doe",
      "user_phone": "+971501234567",
      "user_email": "john.doe@example.com",
      "address": "123 Main Street, Dubai, UAE",
      "service_id": "64a1b2c3d4e5f6789abcdef1",
      "service_name": "Cleaning Service",
      "category_id": "64a1b2c3d4e5f6789abcdef2",
      "category_name": "Cleaning",
      "request_type": "OnTime",
      "requested_date": "2024-01-15T10:00:00.000Z",
      "message": "Need cleaning service for 3 rooms",
      "status": "Pending",
      "unit_type": "per_unit",
      "unit_price": 50,
      "number_of_units": 3,
      "total_price": 150,
      "createdAt": "2024-01-14T10:30:00.000Z",
      "updatedAt": "2024-01-14T10:30:00.000Z"
    }
  }
}
```

### Error Response (400)

```json
{
  "success": false,
  "exception": "INVALID_NUMBER_OF_UNITS",
  "description": "Number of units must be a positive integer",
  "content": null
}
```

## Validation Rules

### Required Field Validation
- All required fields must be present and non-empty
- `number_of_units` must be a positive integer (minimum: 1)

### Data Type Validation
- `user_email`: Must be a valid email format
- `user_phone`: Must be a valid phone number format
- `requested_date`: Must be a valid ISO 8601 date
- `request_type`: Must be one of `Quotation`, `OnTime`, `Scheduled`
- `number_of_units`: Must be a positive integer

### Business Logic Validation
- Service must exist and be active
- Category must exist and be active
- Requested date cannot be in the past
- Service unit type must be `per_unit` or `per_hour`

## Database Schema Updates

### ServiceRequest Model
New fields added to the ServiceRequest model:

```javascript
{
  // Pricing information
  unit_type: { 
    type: String, 
    enum: ["per_unit", "per_hour"], 
    required: true 
  },
  unit_price: { type: Number, required: true }, // Price per unit or per hour
  number_of_units: { type: Number, required: true }, // Number of units or hours
  total_price: { type: Number, required: true }, // Calculated total price
}
```

## Frontend Integration

### React Example

```jsx
const ServiceRequestForm = () => {
  const [formData, setFormData] = useState({
    user_name: '',
    user_phone: '',
    user_email: '',
    address: '',
    service_id: '',
    service_name: '',
    category_id: '',
    category_name: '',
    request_type: 'OnTime',
    requested_date: '',
    number_of_units: 1,
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/submit-service-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        const request = data.content.serviceRequest;
        console.log('Service request submitted:', request);
        console.log('Pricing details:', {
          unitType: request.unit_type,
          unitPrice: request.unit_price,
          numberOfUnits: request.number_of_units,
          totalPrice: request.total_price
        });
        // Show success message
      } else {
        throw new Error(data.description);
      }
    } catch (error) {
      console.error('Error submitting request:', error.message);
      // Show error message
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <div>
        <label htmlFor="number_of_units">Number of Units/Hours:</label>
        <input 
          type="number" 
          id="number_of_units"
          name="number_of_units" 
          value={formData.number_of_units}
          onChange={(e) => setFormData({...formData, number_of_units: parseInt(e.target.value)})}
          min="1"
          required
        />
      </div>
      
      <button type="submit">Submit Request</button>
    </form>
  );
};
```

## Testing

### Test Script
Use the provided test script to verify the pricing functionality:

```bash
node test-service-request-pricing.js
```

### Test Cases
1. **Per Unit Service**: Submit request with `number_of_units: 3`
2. **Per Hour Service**: Submit request with `number_of_units: 2`
3. **Validation**: Missing `number_of_units` field
4. **Validation**: Invalid `number_of_units` (0 or negative)

## Error Codes

| Error Code | Description |
|------------|-------------|
| `MISSING_REQUIRED_FIELDS` | One or more required fields are missing |
| `INVALID_EMAIL` | Email format is invalid |
| `INVALID_PHONE` | Phone number format is invalid |
| `INVALID_REQUEST_TYPE` | Request type is not valid |
| `INVALID_NUMBER_OF_UNITS` | Number of units is not a positive integer |
| `INVALID_SERVICE` | Service not found or inactive |
| `INVALID_CATEGORY` | Category not found or inactive |
| `INVALID_UNIT_TYPE` | Service unit type is not valid |
| `INVALID_DATE` | Requested date is in the past |

## Migration Notes

### Backward Compatibility
- Legacy fields (`quantity`, `hours`, `totalPrice`) are still present for backward compatibility
- New pricing fields (`unit_type`, `unit_price`, `number_of_units`, `total_price`) are added alongside

### Database Migration
If you have existing service requests, you may need to migrate the data:

```javascript
// Migration script example
const migrateServiceRequests = async () => {
  const requests = await ServiceRequest.find({
    unit_type: { $exists: false }
  });
  
  for (const request of requests) {
    // Set default values for existing requests
    request.unit_type = 'per_unit';
    request.unit_price = request.totalPrice || 0;
    request.number_of_units = request.quantity || 1;
    request.total_price = request.totalPrice || 0;
    
    await request.save();
  }
};
```

## Summary

The Service Request API now supports:
- ✅ **Unit-based pricing** with automatic calculation
- ✅ **Per unit and per hour** pricing models
- ✅ **Validation** for number of units
- ✅ **Complete pricing information** in responses
- ✅ **Backward compatibility** with existing data
- ✅ **Comprehensive error handling**
- ✅ **Updated Swagger documentation**

The system automatically calculates the total price based on the service's unit type and base price, providing transparent pricing for users.
