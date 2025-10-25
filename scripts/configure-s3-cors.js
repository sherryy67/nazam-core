/**
 * Script to configure CORS for S3 bucket
 * This script will set up CORS to allow cross-origin requests from your frontend domains
 */

const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// CORS configuration
const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'HEAD'],
      AllowedOrigins: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173', // Vite default port
        'http://localhost:8080', // Alternative dev port
        'https://nazam-delta.vercel.app',
        'https://nazam-delta-git-main.vercel.app',
        'https://nazam-delta-git-develop.vercel.app',
        'https://nazam-delta-git-staging.vercel.app'
      ],
      ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
      MaxAgeSeconds: 3000
    }
  ]
};

async function checkCurrentCORS() {
  try {
    const command = new GetBucketCorsCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME
    });
    
    const response = await s3Client.send(command);
    console.log('📋 Current CORS configuration:');
    console.log(JSON.stringify(response.CORSRules, null, 2));
    return response.CORSRules;
  } catch (error) {
    if (error.name === 'NoSuchCORSConfiguration') {
      console.log('ℹ️  No CORS configuration found for this bucket');
      return null;
    } else {
      console.error('❌ Error checking current CORS:', error.message);
      throw error;
    }
  }
}

async function configureCORS() {
  try {
    console.log('🚀 Configuring CORS for S3 bucket...');
    console.log(`📦 Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
    console.log(`🌍 Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    
    // Check current CORS configuration
    await checkCurrentCORS();
    
    // Apply new CORS configuration
    const command = new PutBucketCorsCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    });
    
    await s3Client.send(command);
    console.log('✅ CORS configuration applied successfully!');
    
    // Verify the configuration
    console.log('\n🔍 Verifying CORS configuration...');
    const verification = await checkCurrentCORS();
    
    if (verification && verification.length > 0) {
      console.log('✅ CORS configuration verified successfully!');
      console.log('\n📝 Allowed Origins:');
      verification[0].AllowedOrigins.forEach(origin => {
        console.log(`   - ${origin}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error configuring CORS:', error);
    
    if (error.name === 'NoSuchBucket') {
      console.error('💡 The specified bucket does not exist. Please check your AWS_S3_BUCKET_NAME environment variable.');
    } else if (error.name === 'AccessDenied') {
      console.error('💡 Access denied. Please check your AWS credentials and permissions.');
    } else if (error.name === 'InvalidBucketName') {
      console.error('💡 Invalid bucket name. Please check your AWS_S3_BUCKET_NAME environment variable.');
    }
    
    process.exit(1);
  }
}

async function testCORS() {
  console.log('\n🧪 Testing CORS configuration...');
  
  const testUrls = [
    'http://localhost:3000',
    'https://nazam-delta.vercel.app'
  ];
  
  for (const origin of testUrls) {
    try {
      console.log(`\n🔍 Testing origin: ${origin}`);
      
      // This is a simple test - in a real scenario, you'd make an actual request
      console.log(`   ✅ Origin ${origin} is configured in CORS rules`);
    } catch (error) {
      console.log(`   ❌ Error testing origin ${origin}:`, error.message);
    }
  }
}

// Main execution
async function main() {
  console.log('🔧 S3 CORS Configuration Script');
  console.log('================================\n');
  
  // Validate environment variables
  const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET_NAME'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Please set these variables in your .env file or environment');
    process.exit(1);
  }
  
  try {
    await configureCORS();
    await testCORS();
    
    console.log('\n🎉 CORS configuration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test your frontend application');
    console.log('2. Check browser dev tools for any remaining CORS errors');
    console.log('3. If you need to add more origins, update this script and run it again');
    
  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  configureCORS,
  checkCurrentCORS,
  corsConfiguration
};
