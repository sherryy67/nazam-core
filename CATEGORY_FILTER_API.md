# Category Filter API Documentation

## Overview
The services API now supports filtering by category using a simple query parameter. This provides a lightweight alternative to the paginated endpoint for basic category filtering.

## Endpoint
```
GET /api/services?category={category_id}
```

## Authentication
- **Required**: Bearer token in Authorization header
- **Access**: All authenticated users

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Category ID to filter services |

## Response Format

```typescript
{
  success: boolean;
  exception: string | null;
  description: string;
  content: {
    services: Service[];
    total: number;
  };
}
```

### Service Object
```typescript
{
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  unitType: string;
  imageUri: string;
  service_icon: string;
  category_id: {
    _id: string;
    name: string;
    description: string;
  };
  min_time_required: number;
  availability: string[];
  job_service_type: string;
  order_name?: string;
  price_type?: string;
  subservice_type?: string;
  isActive: boolean;
  createdBy: object;
  createdAt: string;
  updatedAt: string;
}
```

## Usage Examples

### 1. Get All Services
```bash
curl -X GET "http://localhost:3000/api/services" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Services by Category
```bash
curl -X GET "http://localhost:3000/api/services?category=64a1b2c3d4e5f6789abcdef0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. JavaScript/TypeScript Examples

#### Using Axios
```typescript
// Get all services
const allServices = await axios.get('/api/services', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get services by category
const categoryServices = await axios.get('/api/services?category=64a1b2c3d4e5f6789abcdef0', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### Using Fetch
```typescript
// Get all services
const allServicesResponse = await fetch('/api/services', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const allServices = await allServicesResponse.json();

// Get services by category
const categoryServicesResponse = await fetch('/api/services?category=64a1b2c3d4e5f6789abcdef0', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const categoryServices = await categoryServicesResponse.json();
```

## Frontend Integration

### React Hook Example
```typescript
import { useState, useEffect } from 'react';

interface UseServicesProps {
  categoryId?: string;
}

export function useServices({ categoryId }: UseServicesProps) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const url = categoryId 
          ? `/api/services?category=${categoryId}`
          : '/api/services';
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }
        
        const data = await response.json();
        setServices(data.content.services);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [categoryId]);

  return { services, loading, error };
}
```

### React Component Example
```typescript
import React, { useState } from 'react';
import { useServices } from './hooks/useServices';

const ServicesList: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const { services, loading, error } = useServices({ 
    categoryId: selectedCategory 
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <select 
        value={selectedCategory} 
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="">All Categories</option>
        <option value="category1">Category 1</option>
        <option value="category2">Category 2</option>
      </select>
      
      <div>
        {services.map(service => (
          <div key={service._id}>
            <h3>{service.name}</h3>
            <p>{service.description}</p>
            <p>Price: ${service.basePrice}</p>
            <p>Category: {service.category_id.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Vue.js Example
```vue
<template>
  <div>
    <select v-model="selectedCategory" @change="fetchServices">
      <option value="">All Categories</option>
      <option v-for="category in categories" :key="category._id" :value="category._id">
        {{ category.name }}
      </option>
    </select>
    
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else>
      <div v-for="service in services" :key="service._id">
        <h3>{{ service.name }}</h3>
        <p>{{ service.description }}</p>
        <p>Price: ${{ service.basePrice }}</p>
        <p>Category: {{ service.category_id.name }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      services: [],
      categories: [],
      selectedCategory: '',
      loading: false,
      error: null
    };
  },
  methods: {
    async fetchServices() {
      this.loading = true;
      try {
        const url = this.selectedCategory 
          ? `/api/services?category=${this.selectedCategory}`
          : '/api/services';
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        
        const data = await response.json();
        this.services = data.content.services;
        this.error = null;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  },
  mounted() {
    this.fetchServices();
  }
};
</script>
```

## Response Examples

### Successful Response (All Services)
```json
{
  "success": true,
  "exception": null,
  "description": "Services retrieved successfully",
  "content": {
    "services": [
      {
        "_id": "64a1b2c3d4e5f6789abcdef1",
        "name": "AC Cleaning Service",
        "description": "Professional AC cleaning with deep sanitization",
        "basePrice": 500,
        "unitType": "per_unit",
        "imageUri": "https://s3.amazonaws.com/bucket/service-image.jpg",
        "service_icon": "https://s3.amazonaws.com/bucket/service-icon.jpg",
        "category_id": {
          "_id": "64a1b2c3d4e5f6789abcdef0",
          "name": "Home Cleaning",
          "description": "Professional home cleaning services"
        },
        "min_time_required": 120,
        "availability": ["Mon", "Tue", "Wed", "Thu", "Fri"],
        "job_service_type": "OnTime",
        "price_type": "1hr",
        "subservice_type": "single",
        "isActive": true,
        "createdBy": {
          "_id": "64a1b2c3d4e5f6789abcdef2",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "createdAt": "2023-12-01T10:30:00.000Z",
        "updatedAt": "2023-12-01T10:30:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### Error Response (Invalid Category)
```json
{
  "success": false,
  "exception": "INVALID_CATEGORY",
  "description": "Invalid or inactive category",
  "content": null
}
```

## Error Handling

| Error Code | Description | HTTP Status |
|------------|-------------|-------------|
| `INVALID_CATEGORY` | Invalid or inactive category ID | 400 |
| `UNAUTHORIZED` | Missing or invalid authentication token | 401 |

## Performance Considerations

1. **Indexing**: Ensure proper database indexes on `category_id` field
2. **Caching**: Consider implementing caching for frequently accessed categories
3. **Validation**: Category validation is performed on each request
4. **Response Size**: No pagination limits - use paginated endpoint for large datasets

## Comparison with Paginated Endpoint

| Feature | GET /api/services | POST /api/services/paginated |
|---------|-------------------|------------------------------|
| **Pagination** | ❌ No | ✅ Yes |
| **Category Filter** | ✅ Yes | ✅ Yes |
| **Sorting** | ❌ No | ✅ Yes |
| **Performance** | ✅ Fast | ⚠️ Slower for large datasets |
| **Use Case** | Small datasets, simple filtering | Large datasets, complex queries |

## Testing

Use the provided test script to verify the functionality:

```bash
node test-category-filter.js
```

The test script covers:
- Getting all services
- Filtering by category
- Error handling for invalid categories
- URL encoding
- Response validation
