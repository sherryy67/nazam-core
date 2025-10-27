# Get All Active Services API Documentation

## Overview
The Get All Active Services API provides a public endpoint to retrieve all services that are currently active in the system. This endpoint is useful for displaying available services to users without requiring authentication.

## Endpoint

### GET `/api/services/active`

Get all active services (Public endpoint - no authentication required).

## Request

### Method
`GET`

### URL
```
GET /api/services/active
```

### Headers
```
Content-Type: application/json
```

### Parameters
None required. This endpoint returns all active services without any filters.

## Response

### Success Response (200)

```json
{
  "success": true,
  "exception": null,
  "description": "All active services retrieved successfully",
  "content": {
    "services": [
      {
        "_id": "64a1b2c3d4e5f6789abcdef1",
        "name": "Emergency Plumbing",
        "description": "24/7 emergency plumbing services",
        "basePrice": 80,
        "unitType": "per_hour",
        "imageUri": "https://example.com/plumbing.jpg",
        "service_icon": "https://s3.amazonaws.com/bucket/plumbing-icon.png",
        "category_id": {
          "_id": "64a1b2c3d4e5f6789abcdef2",
          "name": "Plumbing",
          "description": "Plumbing services"
        },
        "min_time_required": 60,
        "availability": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "job_service_type": "OnTime",
        "order_name": null,
        "price_type": "1hr",
        "subservice_type": "single",
        "isActive": true,
        "createdBy": {
          "_id": "64a1b2c3d4e5f6789abcdef3",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "createdAt": "2024-01-14T10:30:00.000Z",
        "updatedAt": "2024-01-14T10:30:00.000Z"
      },
      {
        "_id": "64a1b2c3d4e5f6789abcdef4",
        "name": "House Cleaning",
        "description": "Professional house cleaning services",
        "basePrice": 50,
        "unitType": "per_unit",
        "imageUri": "https://example.com/cleaning.jpg",
        "service_icon": "https://s3.amazonaws.com/bucket/cleaning-icon.png",
        "category_id": {
          "_id": "64a1b2c3d4e5f6789abcdef5",
          "name": "Cleaning",
          "description": "Cleaning services"
        },
        "min_time_required": 120,
        "availability": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "job_service_type": "Scheduled",
        "order_name": null,
        "price_type": "1day",
        "subservice_type": "multiple",
        "isActive": true,
        "createdBy": {
          "_id": "64a1b2c3d4e5f6789abcdef3",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "createdAt": "2024-01-14T11:00:00.000Z",
        "updatedAt": "2024-01-14T11:00:00.000Z"
      }
    ],
    "total": 2
  }
}
```

### Error Response (500)

```json
{
  "success": false,
  "exception": "INTERNAL_SERVER_ERROR",
  "description": "An error occurred while retrieving services",
  "content": null
}
```

## Service Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `_id` | String | Unique service identifier |
| `name` | String | Service name |
| `description` | String | Service description |
| `basePrice` | Number | Base price per unit/hour |
| `unitType` | String | Pricing model (`per_unit` or `per_hour`) |
| `imageUri` | String | Service image URL |
| `service_icon` | String | Service icon URL (S3) |
| `category_id` | Object | Category information |
| `min_time_required` | Number | Minimum time required (minutes) |
| `availability` | Array | Available days of the week |
| `job_service_type` | String | Service type (`OnTime`, `Scheduled`, `Quotation`) |
| `order_name` | String | Order name (for Quotation type) |
| `price_type` | String | Price type (`30min`, `1hr`, `1day`, `fixed`) |
| `subservice_type` | String | Subservice type (`single`, `multiple`) |
| `isActive` | Boolean | Service active status |
| `createdBy` | Object | Creator information |
| `createdAt` | String | Creation timestamp |
| `updatedAt` | String | Last update timestamp |

## Features

### ✅ Public Access
- No authentication required
- Perfect for public-facing applications
- Can be used in mobile apps and websites

### ✅ Complete Service Information
- All service details included
- Category information populated
- Creator information included
- Pricing details available

### ✅ Active Services Only
- Only returns services with `isActive: true`
- Automatically filters out inactive services
- Ensures users only see available services

### ✅ Sorted Results
- Services sorted by creation date (newest first)
- Consistent ordering for better UX

## Use Cases

### 1. Service Catalog Display
```javascript
const displayServiceCatalog = async () => {
  try {
    const response = await fetch('/api/services/active');
    const data = await response.json();
    
    if (data.success) {
      const services = data.content.services;
      // Display services in catalog
      services.forEach(service => {
        console.log(`${service.name}: $${service.basePrice} per ${service.unitType}`);
      });
    }
  } catch (error) {
    console.error('Error loading services:', error);
  }
};
```

### 2. Service Search and Filter
```javascript
const searchServices = async (searchTerm) => {
  try {
    const response = await fetch('/api/services/active');
    const data = await response.json();
    
    if (data.success) {
      const services = data.content.services;
      // Filter services by search term
      const filteredServices = services.filter(service => 
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return filteredServices;
    }
  } catch (error) {
    console.error('Error searching services:', error);
  }
};
```

### 3. Category-based Filtering
```javascript
const getServicesByCategory = async (categoryName) => {
  try {
    const response = await fetch('/api/services/active');
    const data = await response.json();
    
    if (data.success) {
      const services = data.content.services;
      // Filter by category
      const categoryServices = services.filter(service => 
        service.category_id.name === categoryName
      );
      return categoryServices;
    }
  } catch (error) {
    console.error('Error filtering services:', error);
  }
};
```

