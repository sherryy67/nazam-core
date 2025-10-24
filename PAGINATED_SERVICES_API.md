# Paginated Services API Documentation

## Overview
The paginated services API provides a flexible way to retrieve services with pagination, filtering, and sorting capabilities.

## Endpoint
```
POST /api/services/paginated
```

## Authentication
- **Required**: Bearer token in Authorization header
- **Access**: All authenticated users

## Request Body

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number (minimum: 1) |
| `limit` | integer | No | 10 | Items per page (1-100) |
| `category_id` | string | No | null | Filter by category ID |
| `sortBy` | string | No | 'createdAt' | Sort field |
| `sortOrder` | string | No | 'desc' | Sort direction |

### Sort Fields
- `createdAt` - Creation date
- `name` - Service name
- `basePrice` - Service price
- `updatedAt` - Last update date

### Sort Orders
- `asc` - Ascending
- `desc` - Descending

## Response Format

```typescript
{
  success: boolean;
  exception: string | null;
  description: string;
  content: {
    services: Service[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
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

### 1. Basic Pagination
```bash
curl -X POST http://localhost:3000/api/services/paginated \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "limit": 10
  }'
```

### 2. Filter by Category
```bash
curl -X POST http://localhost:3000/api/services/paginated \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "limit": 10,
    "category_id": "64a1b2c3d4e5f6789abcdef0"
  }'
```

### 3. Sort by Name (Ascending)
```bash
curl -X POST http://localhost:3000/api/services/paginated \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "limit": 10,
    "sortBy": "name",
    "sortOrder": "asc"
  }'
```

### 4. Sort by Price (Descending)
```bash
curl -X POST http://localhost:3000/api/services/paginated \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page": 1,
    "limit": 10,
    "sortBy": "basePrice",
    "sortOrder": "desc"
  }'
```

### 5. Combined Filters
```bash
curl -X POST http://localhost:3000/api/services/paginated \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "page": 2,
    "limit": 5,
    "category_id": "64a1b2c3d4e5f6789abcdef0",
    "sortBy": "basePrice",
    "sortOrder": "desc"
  }'
```

### 6. Default Parameters
```bash
curl -X POST http://localhost:3000/api/services/paginated \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Response Examples

### Successful Response
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
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 25,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "exception": "INVALID_PAGE",
  "description": "Page number must be greater than 0",
  "content": null
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_PAGE` | Page number must be greater than 0 |
| `INVALID_LIMIT` | Limit must be between 1 and 100 |
| `INVALID_CATEGORY` | Invalid or inactive category ID |
| `UNAUTHORIZED` | Missing or invalid authentication token |

## Frontend Integration

### JavaScript/TypeScript Example
```typescript
interface PaginatedServicesRequest {
  page?: number;
  limit?: number;
  category_id?: string;
  sortBy?: 'createdAt' | 'name' | 'basePrice' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedServicesResponse {
  success: boolean;
  exception: string | null;
  description: string;
  content: {
    services: Service[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

async function getPaginatedServices(request: PaginatedServicesRequest): Promise<PaginatedServicesResponse> {
  const response = await fetch('/api/services/paginated', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });
  
  return await response.json();
}

// Usage
const services = await getPaginatedServices({
  page: 1,
  limit: 10,
  category_id: '64a1b2c3d4e5f6789abcdef0',
  sortBy: 'name',
  sortOrder: 'asc'
});
```

### React Hook Example
```typescript
import { useState, useEffect } from 'react';

interface UsePaginatedServicesProps {
  page?: number;
  limit?: number;
  category_id?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function usePaginatedServices({
  page = 1,
  limit = 10,
  category_id,
  sortBy = 'createdAt',
  sortOrder = 'desc'
}: UsePaginatedServicesProps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const response = await getPaginatedServices({
          page,
          limit,
          category_id,
          sortBy,
          sortOrder
        });
        setData(response);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [page, limit, category_id, sortBy, sortOrder]);

  return { data, loading, error };
}
```

## Performance Considerations

1. **Indexing**: Ensure proper database indexes on frequently queried fields
2. **Limit**: Maximum limit is 100 to prevent performance issues
3. **Caching**: Consider implementing caching for frequently accessed data
4. **Pagination**: Use cursor-based pagination for very large datasets

## Testing

Use the provided test script to verify the endpoint functionality:

```bash
node test-paginated-services.js
```

The test script covers:
- Basic pagination
- Category filtering
- Sorting functionality
- Error handling
- Default parameters
- Edge cases
