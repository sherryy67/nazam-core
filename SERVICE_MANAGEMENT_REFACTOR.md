# Service Management Refactor Documentation

## Overview
This document outlines the refactoring of the Service Management flow to support categories, availability, and dynamic form behavior.

## 🗂️ New Features

### 1. Category Management
- **New Model**: `Category` with fields:
  - `name`: String (required, unique)
  - `isActive`: Boolean (default: true)
  - `createdBy`: ObjectId reference to Admin
  - `timestamps`: createdAt, updatedAt

### 2. Enhanced Service Model
The Service model has been updated with the following new fields:

#### Core Fields
- `category_id`: ObjectId reference to Category (required)
- `service_icon`: String (S3 image URL)
- `min_time_required`: Number (1-1440 minutes)
- `availability`: Array of strings (Sun, Mon, Tue, Wed, Thu, Fri, Sat)

#### Dynamic Fields Based on Job Service Type
- `job_service_type`: String (OnTime | Scheduled | Quotation)
- `order_name`: String (required only for Quotation)
- `price_type`: String (30min | 1hr | 1day | fixed) - not for Quotation
- `subservice_type`: String (single | multiple) - not for Quotation

## 🚀 API Endpoints

### Category Endpoints
```
POST   /api/categories          - Create category (Admin only)
GET    /api/categories          - Get active categories
GET    /api/categories/all      - Get all categories (Admin only)
GET    /api/categories/:id      - Get category by ID
PUT    /api/categories/:id      - Update category (Admin only)
DELETE /api/categories/:id     - Delete category (Admin only)
```

### Updated Service Endpoints
```
POST /api/services              - Create service with new fields
GET  /api/services              - Get services with category info
```

## 📋 Form Behavior Logic

### Service Creation Form Fields

#### Always Required
- Service Name
- Description
- Base Price
- Unit Type
- Category (dropdown from Category collection)
- Service Icon (file upload to S3)
- Minimum Time Required
- Availability (multiple checkboxes)
- Job Service Type (radio buttons)

#### Conditional Fields

**When Job Service Type = "Quotation":**
- Show: Order Name input field
- Hide: Price Type and Subservice Type fields

**When Job Service Type = "OnTime" or "Scheduled":**
- Show: Price Type dropdown (30min, 1hr, 1day, fixed)
- Show: Subservice Type dropdown (single, multiple)
- Hide: Order Name field

## 🔧 Implementation Details

### Backend Changes

1. **New Category Model** (`models/Category.js`)
   - Mongoose schema with validation
   - Unique name constraint
   - Soft delete support

2. **Updated Service Model** (`models/Service.js`)
   - Added all new fields with proper validation
   - Conditional required field logic
   - Reference to Category model

3. **Category Controller** (`controllers/categoryController.js`)
   - Full CRUD operations
   - Validation for category usage before deletion
   - Case-insensitive name checking

4. **Updated Service Controller** (`controllers/serviceController.js`)
   - Enhanced validation for new fields
   - Conditional field validation based on job_service_type
   - S3 integration for service icons
   - Category population in responses

5. **New Category Routes** (`routes/categories.js`)
   - Complete route definitions with Swagger documentation
   - Input validation middleware
   - Admin-only operations protection

6. **Updated Service Routes** (`routes/services.js`)
   - Enhanced validation rules
   - Updated Swagger documentation
   - Support for new field structure

### Frontend Integration Points

#### Category Dropdown
```javascript
// Fetch categories for dropdown
const categories = await fetch('/api/categories');
```

#### Service Icon Upload
```javascript
// Upload service icon to S3
const formData = new FormData();
formData.append('serviceImage', file);
formData.append('category_id', categoryId);
// ... other fields
```

#### Dynamic Form Rendering
```javascript
// Show/hide fields based on job_service_type
if (jobServiceType === 'Quotation') {
  // Show order_name field
  // Hide price_type and subservice_type fields
} else {
  // Show price_type and subservice_type fields
  // Hide order_name field
}
```

## 🧪 Testing

### Test Script
A comprehensive test script is provided (`test-new-endpoints.js`) that tests:
- Category creation and retrieval
- Service creation with different job types
- Validation of conditional fields
- API response structure

### Manual Testing Checklist
- [ ] Create category successfully
- [ ] Create OnTime service with price_type and subservice_type
- [ ] Create Scheduled service with price_type and subservice_type
- [ ] Create Quotation service with order_name
- [ ] Verify conditional field validation
- [ ] Test service icon upload to S3
- [ ] Test category dropdown population
- [ ] Test availability day selection
- [ ] Test minimum time required validation

## 📊 Database Schema Changes

### New Collections
```javascript
// Category Collection
{
  _id: ObjectId,
  name: String (unique),
  isActive: Boolean,
  createdBy: ObjectId (ref: Admin),
  createdAt: Date,
  updatedAt: Date
}
```

### Updated Service Collection
```javascript
// Service Collection (new fields added)
{
  // ... existing fields ...
  category_id: ObjectId (ref: Category),
  service_icon: String,
  min_time_required: Number,
  availability: [String],
  job_service_type: String,
  order_name: String, // conditional
  price_type: String, // conditional
  subservice_type: String // conditional
}
```

## 🔒 Security Considerations

1. **Admin-only Operations**: Category and Service creation/updates require admin authentication
2. **Input Validation**: Comprehensive validation for all new fields
3. **File Upload Security**: Image file type validation and size limits
4. **S3 Security**: Proper AWS credentials and bucket permissions

## 🚀 Deployment Notes

1. **Database Migration**: No existing data migration required (new fields are optional for existing services)
2. **Environment Variables**: Ensure AWS S3 credentials are properly configured
3. **API Versioning**: All endpoints maintain backward compatibility
4. **Documentation**: Swagger documentation updated for all new endpoints

## 📝 Usage Examples

### Creating a Category
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Home Cleaning"}'
```

### Creating an OnTime Service
```bash
curl -X POST http://localhost:3000/api/services \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AC Cleaning",
    "description": "Professional AC cleaning",
    "basePrice": 500,
    "unitType": "per_unit",
    "category_id": "CATEGORY_ID",
    "min_time_required": 120,
    "availability": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "job_service_type": "OnTime",
    "price_type": "1hr",
    "subservice_type": "single"
  }'
```

### Creating a Quotation Service
```bash
curl -X POST http://localhost:3000/api/services \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Custom Cleaning",
    "description": "Customized cleaning service",
    "basePrice": 300,
    "unitType": "per_hour",
    "category_id": "CATEGORY_ID",
    "min_time_required": 180,
    "availability": ["Sat", "Sun"],
    "job_service_type": "Quotation",
    "order_name": "Custom Order Request"
  }'
```

## 🎯 Next Steps

1. **Frontend Implementation**: Update admin UI to support new form fields
2. **Testing**: Comprehensive testing of all new functionality
3. **Documentation**: Update API documentation and user guides
4. **Monitoring**: Set up monitoring for new endpoints and functionality
