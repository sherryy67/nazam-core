# Home Categories Endpoint Documentation

## Overview
The `/api/categories/home` endpoint is designed for the frontend home page to display all categories with one sample service for each category. This endpoint is **unprotected** (no authentication required) and perfect for public home page displays.

## Endpoint Details

### URL
```
GET /api/categories/home
```

### Authentication
- **Required**: None (Public endpoint)
- **Access**: Anyone can access

### Response Format

#### Success Response (200)
```json
{
  "success": true,
  "exception": null,
  "description": "Home categories retrieved successfully",
  "content": {
    "categories": [
      {
        "category": {
          "_id": "64a1b2c3d4e5f6789abcdef1",
          "name": "Plumbing",
          "description": "Professional plumbing services",
          "isActive": true,
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        },
        "service": {
          "_id": "64a1b2c3d4e5f6789abcdef2",
          "name": "Emergency Pipe Repair",
          "description": "24/7 emergency plumbing services",
          "basePrice": 150,
          "unitType": "per hour",
          "imageUri": "https://example.com/plumbing.jpg",
          "service_icon": "https://s3.amazonaws.com/bucket/plumbing-icon.png",
          "category_id": "64a1b2c3d4e5f6789abcdef1",
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
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        }
      },
      {
        "category": {
          "_id": "64a1b2c3d4e5f6789abcdef4",
          "name": "Electrical",
          "description": "Professional electrical services",
          "isActive": true,
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        },
        "service": null
      }
    ],
    "total": 2
  }
}
```

#### Error Response (500)
```json
{
  "success": false,
  "exception": "INTERNAL_SERVER_ERROR",
  "description": "Server error occurred",
  "content": null
}
```

## Key Features

### 1. **Returns ALL Categories**
- Fetches all active categories from the database
- No filtering based on whether categories have services or not
- Perfect for displaying a complete category list on home page

### 2. **One Sample Service Per Category**
- For each category, includes ONE sample service (if available)
- If no services exist for a category, `service` field will be `null`
- Service is selected as the most recently created active service

### 3. **Complete Service Information**
- Full service details including pricing, availability, and metadata
- Service creator information (populated)
- Service icons and images included

### 4. **Public Access**
- No authentication required
- Perfect for public home page displays
- No rate limiting or access restrictions

## Usage Examples

### Frontend Integration (React)
```jsx
import React, { useState, useEffect } from 'react';

const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHomeCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/categories/home');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setCategories(data.content.categories);
        } else {
          throw new Error(data.description);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching home categories:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeCategories();
  }, []);

  if (loading) return <div>Loading categories...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="home-page">
      <h1>Our Service Categories</h1>
      <div className="categories-grid">
        {categories.map((item, index) => (
          <div key={item.category._id} className="category-card">
            <h3>{item.category.name}</h3>
            {item.category.description && (
              <p className="category-description">{item.category.description}</p>
            )}
            
            {item.service ? (
              <div className="sample-service">
                <h4>Sample Service: {item.service.name}</h4>
                <p className="service-description">{item.service.description}</p>
                <p className="service-price">
                  Starting from {item.service.basePrice} {item.service.unitType}
                </p>
                {item.service.service_icon && (
                  <img 
                    src={item.service.service_icon} 
                    alt={item.service.name}
                    className="service-icon"
                  />
                )}
                <button className="view-services-btn">
                  View All {item.category.name} Services
                </button>
              </div>
            ) : (
              <div className="no-services">
                <p>No services available yet</p>
                <button className="coming-soon-btn" disabled>
                  Coming Soon
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
```

