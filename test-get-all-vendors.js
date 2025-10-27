/**
 * Test script for Get All Vendors API
 * Tests the GET /api/auth/admin/vendors endpoint
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';

async function testGetAllVendors() {
  console.log('🚀 Testing Get All Vendors API...\n');

  try {
    // Test 1: Get all vendors (basic)
    console.log('1. Testing get all vendors...');
    
    // You'll need to replace 'YOUR_ADMIN_TOKEN' with an actual admin token
    const adminToken = 'YOUR_ADMIN_TOKEN'; // Replace with actual admin token
    
    const response = await axios.get(`${BASE_URL}/auth/admin/vendors`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Vendors retrieved successfully');
      console.log(`   - Total vendors: ${response.data.content.pagination.totalVendors}`);
      console.log(`   - Vendors returned: ${response.data.content.vendors.length}`);
      console.log(`   - Current page: ${response.data.content.pagination.currentPage}`);
      console.log(`   - Total pages: ${response.data.content.pagination.totalPages}`);
      
      if (response.data.content.vendors.length > 0) {
        const firstVendor = response.data.content.vendors[0];
        console.log('\n📋 Sample vendor data:');
        console.log(`   - ID: ${firstVendor._id}`);
        console.log(`   - Name: ${firstVendor.firstName} ${firstVendor.lastName}`);
        console.log(`   - Email: ${firstVendor.email}`);
        console.log(`   - Type: ${firstVendor.type}`);
        console.log(`   - Covered City: ${firstVendor.coveredCity}`);
        console.log(`   - Service: ${firstVendor.serviceId?.name || 'N/A'}`);
        console.log(`   - Profile Pic: ${firstVendor.profilePic || 'Not provided'}`);
        console.log(`   - Approved: ${firstVendor.approved}`);
        console.log(`   - Created At: ${firstVendor.createdAt}`);
      } else {
        console.log('   - No vendors found');
      }
    } else {
      console.log('❌ Failed to retrieve vendors');
      console.log(`   - Error: ${response.data.description}`);
    }

    // Test 2: Get vendors with pagination
    console.log('\n2. Testing pagination...');
    
    const response2 = await axios.get(`${BASE_URL}/auth/admin/vendors?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response2.data.success) {
      console.log('✅ Pagination working correctly');
      console.log(`   - Vendors per page: ${response2.data.content.pagination.vendorsPerPage}`);
      console.log(`   - Has next page: ${response2.data.content.pagination.hasNextPage}`);
      console.log(`   - Has prev page: ${response2.data.content.pagination.hasPrevPage}`);
    } else {
      console.log('❌ Pagination failed');
      console.log(`   - Error: ${response2.data.description}`);
    }

    // Test 3: Search vendors
    console.log('\n3. Testing search functionality...');
    
    const response3 = await axios.get(`${BASE_URL}/auth/admin/vendors?search=John`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response3.data.success) {
      console.log('✅ Search working correctly');
      console.log(`   - Search results: ${response3.data.content.vendors.length}`);
      console.log(`   - Total matching vendors: ${response3.data.content.pagination.totalVendors}`);
    } else {
      console.log('❌ Search failed');
      console.log(`   - Error: ${response3.data.description}`);
    }

    // Test 4: Filter by type
    console.log('\n4. Testing type filter...');
    
    const response4 = await axios.get(`${BASE_URL}/auth/admin/vendors?type=Individual`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response4.data.success) {
      console.log('✅ Type filter working correctly');
      console.log(`   - Individual vendors: ${response4.data.content.vendors.length}`);
      console.log(`   - Total individual vendors: ${response4.data.content.pagination.totalVendors}`);
    } else {
      console.log('❌ Type filter failed');
      console.log(`   - Error: ${response4.data.description}`);
    }

    // Test 5: Filter by covered city
    console.log('\n5. Testing covered city filter...');
    
    const response5 = await axios.get(`${BASE_URL}/auth/admin/vendors?coveredCity=Dubai`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response5.data.success) {
      console.log('✅ Covered city filter working correctly');
      console.log(`   - Dubai vendors: ${response5.data.content.vendors.length}`);
      console.log(`   - Total Dubai vendors: ${response5.data.content.pagination.totalVendors}`);
    } else {
      console.log('❌ Covered city filter failed');
      console.log(`   - Error: ${response5.data.description}`);
    }

    // Test 6: Combined filters
    console.log('\n6. Testing combined filters...');
    
    const response6 = await axios.get(`${BASE_URL}/auth/admin/vendors?type=Individual&coveredCity=Dubai&search=John&page=1&limit=3`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    if (response6.data.success) {
      console.log('✅ Combined filters working correctly');
      console.log(`   - Filtered results: ${response6.data.content.vendors.length}`);
      console.log(`   - Total matching vendors: ${response6.data.content.pagination.totalVendors}`);
    } else {
      console.log('❌ Combined filters failed');
      console.log(`   - Error: ${response6.data.description}`);
    }

    console.log('\n🎉 All vendor API tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Unauthorized - make sure to provide a valid admin token');
    } else if (error.response?.status === 403) {
      console.log('\n💡 Forbidden - make sure the user has admin role');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Server error - check the server logs for details');
    }
  }
}

// Usage examples
function showUsageExamples() {
  console.log('\n📋 Usage Examples:\n');
  
  console.log('1. Basic fetch request:');
  console.log(`
const getAllVendors = async (page = 1, limit = 10) => {
  try {
    const response = await axios.get(\`/api/auth/admin/vendors?page=\${page}&limit=\${limit}\`, {
      headers: {
        'Authorization': \`Bearer \${adminToken}\`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching vendors:', error.response?.data);
    throw error;
  }
};
  `);
  
  console.log('2. Frontend integration (React):');
  console.log(`
const VendorsList = () => {
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
        const response = await fetch(\`/api/auth/admin/vendors?\${queryParams}\`, {
          headers: {
            'Authorization': \`Bearer \${adminToken}\`
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
    <div>
      <h2>Vendors Management</h2>
      
      {/* Filters */}
      <div className="filters">
        <input 
          type="text" 
          placeholder="Search vendors..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
        <select 
          value={filters.type}
          onChange={(e) => handleFilterChange('type', e.target.value)}
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
        />
      </div>

      {/* Vendors List */}
      <div className="vendors-list">
        {vendors.map(vendor => (
          <div key={vendor._id} className="vendor-card">
            <div className="vendor-header">
              <h3>{vendor.firstName} {vendor.lastName}</h3>
              <span className="type">{vendor.type}</span>
            </div>
            <p><strong>Email:</strong> {vendor.email}</p>
            <p><strong>Mobile:</strong> {vendor.mobileNumber}</p>
            <p><strong>City:</strong> {vendor.coveredCity}</p>
            <p><strong>Service:</strong> {vendor.serviceId?.name || 'N/A'}</p>
            <p><strong>Approved:</strong> {vendor.approved ? 'Yes' : 'No'}</p>
            {vendor.profilePic && (
              <img src={vendor.profilePic} alt="Profile" className="profile-pic" />
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button 
          disabled={!pagination.hasPrevPage}
          onClick={() => handlePageChange(pagination.currentPage - 1)}
        >
          Previous
        </button>
        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
        <button 
          disabled={!pagination.hasNextPage}
          onClick={() => handlePageChange(pagination.currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
  `);
  
  console.log('3. cURL examples:');
  console.log(`
# Get all vendors
curl -X GET "http://localhost:3001/api/auth/admin/vendors" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get vendors with pagination
curl -X GET "http://localhost:3001/api/auth/admin/vendors?page=1&limit=5" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Search vendors
curl -X GET "http://localhost:3001/api/auth/admin/vendors?search=John" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Filter by type
curl -X GET "http://localhost:3001/api/auth/admin/vendors?type=Individual" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Filter by covered city
curl -X GET "http://localhost:3001/api/auth/admin/vendors?coveredCity=Dubai" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Combined filters
curl -X GET "http://localhost:3001/api/auth/admin/vendors?type=Individual&coveredCity=Dubai&search=John&page=1&limit=3" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testGetAllVendors();
  showUsageExamples();
}

module.exports = { testGetAllVendors, showUsageExamples };
