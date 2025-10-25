/**
 * Quick CORS fix for S3 bucket
 * Run this script to immediately fix CORS issues
 */

const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function quickFixCORS() {
  console.log('🚀 Quick CORS Fix for S3 Bucket');
  console.log('================================\n');

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
          'http://localhost:5173',
          'https://nazam-delta.vercel.app',
          'https://nazam-delta-git-main.vercel.app',
          'https://nazam-delta-git-develop.vercel.app'
        ],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3000
      }
    ]
  };

  try {
    console.log(`📦 Configuring CORS for bucket: ${process.env.AWS_S3_BUCKET_NAME}`);
    
    const command = new PutBucketCorsCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    });
    
    await s3Client.send(command);
    
    console.log('✅ CORS configuration applied successfully!');
    console.log('\n🎯 Your S3 images should now work from:');
    console.log('   - http://localhost:3000 (development)');
    console.log('   - https://nazam-delta.vercel.app (production)');
    console.log('\n💡 If you still see CORS errors, try:');
    console.log('   1. Clear your browser cache');
    console.log('   2. Hard refresh the page (Ctrl+F5)');
    console.log('   3. Check browser dev tools for any remaining errors');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.name === 'NoSuchBucket') {
      console.error('💡 Bucket not found. Check your AWS_S3_BUCKET_NAME in .env file');
    } else if (error.name === 'AccessDenied') {
      console.error('💡 Access denied. Check your AWS credentials');
    }
  }
}

// Run the fix
quickFixCORS();
