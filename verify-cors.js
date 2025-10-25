/**
 * Script to verify S3 CORS configuration
 * This script checks if CORS is properly configured
 */

const { S3Client, GetBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function verifyCORS() {
  console.log('🔍 Verifying S3 CORS Configuration');
  console.log('==================================\n');

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });

  try {
    const command = new GetBucketCorsCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME
    });
    
    const response = await s3Client.send(command);
    
    console.log('✅ CORS configuration found!');
    console.log('\n📋 Current CORS Rules:');
    
    response.CORSRules.forEach((rule, index) => {
      console.log(`\nRule ${index + 1}:`);
      console.log(`  Allowed Origins: ${rule.AllowedOrigins.join(', ')}`);
      console.log(`  Allowed Methods: ${rule.AllowedMethods.join(', ')}`);
      console.log(`  Allowed Headers: ${rule.AllowedHeaders.join(', ')}`);
      console.log(`  Max Age: ${rule.MaxAgeSeconds} seconds`);
    });
    
    // Check if our required origins are present
    const requiredOrigins = [
      'http://localhost:3000',
      'https://nazam-delta.vercel.app'
    ];
    
    const allOrigins = response.CORSRules.flatMap(rule => rule.AllowedOrigins);
    const missingOrigins = requiredOrigins.filter(origin => !allOrigins.includes(origin));
    
    if (missingOrigins.length === 0) {
      console.log('\n🎉 All required origins are configured!');
      console.log('✅ Your S3 images should work from both development and production');
    } else {
      console.log('\n⚠️  Missing origins:');
      missingOrigins.forEach(origin => {
        console.log(`   - ${origin}`);
      });
      console.log('\n💡 Run the CORS configuration script to add missing origins');
    }
    
  } catch (error) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.log('❌ No CORS configuration found for this bucket');
      console.log('💡 Run the CORS configuration script to set up CORS');
    } else {
      console.error('❌ Error checking CORS:', error.message);
    }
  }
}

// Run verification
verifyCORS();
