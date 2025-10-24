/**
 * Test script for new Service Management endpoints
 * This script tests the Category and updated Service endpoints
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_ADMIN_TOKEN = 'your_admin_jwt_token_here'; // Replace with actual admin token

// Test data
const testCategory = {
  name: 'Home Cleaning'
};

const testService = {
  name: 'AC Cleaning Service',
  description: 'Professional AC cleaning with deep sanitization',
  basePrice: 500,
  unitType: 'per_unit',
  category_id: '', // Will be set after category creation
  min_time_required: 120,
  availability: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  job_service_type: 'OnTime',
  price_type: '1hr',
  subservice_type: 'single'
};

const testQuotationService = {
  name: 'Custom Cleaning Service',
  description: 'Customized cleaning service based on requirements',
  basePrice: 300,
  unitType: 'per_hour',
  category_id: '', // Will be set after category creation
  min_time_required: 180,
  availability: ['Sat', 'Sun'],
  job_service_type: 'Quotation',
  order_name: 'Custom Order Request'
};

async function testEndpoints() {
  console.log('🚀 Starting Service Management API Tests...\n');

  try {
    // Test 1: Create Category
    console.log('1. Testing Category Creation...');
    const categoryResponse = await axios.post(`${BASE_URL}/categories`, testCategory, {
      headers: {
        'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (categoryResponse.data.success) {
      console.log('✅ Category created successfully:', categoryResponse.data.content.name);
      testService.category_id = categoryResponse.data.content._id;
      testQuotationService.category_id = categoryResponse.data.content._id;
    } else {
      console.log('❌ Category creation failed');
      return;
    }

    // Test 2: Get Categories
    console.log('\n2. Testing Get Categories...');
    const categoriesResponse = await axios.get(`${BASE_URL}/categories`, {
      headers: {
        'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
      }
    });
    
    if (categoriesResponse.data.success) {
      console.log('✅ Categories retrieved successfully:', categoriesResponse.data.content.length, 'categories found');
    } else {
      console.log('❌ Get categories failed');
    }

    // Test 3: Create Regular Service
    console.log('\n3. Testing Regular Service Creation...');
    const serviceResponse = await axios.post(`${BASE_URL}/services`, testService, {
      headers: {
        'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (serviceResponse.data.success) {
      console.log('✅ Regular service created successfully:', serviceResponse.data.content.name);
      console.log('   - Category:', serviceResponse.data.content.category_id);
      console.log('   - Job Type:', serviceResponse.data.content.job_service_type);
      console.log('   - Availability:', serviceResponse.data.content.availability);
    } else {
      console.log('❌ Regular service creation failed:', serviceResponse.data.message);
    }

    // Test 4: Create Quotation Service
    console.log('\n4. Testing Quotation Service Creation...');
    const quotationServiceResponse = await axios.post(`${BASE_URL}/services`, testQuotationService, {
      headers: {
        'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (quotationServiceResponse.data.success) {
      console.log('✅ Quotation service created successfully:', quotationServiceResponse.data.content.name);
      console.log('   - Order Name:', quotationServiceResponse.data.content.order_name);
      console.log('   - Job Type:', quotationServiceResponse.data.content.job_service_type);
    } else {
      console.log('❌ Quotation service creation failed:', quotationServiceResponse.data.message);
    }

    // Test 5: Get Services
    console.log('\n5. Testing Get Services...');
    const servicesResponse = await axios.get(`${BASE_URL}/services`, {
      headers: {
        'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
      }
    });
    
    if (servicesResponse.data.success) {
      console.log('✅ Services retrieved successfully:', servicesResponse.data.content.length, 'services found');
      servicesResponse.data.content.forEach((service, index) => {
        console.log(`   Service ${index + 1}: ${service.name} (${service.job_service_type})`);
        console.log(`   - Category: ${service.category_id?.name || 'N/A'}`);
        console.log(`   - Availability: ${service.availability.join(', ')}`);
      });
    } else {
      console.log('❌ Get services failed');
    }

    // Test 6: Update Category
    console.log('\n6. Testing Category Update...');
    const categoryId = categoryResponse.data.content._id;
    const updateResponse = await axios.put(`${BASE_URL}/categories/${categoryId}`, {
      name: 'Updated Home Cleaning'
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (updateResponse.data.success) {
      console.log('✅ Category updated successfully:', updateResponse.data.content.name);
    } else {
      console.log('❌ Category update failed');
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Make sure to set a valid admin JWT token in TEST_ADMIN_TOKEN');
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testEndpoints();
}

module.exports = { testEndpoints };
