# Vendor Management API Updates

## Overview
The vendor management system has been updated to remove the approval/rejection workflow and provide a comprehensive API to get all vendors with filtering and pagination capabilities.

## Changes Made

### 1. Removed Endpoints
The following endpoints have been removed as they are no longer needed:

- ❌ `PUT /api/auth/admin/approve-vendor/:id`
- ❌ `PUT /api/auth/admin/reject-vendor/:id`
- ❌ `GET /api/auth/admin/pending-vendors`

### 2. Added New Endpoint
- ✅ `GET /api/auth/admin/vendors` - Get all vendors with filtering and pagination

## New API Endpoint

### GET `/api/auth/admin/vendors`

Get all vendors with filtering, searching, and pagination capabilities.

#### Authentication
- **Required**: Admin authentication
- **Header**: `Authorization: Bearer <admin_token>`

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 10 | Number of vendors per page |
| `search` | string | - | Search by name, email, or mobile number |
| `type` | string | - | Filter by vendor type (`corporate` or `individual`) |
| `coveredCity` | string | - | Filter by covered city |

#### Example Requests

```bash
# Get all vendors (first page)
GET /api/auth/admin/vendors

# Get vendors with pagination
GET /api/auth/admin/vendors?page=2&limit=5

# Search vendors
GET /api/auth/admin/vendors?search=John

# Filter by type
GET /api/auth/admin/vendors?type=Individual

# Filter by covered city
GET /api/auth/admin/vendors?coveredCity=Dubai

# Combined filters
GET /api/auth/admin/vendors?type=Individual&coveredCity=Dubai&search=John&page=1&limit=3
```

#### Response Format

