# Vendor Creation with ServiceId Update

## Overview
The vendor creation endpoint has been updated to use `serviceId` instead of `jobService`. This change provides better data integrity by referencing actual services from the Service model rather than using free-text job service names.

## Changes Made

### 1. Vendor Model Update (`models/Vendor.js`)

**Before:**
```javascript
jobService: { type: String, required: true }, // plumber, electrician etc.
```

**After:**
```javascript
serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true }, // reference to Service model
```

### 2. Controller Updates (`controllers/authController.js`)

#### Required Fields Validation
**Before:**
```javascript
const requiredFields = ['firstName', 'lastName', 'email', 'password', 'type', 'coveredCity', 'jobService', 'countryCode', 'mobileNumber', 'idType', 'idNumber'];
```

**After:**
```javascript
const requiredFields = ['firstName', 'lastName', 'email', 'password', 'type', 'coveredCity', 'serviceId', 'countryCode', 'mobileNumber', 'idType', 'idNumber'];
```

#### Service Validation
**Added service validation:**
```javascript
// Validate serviceId exists and is active
const Service = require('../models/Service');
const service = await Service.findById(req.body.serviceId);
if (!service || !service.isActive) {
  return sendError(res, 400, 'Invalid or inactive service', 'INVALID_SERVICE');
}
```

#### Vendor Data Object
**Before:**
```javascript
const vendorData = {
  // ...
  jobService: req.body.jobService,
  // ...
};
```

**After:**
```javascript
const vendorData = {
  // ...
  serviceId: req.body.serviceId,
  // ...
};
```

### 3. Route Validation Updates (`routes/auth.js`)

#### Validation Rules
**Before:**
```javascript
body('jobService')
  .notEmpty()
  .withMessage('Job service is required'),
```

**After:**
```javascript
body('serviceId')
  .isMongoId()
  .withMessage('Service ID must be a valid MongoDB ObjectId'),
```

#### Swagger Documentation
**Before:**
```yaml
required:
  - jobService
properties:
  jobService:
    type: string
    example: "Plumber"
```

**After:**
```yaml
required:
  - serviceId
properties:
  serviceId:
    type: string
    example: "64a1b2c3d4e5f6789abcdef1"
```

## API Usage

### Updated Request Format