### 4. Pricing Information Display
```javascript
const displayPricingInfo = async () => {
  try {
    const response = await fetch('/api/services/active');
    const data = await response.json();
    
    if (data.success) {
      const services = data.content.services;
      services.forEach(service => {
        const pricingInfo = {
          serviceName: service.name,
          basePrice: service.basePrice,
          unitType: service.unitType,
          pricingModel: service.unitType === 'per_unit' ? 'per item' : 'per hour'
        };
        console.log(`${pricingInfo.serviceName}: $${pricingInfo.basePrice} ${pricingInfo.pricingModel}`);
      });
    }
  } catch (error) {
    console.error('Error loading pricing info:', error);
  }
};
```

## Frontend Integration

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const ServicesList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/services/active');
        const data = await response.json();
        
        if (data.success) {
          setServices(data.content.services);
        } else {
          throw new Error(data.description);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  if (loading) return <div className="loading">Loading services...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="services-list">
      <h2>Available Services ({services.length})</h2>
      <div className="services-grid">
        {services.map(service => (
          <div key={service._id} className="service-card">
            <div className="service-header">
              <h3>{service.name}</h3>
              <span className="price">
                ${service.basePrice} per {service.unitType === 'per_unit' ? 'item' : 'hour'}
              </span>
            </div>
            <p className="description">{service.description}</p>
            <div className="service-details">
              <p><strong>Category:</strong> {service.category_id?.name}</p>
              <p><strong>Availability:</strong> {service.availability?.join(', ')}</p>
              <p><strong>Type:</strong> {service.job_service_type}</p>
              <p><strong>Min Time:</strong> {service.min_time_required} minutes</p>
            </div>
            <button 
              className="select-service"
              onClick={() => selectService(service)}
            >
              Select Service
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesList;
```

### Vue.js Component Example

```vue
<template>
  <div class="services-list">
    <h2>Available Services ({{ services.length }})</h2>
    <div v-if="loading" class="loading">Loading services...</div>
    <div v-else-if="error" class="error">Error: {{ error }}</div>
    <div v-else class="services-grid">
      <div 
        v-for="service in services" 
        :key="service._id" 
        class="service-card"
      >
        <div class="service-header">
          <h3>{{ service.name }}</h3>
          <span class="price">
            ${{ service.basePrice }} per {{ service.unitType === 'per_unit' ? 'item' : 'hour' }}
          </span>
        </div>
        <p class="description">{{ service.description }}</p>
        <div class="service-details">
          <p><strong>Category:</strong> {{ service.category_id?.name }}</p>
          <p><strong>Availability:</strong> {{ service.availability?.join(', ') }}</p>
          <p><strong>Type:</strong> {{ service.job_service_type }}</p>
          <p><strong>Min Time:</strong> {{ service.min_time_required }} minutes</p>
        </div>
        <button 
          class="select-service"
          @click="selectService(service)"
        >
          Select Service
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ServicesList',
  data() {
    return {
      services: [],
      loading: true,
      error: null
    };
  },
  async mounted() {
    try {
      const response = await fetch('/api/services/active');
      const data = await response.json();
      
      if (data.success) {
        this.services = data.content.services;
      } else {
        throw new Error(data.description);
      }
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  },
  methods: {
    selectService(service) {
      // Handle service selection
      this.$emit('service-selected', service);
    }
  }
};
</script>
```

## Testing

### Test Script
Use the provided test script to verify the endpoint:

```bash
node test-get-all-active-services.js
```

### Manual Testing with cURL

```bash
# Test the endpoint
curl -X GET "http://localhost:3001/api/services/active" \
  -H "Content-Type: application/json"
```

### Expected Test Results
1. ✅ **Success Response**: Returns all active services
2. ✅ **Correct Structure**: Response has required fields
3. ✅ **Active Services Only**: All returned services have `isActive: true`
4. ✅ **Complete Data**: All service fields populated correctly

## Comparison with Other Endpoints

| Endpoint | Authentication | Purpose | Filters |
|----------|----------------|---------|---------|
| `GET /api/services/active` | ❌ None | Get all active services | None |
| `GET /api/services` | ✅ Required | Get services with optional category filter | Category |
| `GET /api/services/:id` | ✅ Required | Get single service by ID | Service ID |
| `POST /api/services/paginated` | ✅ Required | Get paginated services | Category, pagination |

## Performance Considerations

### Caching
Consider implementing caching for this endpoint since:
- Service data doesn't change frequently
- It's a public endpoint with potentially high traffic
- Response size can be large with many services

### Example Caching Implementation
```javascript
// Redis caching example
const redis = require('redis');
const client = redis.createClient();

const getCachedServices = async () => {
  try {
    const cached = await client.get('active-services');
    if (cached) {
      return JSON.parse(cached);
    }
    
    const response = await fetch('/api/services/active');
    const data = await response.json();
    
    if (data.success) {
      // Cache for 5 minutes
      await client.setex('active-services', 300, JSON.stringify(data));
    }
    
    return data;
  } catch (error) {
    console.error('Error with caching:', error);
    throw error;
  }
};
```

## Summary

The Get All Active Services API provides:
- ✅ **Public access** without authentication
- ✅ **Complete service information** with all details
- ✅ **Active services only** filtering
- ✅ **Consistent response format** matching other APIs
- ✅ **Comprehensive Swagger documentation**
- ✅ **Easy frontend integration**
- ✅ **Flexible use cases** for various applications

This endpoint is perfect for displaying available services in public-facing applications, mobile apps, and service catalogs.