```json
{
  "success": true,
  "exception": null,
  "description": "All vendors retrieved successfully",
  "content": {
    "vendors": [
      {
        "_id": "64a1b2c3d4e5f6789abcdef1",
        "type": "Individual",
        "company": null,
        "firstName": "John",
        "lastName": "Doe",
        "coveredCity": "Dubai",
        "serviceId": {
          "_id": "64a1b2c3d4e5f6789abcdef2",
          "name": "Emergency Plumbing",
          "description": "24/7 emergency plumbing services",
          "basePrice": 80,
          "unitType": "per_hour"
        },
        "gender": "Male",
        "dob": null,
        "privilege": "Beginner",
        "profilePic": "https://s3.amazonaws.com/bucket/vendor-profiles/1234567890-profile.png",
        "countryCode": "+971",
        "mobileNumber": "501234567",
        "email": "john.doe@example.com",
        "experience": 5,
        "bankName": "Emirates NBD",
        "branchName": "Dubai Mall Branch",
        "bankAccountNumber": "1234567890",
        "iban": "AE123456789012345678901",
        "idType": "EmiratesID",
        "idNumber": "784-1234-5678901-2",
        "personalIdNumber": null,
        "address": "123 Main Street, Dubai",
        "country": "UAE",
        "city": "Dubai",
        "pinCode": "12345",
        "serviceAvailability": "Full-time",
        "vatRegistration": false,
        "collectTax": false,
        "approved": true,
        "role": 2,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalVendors": 47,
      "vendorsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

## Features

### ✅ **Pagination**
- Configurable page size
- Navigation helpers (hasNextPage, hasPrevPage)
- Total count information

### ✅ **Search Functionality**
- Search by first name, last name, email, or mobile number
- Case-insensitive search
- Partial matching support

### ✅ **Filtering**
- Filter by vendor type (corporate/individual)
- Filter by covered city
- Multiple filters can be combined

### ✅ **Complete Vendor Information**
- All vendor fields included
- Service information populated
- Profile picture URLs
- Password excluded for security

### ✅ **Admin Only Access**
- Requires admin authentication
- Secure endpoint with proper authorization

## Frontend Integration

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';

const VendorsManagement = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    coveredCity: '',
    page: 1,
    limit: 10
  });

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`/api/auth/admin/vendors?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });
        const data = await response.json();
        
        if (data.success) {
          setVendors(data.content.vendors);
          setPagination(data.content.pagination);
        } else {
          throw new Error(data.description);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (loading) return <div>Loading vendors...</div>;

  return (
    <div className="vendors-management">
      <h2>Vendors Management</h2>
      
      {/* Filters */}
      <div className="filters-section">
        <input 
          type="text" 
          placeholder="Search vendors..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="search-input"
        />
        
        <select 
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="filter-select"
        >
          <option value="">All Types</option>
          <option value="Individual">Individual</option>
          <option value="corporate">Corporate</option>
        </select>
        
        <input 
          type="text" 
          placeholder="Covered City"
          value={filters.coveredCity}
          onChange={(e) => handleFilterChange('coveredCity', e.target.value)}
          className="filter-input"
        />
      </div>

      {/* Vendors List */}
      <div className="vendors-list">
        {vendors.map(vendor => (
          <div key={vendor._id} className="vendor-card">
            <div className="vendor-header">
              <h3>{vendor.firstName} {vendor.lastName}</h3>
              <span className={`type-badge ${vendor.type.toLowerCase()}`}>
                {vendor.type}
              </span>
            </div>
            
            <div className="vendor-details">
              <p><strong>Email:</strong> {vendor.email}</p>
              <p><strong>Mobile:</strong> {vendor.mobileNumber}</p>
              <p><strong>City:</strong> {vendor.coveredCity}</p>
              <p><strong>Service:</strong> {vendor.serviceId?.name || 'N/A'}</p>
              <p><strong>Experience:</strong> {vendor.experience || 'N/A'} years</p>
              <p><strong>Availability:</strong> {vendor.serviceAvailability}</p>
            </div>
            
            {vendor.profilePic && (
              <img 
                src={vendor.profilePic} 
                alt="Profile" 
                className="profile-pic"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            
            <div className="vendor-actions">
              <button className="btn-primary">View Details</button>
              <button className="btn-secondary">Edit</button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button 
          disabled={!pagination.hasPrevPage}
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          className="btn-pagination"
        >
          Previous
        </button>
        
        <span className="page-info">
          Page {pagination.currentPage} of {pagination.totalPages}
          ({pagination.totalVendors} total vendors)
        </span>
        
        <button 
          disabled={!pagination.hasNextPage}
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          className="btn-pagination"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default VendorsManagement;
```

### Vue.js Component Example

```vue
<template>
  <div class="vendors-management">
    <h2>Vendors Management</h2>
    
    <!-- Filters -->
    <div class="filters-section">
      <input 
        type="text" 
        placeholder="Search vendors..."
        v-model="filters.search"
        @input="handleFilterChange"
        class="search-input"
      />
      
      <select 
        v-model="filters.type"
        @change="handleFilterChange"
        class="filter-select"
      >
        <option value="">All Types</option>
        <option value="Individual">Individual</option>
        <option value="corporate">Corporate</option>
      </select>
      
      <input 
        type="text" 
        placeholder="Covered City"
        v-model="filters.coveredCity"
        @input="handleFilterChange"
        class="filter-input"
      />
    </div>

    <!-- Vendors List -->
    <div v-if="loading" class="loading">Loading vendors...</div>
    <div v-else class="vendors-list">
      <div 
        v-for="vendor in vendors" 
        :key="vendor._id" 
        class="vendor-card"
      >
        <div class="vendor-header">
          <h3>{{ vendor.firstName }} {{ vendor.lastName }}</h3>
          <span :class="['type-badge', vendor.type.toLowerCase()]">
            {{ vendor.type }}
          </span>
        </div>
        
        <div class="vendor-details">
          <p><strong>Email:</strong> {{ vendor.email }}</p>
          <p><strong>Mobile:</strong> {{ vendor.mobileNumber }}</p>
          <p><strong>City:</strong> {{ vendor.coveredCity }}</p>
          <p><strong>Service:</strong> {{ vendor.serviceId?.name || 'N/A' }}</p>
          <p><strong>Experience:</strong> {{ vendor.experience || 'N/A' }} years</p>
        </div>
        
        <img 
          v-if="vendor.profilePic" 
          :src="vendor.profilePic" 
          alt="Profile" 
          class="profile-pic"
          @error="$event.target.style.display = 'none'"
        />
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination">
      <button 
        :disabled="!pagination.hasPrevPage"
        @click="handlePageChange(pagination.currentPage - 1)"
        class="btn-pagination"
      >
        Previous
      </button>
      
      <span class="page-info">
        Page {{ pagination.currentPage }} of {{ pagination.totalPages }}
        ({{ pagination.totalVendors }} total vendors)
      </span>
      
      <button 
        :disabled="!pagination.hasNextPage"
        @click="handlePageChange(pagination.currentPage + 1)"
        class="btn-pagination"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VendorsManagement',
  data() {
    return {
      vendors: [],
      loading: true,
      pagination: {},
      filters: {
        search: '',
        type: '',
        coveredCity: '',
        page: 1,
        limit: 10
      }
    };
  },
  async mounted() {
    await this.fetchVendors();
  },
  methods: {
    async fetchVendors() {
      try {
        this.loading = true;
        const queryParams = new URLSearchParams(this.filters).toString();
        const response = await fetch(`/api/auth/admin/vendors?${queryParams}`, {
          headers: {
            'Authorization': `Bearer ${this.adminToken}`
          }
        });
        const data = await response.json();
        
        if (data.success) {
          this.vendors = data.content.vendors;
          this.pagination = data.content.pagination;
        } else {
          throw new Error(data.description);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error.message);
      } finally {
        this.loading = false;
      }
    },
    handleFilterChange() {
      this.filters.page = 1;
      this.fetchVendors();
    },
    handlePageChange(page) {
      this.filters.page = page;
      this.fetchVendors();
    }
  }
};
</script>
```

## Testing

### Test Script
Use the provided test script to verify the endpoint:

```bash
node test-get-all-vendors.js
```

### Manual Testing

```bash
# Get all vendors
curl -X GET "http://localhost:3001/api/auth/admin/vendors" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get vendors with pagination
curl -X GET "http://localhost:3001/api/auth/admin/vendors?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Search vendors
curl -X GET "http://localhost:3001/api/auth/admin/vendors?search=John" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Filter by type
curl -X GET "http://localhost:3001/api/auth/admin/vendors?type=Individual" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Combined filters
curl -X GET "http://localhost:3001/api/auth/admin/vendors?type=Individual&coveredCity=Dubai&search=John" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Error Handling

### Common Errors

1. **401 Unauthorized**
   - **Cause**: Missing or invalid admin token
   - **Solution**: Provide valid admin authentication token

2. **403 Forbidden**
   - **Cause**: User doesn't have admin role
   - **Solution**: Ensure user has admin privileges

3. **500 Server Error**
   - **Cause**: Database or server issues
   - **Solution**: Check server logs for details

## Migration Notes

### Removed Functions
The following functions have been removed from the controller:
- `adminApproveVendor`
- `adminRejectVendor`
- `getPendingVendors`

### Updated Exports
The controller exports have been updated to remove the old functions and add `getAllVendors`.

### Database Impact
- No database changes required
- Existing vendor data remains unchanged
- The `approved` field is still present but no longer used for workflow

## Summary

The vendor management system has been simplified and improved:

- ✅ **Removed unnecessary approval workflow** endpoints
- ✅ **Added comprehensive vendor listing** with filtering and pagination
- ✅ **Enhanced search capabilities** across multiple fields
- ✅ **Improved admin experience** with better data management
- ✅ **Maintained data integrity** with complete vendor information
- ✅ **Added proper authentication** and authorization

The new API provides a more efficient way to manage vendors without the complexity of approval workflows, focusing on data retrieval and management instead.
