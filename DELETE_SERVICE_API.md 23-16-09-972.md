# Delete Service API Documentation

## Overview
The delete service API allows administrators to soft delete services from the system. This endpoint performs a soft delete by setting the `isActive` field to `false`, ensuring data integrity and preventing accidental data loss.

## Endpoint
```
DELETE /api/services/:id
```

## Authentication
- **Required**: Bearer token in Authorization header
- **Access**: Admin only
- **Role**: Must have admin privileges

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Service ID to delete |

## Response Format

### Success Response
```typescript
{
  success: boolean;
  exception: string | null;
  description: string;
  content: {
    service: {
      _id: string;
      name: string;
      isActive: boolean;
    };
  };
}
```

### Error Responses

#### Service Not Found (404)
```json
{
  "success": false,
  "exception": "SERVICE_NOT_FOUND",
  "description": "Service not found",
  "content": null
}
```

#### Service In Use (400)
```json
{
  "success": false,
  "exception": "SERVICE_IN_USE",
  "description": "Cannot delete service. It is being used by 5 service request(s)",
  "content": null
}
```

#### Unauthorized (401)
```json
{
  "success": false,
  "exception": "UNAUTHORIZED",
  "description": "Access denied. Please provide a valid token.",
  "content": null
}
```

#### Forbidden (403)
```json
{
  "success": false,
  "exception": "FORBIDDEN",
  "description": "Access denied. Admin privileges required.",
  "content": null
}
```

## Usage Examples

### 1. Delete Service
```bash
curl -X DELETE "http://localhost:3000/api/services/64a1b2c3d4e5f6789abcdef1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. JavaScript/TypeScript Examples

#### Using Axios
```typescript
const deleteService = async (serviceId: string, adminToken: string) => {
  try {
    const response = await axios.delete(`/api/services/${serviceId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response.data.success) {
      console.log('Service deleted successfully:', response.data.content.service);
      return response.data;
    } else {
      throw new Error(response.data.description);
    }
  } catch (error) {
    console.error('Error deleting service:', error.response?.data || error.message);
    throw error;
  }
};
```

#### Using Fetch
```typescript
const deleteService = async (serviceId: string, adminToken: string) => {
  try {
    const response = await fetch(`/api/services/${serviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.description);
    }
    
    const data = await response.json();
    console.log('Service deleted successfully:', data.content.service);
    return data;
  } catch (error) {
    console.error('Error deleting service:', error.message);
    throw error;
  }
};
```

## Frontend Integration

### React Component Example
```typescript
import React, { useState } from 'react';

interface Service {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface ServiceManagementProps {
  services: Service[];
  onServiceDeleted: (serviceId: string) => void;
}

const ServiceManagement: React.FC<ServiceManagementProps> = ({ 
  services, 
  onServiceDeleted 
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deleteService = async (serviceId: string, serviceName: string) => {
    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete "${serviceName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(serviceId);
    setError(null);

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.description);
      }

      const data = await response.json();
      console.log('Service deleted:', data.content.service);
      
      // Notify parent component
      onServiceDeleted(serviceId);
      
    } catch (err) {
      console.error('Error deleting service:', err);
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}
      
      <div className="services-list">
        {services.map(service => (
          <div key={service._id} className="service-item">
            <h3>{service.name}</h3>
            <p>{service.description}</p>
            <p>Status: {service.isActive ? 'Active' : 'Inactive'}</p>
            
            <button
              onClick={() => deleteService(service._id, service.name)}
              disabled={loading === service._id || !service.isActive}
              className="delete-button"
            >
              {loading === service._id ? 'Deleting...' : 'Delete Service'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServiceManagement;
```
