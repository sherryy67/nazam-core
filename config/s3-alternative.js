const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { fromEnv } = require('@aws-sdk/credential-providers');

/**
 * Alternative S3 configuration using AWS SDK credential providers
 * This approach is more robust and handles credential resolution automatically
 */

// Create S3Client with credential provider chain
const createS3ClientWithProvider = () => {
  try {
    // Validate required environment variables
    const requiredVars = ['AWS_REGION', 'AWS_S3_BUCKET_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required AWS environment variables: ${missingVars.join(', ')}`);
    }

    // Use credential provider chain - this will automatically try:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. AWS credentials file (~/.aws/credentials)
    // 3. IAM roles (if running on EC2)
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: fromEnv(), // This handles credential resolution automatically
      maxAttempts: 3,
      retryMode: 'adaptive',
    });

    return s3Client;
  } catch (error) {
    console.error('AWS Configuration Error:', error.message);
    throw error;
  }
};

/**
 * Upload a file to AWS S3 using credential provider
 * @param {Object} file - File object from multer
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
const uploadToS3WithProvider = async (file) => {
  try {
    // Create S3Client with credential provider
    const s3Client = createS3ClientWithProvider();
    
    // Generate unique key with timestamp and original filename
    const timestamp = Date.now();
    const fileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
    const key = `uploads/${timestamp}-${fileName}`;

    // Create upload parameters
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    console.log('Uploading to S3 with provider:', {
      bucket: process.env.AWS_S3_BUCKET_NAME,
      key: key,
      region: process.env.AWS_REGION
    });

    // Upload file to S3
    const upload = new Upload({
      client: s3Client,
      params: uploadParams,
    });

    const result = await upload.done();
    
    console.log('S3 Upload successful:', result.Location);
    return result.Location;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    
    // Handle specific AWS errors
    if (error.name === 'CredentialsProviderError') {
      throw new Error('AWS credentials are invalid or not configured properly. Please check your .env file or AWS credentials file.');
    } else if (error.name === 'NoSuchBucket') {
      throw new Error(`S3 bucket '${process.env.AWS_S3_BUCKET_NAME}' does not exist`);
    } else if (error.name === 'AccessDenied') {
      throw new Error('Access denied to S3 bucket. Check your AWS permissions');
    } else if (error.name === 'InvalidAccessKeyId') {
      throw new Error('Invalid AWS Access Key ID');
    } else if (error.name === 'SignatureDoesNotMatch') {
      throw new Error('Invalid AWS Secret Access Key');
    }
    
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

module.exports = {
  createS3ClientWithProvider,
  uploadToS3WithProvider,
};