**POST `/api/auth/admin/create-vendor`**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "type": "Individual",
  "coveredCity": "Dubai",
  "serviceId": "64a1b2c3d4e5f6789abcdef1",
  "countryCode": "+971",
  "mobileNumber": "501234567",
  "idType": "EmiratesID",
  "idNumber": "784-1234-5678901-2",
  "company": "Doe Services",
  "gender": "Male",
  "experience": "5",
  "address": "123 Main Street, Dubai",
  "city": "Dubai",
  "country": "UAE",
  "pinCode": "12345",
  "vatRegistration": "false",
  "collectTax": "false"
}
```

### Response Format

```json
{
  "success": true,
  "exception": null,
  "description": "Vendor created successfully",
  "content": {
    "vendor": {
      "_id": "64a1b2c3d4e5f6789abcdef2",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "type": "Individual",
      "coveredCity": "Dubai",
      "serviceId": "64a1b2c3d4e5f6789abcdef1",
      "countryCode": "+971",
      "mobileNumber": "501234567",
      "idType": "EmiratesID",
      "idNumber": "784-1234-5678901-2",
      "approved": true,
      "role": 2,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Benefits of the Change

### ✅ **Data Integrity**
- References actual services from the Service model
- Prevents typos and inconsistent service names
- Ensures vendors are associated with valid, active services

### ✅ **Better Data Relationships**
- Establishes proper foreign key relationship
- Enables service-based queries and filtering
- Supports service-specific vendor management

### ✅ **Validation**
- Validates serviceId is a valid MongoDB ObjectId
- Ensures the service exists and is active
- Prevents creation of vendors with invalid services

### ✅ **Consistency**
- Aligns with other model relationships in the system
- Follows MongoDB best practices for references
- Maintains data consistency across the application

## Frontend Integration

### Service Selection Component

```jsx
const ServiceSelector = ({ onServiceSelect, selectedServiceId }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services/active');
        const data = await response.json();
        
        if (data.success) {
          setServices(data.content.services);
        }
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (loading) return <div>Loading services...</div>;

  return (
    <select 
      value={selectedServiceId} 
      onChange={(e) => onServiceSelect(e.target.value)}
      required
    >
      <option value="">Select a Service</option>
      {services.map(service => (
        <option key={service._id} value={service._id}>
          {service.name} - ${service.basePrice} per {service.unitType}
          {service.category_id?.name && ` (${service.category_id.name})`}
        </option>
      ))}
    </select>
  );
};
```

### Vendor Creation Form

```jsx
const VendorCreationForm = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    type: 'Individual',
    coveredCity: '',
    serviceId: '', // Now using serviceId
    countryCode: '+971',
    mobileNumber: '',
    idType: 'EmiratesID',
    idNumber: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    
    // Add all form fields
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });
    
    try {
      const response = await fetch('/api/auth/admin/create-vendor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Vendor created:', data.content.vendor);
        // Show success message
      } else {
        throw new Error(data.description);
      }
    } catch (error) {
      console.error('Error creating vendor:', error.message);
      // Show error message
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="text" 
        name="firstName" 
        value={formData.firstName}
        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
        placeholder="First Name"
        required
      />
      
      <ServiceSelector 
        selectedServiceId={formData.serviceId}
        onServiceSelect={(serviceId) => setFormData({...formData, serviceId})}
      />
      
      <button type="submit">Create Vendor</button>
    </form>
  );
};
```

## Migration Considerations

### Existing Data
If you have existing vendors with `jobService` field, you may need to migrate the data:

```javascript
// Migration script example
const migrateVendorJobServices = async () => {
  const vendors = await Vendor.find({ serviceId: { $exists: false } });
  
  for (const vendor of vendors) {
    // Find matching service by name
    const service = await Service.findOne({ 
      name: { $regex: vendor.jobService, $options: 'i' } 
    });
    
    if (service) {
      vendor.serviceId = service._id;
      await vendor.save();
      console.log(`Migrated vendor ${vendor.firstName} ${vendor.lastName} to service ${service.name}`);
    } else {
      console.log(`No matching service found for vendor ${vendor.firstName} ${vendor.lastName} with jobService: ${vendor.jobService}`);
    }
  }
};
```

### Backward Compatibility
- The old `jobService` field can be kept for backward compatibility
- New vendors will use `serviceId`
- Existing vendors can be migrated gradually

## Error Handling

### Common Errors

1. **"Service ID must be a valid MongoDB ObjectId"**
   - **Cause**: Invalid serviceId format
   - **Solution**: Use a valid MongoDB ObjectId

2. **"Invalid or inactive service"**
   - **Cause**: Service doesn't exist or is inactive
   - **Solution**: Use an active service ID

3. **"Missing required fields: serviceId"**
   - **Cause**: serviceId not provided
   - **Solution**: Include serviceId in the request

## Testing

### Test Script
Use the provided test script to verify the changes:

```bash
node test-vendor-serviceid.js
```

### Manual Testing

```bash
# Test with valid serviceId
curl -X POST "http://localhost:3001/api/auth/admin/create-vendor" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "email=john.doe@example.com" \
  -F "password=password123" \
  -F "type=Individual" \
  -F "coveredCity=Dubai" \
  -F "serviceId=64a1b2c3d4e5f6789abcdef1" \
  -F "countryCode=+971" \
  -F "mobileNumber=501234567" \
  -F "idType=EmiratesID" \
  -F "idNumber=784-1234-5678901-2"
```

## Summary

The vendor creation endpoint has been successfully updated to use `serviceId` instead of `jobService`:

- ✅ **Model Updated**: Vendor model now references Service model
- ✅ **Validation Added**: ServiceId validation and service existence check
- ✅ **Routes Updated**: Validation rules and Swagger documentation
- ✅ **Controller Updated**: Both admin and regular vendor creation
- ✅ **Error Handling**: Proper error messages for invalid services
- ✅ **Testing**: Comprehensive test script provided

This change improves data integrity and establishes proper relationships between vendors and services in the system.