### Vue.js Integration
```vue
<template>
  <div class="home-page">
    <h1>Our Service Categories</h1>
    <div v-if="loading">Loading categories...</div>
    <div v-else-if="error" class="error">Error: {{ error }}</div>
    <div v-else class="categories-grid">
      <div 
        v-for="item in categories" 
        :key="item.category._id" 
        class="category-card"
      >
        <h3>{{ item.category.name }}</h3>
        <p v-if="item.category.description" class="category-description">
          {{ item.category.description }}
        </p>
        
        <div v-if="item.service" class="sample-service">
          <h4>Sample Service: {{ item.service.name }}</h4>
          <p class="service-description">{{ item.service.description }}</p>
          <p class="service-price">
            Starting from {{ item.service.basePrice }} {{ item.service.unitType }}
          </p>
          <img 
            v-if="item.service.service_icon"
            :src="item.service.service_icon" 
            :alt="item.service.name"
            class="service-icon"
          />
          <button class="view-services-btn">
            View All {{ item.category.name }} Services
          </button>
        </div>
        
        <div v-else class="no-services">
          <p>No services available yet</p>
          <button class="coming-soon-btn" disabled>
            Coming Soon
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      categories: [],
      loading: true,
      error: null
    };
  },
  async mounted() {
    try {
      const response = await fetch('/api/categories/home');
      const data = await response.json();
      
      if (data.success) {
        this.categories = data.content.categories;
      } else {
        throw new Error(data.description);
      }
    } catch (error) {
      this.error = error.message;
      console.error('Error fetching home categories:', error);
    } finally {
      this.loading = false;
    }
  }
};
</script>
```

### Using Axios
```javascript
import axios from 'axios';

const getHomeCategories = async () => {
  try {
    const response = await axios.get('/api/categories/home');
    return response.data;
  } catch (error) {
    console.error('Error fetching home categories:', error);
    throw error;
  }
};

// Usage
const loadHomePage = async () => {
  try {
    const data = await getHomeCategories();
    console.log('Categories:', data.content.categories);
    
    // Process categories
    data.content.categories.forEach(item => {
      console.log(`Category: ${item.category.name}`);
      if (item.service) {
        console.log(`Sample Service: ${item.service.name}`);
      } else {
        console.log('No services available for this category');
      }
    });
  } catch (error) {
    console.error('Failed to load home page data:', error);
  }
};
```

## Response Structure

### Category Object
```typescript
interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Service Object
```typescript
interface Service {
  _id: string;
  name: string;
  description: string;
  basePrice: number;
  unitType: string;
  imageUri?: string;
  service_icon?: string;
  category_id: string;
  min_time_required: number;
  availability: string[];
  job_service_type: string;
  order_name?: string;
  price_type: string;
  subservice_type: string;
  isActive: boolean;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

### Response Item
```typescript
interface CategoryWithService {
  category: Category;
  service: Service | null;
}
```

## Use Cases

### 1. **Home Page Display**
- Show all available service categories
- Display sample services to give users a preview
- Guide users to explore specific categories

### 2. **Category Navigation**
- Build category menus and navigation
- Show category counts and availability
- Create category-based filtering

### 3. **Service Discovery**
- Help users understand what services are available
- Show pricing and service types
- Display service icons and images

### 4. **Marketing Pages**
- Create service showcase pages
- Build category landing pages
- Generate service previews

## Performance Considerations

- **Caching**: Consider implementing caching for better performance
- **Pagination**: For large numbers of categories, consider pagination
- **Image Optimization**: Service icons should be optimized for web
- **CDN**: Use CDN for service images and icons

## Error Handling

The endpoint handles various error scenarios:

1. **Database Connection Issues**: Returns 500 error
2. **No Categories Found**: Returns empty array
3. **Service Population Errors**: Continues with null service values
4. **Network Issues**: Standard HTTP error responses

## Testing

Use the provided test script:
```bash
node test-home-categories.js
```

Or test manually:
```bash
curl -X GET "http://localhost:3001/api/categories/home" \
  -H "Content-Type: application/json"
```

## Security Notes

- **Public Endpoint**: No authentication required
- **Data Exposure**: Only returns active categories and services
- **No Sensitive Data**: No user information or internal data exposed
- **Rate Limiting**: Consider implementing rate limiting for production use
