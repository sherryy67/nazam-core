/**
 * Test script for paginated services endpoint
 * This script tests the new POST /api/services/paginated endpoint
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_TOKEN = 'your_jwt_token_here'; // Replace with actual token

async function testPaginatedServices() {
  console.log('🚀 Testing Paginated Services API...\n');

  try {
    // Test 1: Basic pagination
    console.log('1. Testing basic pagination...');
    const basicPaginationResponse = await axios.post(`${BASE_URL}/services/paginated`, {
      page: 1,
      limit: 5
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (basicPaginationResponse.data.success) {
      console.log('✅ Basic pagination successful');
      console.log(`   - Services returned: ${basicPaginationResponse.data.content.services.length}`);
      console.log(`   - Total count: ${basicPaginationResponse.data.content.pagination.totalCount}`);
      console.log(`   - Current page: ${basicPaginationResponse.data.content.pagination.currentPage}`);
      console.log(`   - Total pages: ${basicPaginationResponse.data.content.pagination.totalPages}`);
    } else {
      console.log('❌ Basic pagination failed');
      return;
    }

    // Test 2: Pagination with category filter
    console.log('\n2. Testing pagination with category filter...');
    const categoryFilterResponse = await axios.post(`${BASE_URL}/services/paginated`, {
      page: 1,
      limit: 3,
      category_id: '64a1b2c3d4e5f6789abcdef0' // Replace with actual category ID
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (categoryFilterResponse.data.success) {
      console.log('✅ Category filter pagination successful');
      console.log(`   - Services returned: ${categoryFilterResponse.data.content.services.length}`);
      console.log(`   - Total count: ${categoryFilterResponse.data.content.pagination.totalCount}`);
    } else {
      console.log('❌ Category filter pagination failed');
    }

    // Test 3: Sorting by name
    console.log('\n3. Testing sorting by name...');
    const sortByNameResponse = await axios.post(`${BASE_URL}/services/paginated`, {
      page: 1,
      limit: 5,
      sortBy: 'name',
      sortOrder: 'asc'
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (sortByNameResponse.data.success) {
      console.log('✅ Sorting by name successful');
      console.log(`   - First service: ${sortByNameResponse.data.content.services[0]?.name || 'N/A'}`);
    } else {
      console.log('❌ Sorting by name failed');
    }

    // Test 4: Sorting by price
    console.log('\n4. Testing sorting by price...');
    const sortByPriceResponse = await axios.post(`${BASE_URL}/services/paginated`, {
      page: 1,
      limit: 5,
      sortBy: 'basePrice',
      sortOrder: 'desc'
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (sortByPriceResponse.data.success) {
      console.log('✅ Sorting by price successful');
      console.log(`   - Highest price: ${sortByPriceResponse.data.content.services[0]?.basePrice || 'N/A'}`);
    } else {
      console.log('❌ Sorting by price failed');
    }

    // Test 5: Invalid page number
    console.log('\n5. Testing invalid page number...');
    try {
      await axios.post(`${BASE_URL}/services/paginated`, {
        page: 0,
        limit: 5
      }, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Should have failed with invalid page number');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid page number properly rejected');
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 6: Invalid limit
    console.log('\n6. Testing invalid limit...');
    try {
      await axios.post(`${BASE_URL}/services/paginated`, {
        page: 1,
        limit: 150
      }, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Should have failed with invalid limit');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid limit properly rejected');
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    // Test 7: Default parameters
    console.log('\n7. Testing default parameters...');
    const defaultResponse = await axios.post(`${BASE_URL}/services/paginated`, {}, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (defaultResponse.data.success) {
      console.log('✅ Default parameters successful');
      console.log(`   - Page: ${defaultResponse.data.content.pagination.currentPage}`);
      console.log(`   - Limit: ${defaultResponse.data.content.pagination.limit}`);
    } else {
      console.log('❌ Default parameters failed');
    }

    console.log('\n🎉 All pagination tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Make sure to set a valid JWT token in TEST_TOKEN');
    }
  }
}

// Usage examples
function showUsageExamples() {
  console.log('\n📋 Usage Examples:\n');
  
  console.log('1. Basic pagination:');
  console.log('POST /api/services/paginated');
  console.log('Body: { "page": 1, "limit": 10 }\n');
  
  console.log('2. With category filter:');
  console.log('POST /api/services/paginated');
  console.log('Body: { "page": 1, "limit": 10, "category_id": "64a1b2c3d4e5f6789abcdef0" }\n');
  
  console.log('3. With sorting:');
  console.log('POST /api/services/paginated');
  console.log('Body: { "page": 1, "limit": 10, "sortBy": "name", "sortOrder": "asc" }\n');
  
  console.log('4. Combined filters:');
  console.log('POST /api/services/paginated');
  console.log('Body: { "page": 2, "limit": 5, "category_id": "64a1b2c3d4e5f6789abcdef0", "sortBy": "basePrice", "sortOrder": "desc" }\n');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPaginatedServices();
  showUsageExamples();
}

module.exports = { testPaginatedServices, showUsageExamples };
