/**
 * Test script to verify the eligible-vendors API endpoint
 */

const axios = require('axios');

const testEligibleVendorsAPI = async () => {
  try {
    console.log('🧪 Testing eligible-vendors API endpoint...');
    
    const serviceId = '68fcdf1652f7d1dd9d2b9929';
    const baseURL = 'http://localhost:5000'; // Adjust port as needed
    const endpoint = `${baseURL}/api/admin/eligible-vendors/${serviceId}`;
    
    console.log(`Testing endpoint: ${endpoint}`);
    
    // You'll need to add proper authentication headers here
    const response = await axios.get(endpoint, {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE', // Replace with actual admin token
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response:', response.data);
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
};

// Run the test
testEligibleVendorsAPI();
