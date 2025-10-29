const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api/auth';
const TEST_EMAIL = 'sheralii10711@gmail.com';
const TEST_PHONE = '+971501234567';

// Test cases
const testCases = [
  {
    name: 'Test 1: Send OTP via email only',
    data: { email: TEST_EMAIL },
    expectedSuccess: true
  },
  {
    name: 'Test 2: Send OTP via phone only',
    data: { phoneNumber: TEST_PHONE },
    expectedSuccess: true
  },
  {
    name: 'Test 3: Send OTP via both email and phone',
    data: { email: TEST_EMAIL, phoneNumber: TEST_PHONE },
    expectedSuccess: true
  },
  {
    name: 'Test 4: Send OTP with no contact info (should fail)',
    data: {},
    expectedSuccess: false
  },
  {
    name: 'Test 5: Send OTP with invalid email (should fail)',
    data: { email: 'invalid-email' },
    expectedSuccess: false
  },
  {
    name: 'Test 6: Send OTP with invalid phone (should fail)',
    data: { phoneNumber: '123' },
    expectedSuccess: false
  }
];

async function runTests() {
  console.log('🧪 Testing Dual OTP Functionality\n');
  console.log('=' .repeat(50));
  
  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log('📤 Request:', JSON.stringify(testCase.data, null, 2));
    
    try {
      const response = await axios.post(`${BASE_URL}/send-otp`, testCase.data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ Status:', response.status);
      console.log('📥 Response:', JSON.stringify(response.data, null, 2));
      
      if (testCase.expectedSuccess && response.status === 200) {
        console.log('✅ Test PASSED');
      } else if (!testCase.expectedSuccess && response.status >= 400) {
        console.log('✅ Test PASSED (Expected failure)');
      } else {
        console.log('❌ Test FAILED - Unexpected result');
      }
      
    } catch (error) {
      console.log('❌ Error:', error.response?.status || error.message);
      console.log('📥 Error Response:', error.response?.data || error.message);
      
      if (!testCase.expectedSuccess && error.response?.status >= 400) {
        console.log('✅ Test PASSED (Expected failure)');
      } else {
        console.log('❌ Test FAILED - Unexpected error');
      }
    }
    
    console.log('-'.repeat(50));
    
    // Wait 1 second between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 Testing completed!');
}

// Test email service configuration
async function testEmailService() {
  console.log('\n📧 Testing Email Service Configuration');
  console.log('=' .repeat(50));
  
  try {
    const emailService = require('./utils/emailService');
    const result = await emailService.testConnection();
    
    console.log('📤 Email Service Test:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Email service is configured correctly');
    } else {
      console.log('❌ Email service configuration error');
    }
  } catch (error) {
    console.log('❌ Email service test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Dual OTP Implementation Tests\n');
  
  // Test email service first
  await testEmailService();
  
  // Run API tests
  await runTests();
  
  console.log('\n📝 Test Summary:');
  console.log('1. Email service configuration test');
  console.log('2. Send OTP via email only');
  console.log('3. Send OTP via phone only');
  console.log('4. Send OTP via both email and phone');
  console.log('5. Send OTP with no contact info (should fail)');
  console.log('6. Send OTP with invalid email (should fail)');
  console.log('7. Send OTP with invalid phone (should fail)');
  
  console.log('\n💡 Note: Make sure your server is running on port 5000');
  console.log('💡 Note: Make sure your email credentials are configured in .env');
  console.log('💡 Note: Make sure your SMS service is configured');
}

// Run the tests
main().catch(console.error);
