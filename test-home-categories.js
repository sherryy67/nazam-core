/**
 * Test script for home categories endpoint
 * This script tests the GET /api/categories/home endpoint
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api';

async function testHomeCategories() {
  console.log('🚀 Testing Home Categories API...\n');

  try {
    // Test 1: Get home categories
    console.log('1. Testing home categories endpoint...');
    const response = await axios.get(`${BASE_URL}/categories/home`);
    
    if (response.data.success) {
      console.log('✅ Home categories retrieved successfully');
      console.log(`   - Total categories: ${response.data.content.total}`);
      
      if (response.data.content.categories.length > 0) {
        console.log('\n📋 Categories with services:');
        response.data.content.categories.forEach((item, index) => {
          console.log(`\n   Category ${index + 1}:`);
          console.log(`   - Name: ${item.category.name}`);
          console.log(`   - Description: ${item.category.description || 'No description'}`);
          console.log(`   - Active: ${item.category.isActive}`);
          
          if (item.service) {
            console.log(`   - Sample Service: ${item.service.name}`);
            console.log(`   - Service Price: ${item.service.basePrice} ${item.service.unitType}`);
            console.log(`   - Service Type: ${item.service.job_service_type}`);
            console.log(`   - Service Icon: ${item.service.service_icon || 'No icon'}`);
          } else {
            console.log(`   - Sample Service: No service available`);
          }
        });
      } else {
        console.log('   - No categories with services found');
      }
    } else {
      console.log('❌ Failed to retrieve home categories');
      console.log(`   - Error: ${response.data.description}`);
    }

    // Test 2: Verify response structure
    console.log('\n2. Testing response structure...');
    const expectedStructure = {
      success: 'boolean',
      exception: 'string or null',
      description: 'string',
      content: {
        categories: 'array',
        total: 'number'
      }
    };

    const hasCorrectStructure = 
      typeof response.data.success === 'boolean' &&
      (typeof response.data.exception === 'string' || response.data.exception === null) &&
      typeof response.data.description === 'string' &&
      Array.isArray(response.data.content.categories) &&
      typeof response.data.content.total === 'number';

    if (hasCorrectStructure) {
      console.log('✅ Response structure is correct');
    } else {
      console.log('❌ Response structure is incorrect');
    }

    // Test 3: Test with different scenarios
    console.log('\n3. Testing endpoint behavior...');
    
    // Test that it's truly unprotected (no auth required)
    try {
      const unprotectedResponse = await axios.get(`${BASE_URL}/categories/home`);
      console.log('✅ Endpoint is unprotected (no authentication required)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Endpoint requires authentication (should be unprotected)');
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message);
      }
    }

    console.log('\n🎉 All home categories tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.response?.data || error.message);
  }
}

// Usage examples
function showUsageExamples() {
  console.log('\n📋 Usage Examples:\n');
  
  console.log('1. Basic usage:');
  console.log(`
const getHomeCategories = async () => {
  try {
    const response = await axios.get('/api/categories/home');
    return response.data;
  } catch (error) {
    console.error('Error fetching home categories:', error);
    throw error;
  }
};
  `);
  
  console.log('2. Using fetch:');
  console.log(`
const getHomeCategories = async () => {
  try {
    const response = await fetch('/api/categories/home');
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching home categories:', error);
    throw error;
  }
};
  `);
  
  console.log('3. Frontend integration (React):');
  console.log(`
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
          throw new Error(\`HTTP error! status: \${response.status}\`);
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
      <h1>Our Services</h1>
      <div className="categories-grid">
        {categories.map((item, index) => (
          <div key={item.category._id} className="category-card">
            <h3>{item.category.name}</h3>
            {item.category.description && (
              <p>{item.category.description}</p>
            )}
            {item.service && (
              <div className="sample-service">
                <h4>Sample Service: {item.service.name}</h4>
                <p>Price: {item.service.basePrice} {item.service.unitType}</p>
                {item.service.service_icon && (
                  <img 
                    src={item.service.service_icon} 
                    alt={item.service.name}
                    className="service-icon"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
  `);
  
  console.log('4. Vue.js integration:');
  console.log(`
<template>
  <div class="home-page">
    <h1>Our Services</h1>
    <div v-if="loading">Loading categories...</div>
    <div v-else-if="error" class="error">Error: {{ error }}</div>
    <div v-else class="categories-grid">
      <div 
        v-for="item in categories" 
        :key="item.category._id" 
        class="category-card"
      >
        <h3>{{ item.category.name }}</h3>
        <p v-if="item.category.description">{{ item.category.description }}</p>
        <div v-if="item.service" class="sample-service">
          <h4>Sample Service: {{ item.service.name }}</h4>
          <p>Price: {{ item.service.basePrice }} {{ item.service.unitType }}</p>
          <img 
            v-if="item.service.service_icon"
            :src="item.service.service_icon" 
            :alt="item.service.name"
            class="service-icon"
          />
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
  `);
  
  console.log('5. Error handling:');
  console.log(`
const handleHomeCategories = async () => {
  try {
    const response = await fetch('/api/categories/home');
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Categories loaded:', data.content.categories);
      return data.content.categories;
    } else {
      throw new Error(data.description);
    }
  } catch (error) {
    console.error('Error loading home categories:', error);
    // Handle error (show user message, retry, etc.)
    return [];
  }
};
  `);
}

// Run tests if this file is executed directly
if (require.main === module) {
  testHomeCategories();
  showUsageExamples();
}

module.exports = { testHomeCategories, showUsageExamples };
