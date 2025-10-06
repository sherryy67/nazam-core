const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

// Validate AWS credentials
const validateAWSCredentials = () => {
  const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET_NAME'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required AWS environment variables: ${missingVars.join(', ')}`);
  }
  
  // Check if credentials are not just placeholder values
  if (process.env.AWS_ACCESS_KEY_ID === 'your_aws_access_key_id' || 
      process.env.AWS_SECRET_ACCESS_KEY === 'your_aws_secret_access_key' ||
      process.env.AWS_S3_BUCKET_NAME === 'your_s3_bucket_name') {
    throw new Error('Please configure your actual AWS credentials in the .env file');
  }
};

// Create S3Client dynamically to ensure credentials are loaded
const createS3Client = () => {
  try {
    validateAWSCredentials();
    
    // Try multiple credential approaches
    const config = {
      region: process.env.AWS_REGION,
      maxAttempts: 3,
      retryMode: 'adaptive',
    };

    // First try with explicit credentials
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    
    return new S3Client(config);
  } catch (error) {
    console.error('AWS Configuration Error:', error.message);
    console.error('Please check your .env file and ensure all AWS variables are properly set.');
    throw error;
  }
};

/**
 * Upload a file to AWS S3
 * @param {Object} file - File object from multer
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
const uploadToS3 = async (file) => {
  try {
    // Create S3Client dynamically to ensure fresh credentials
    const s3Client = createS3Client();
    
    // Generate unique key with timestamp and original filename
    const timestamp = Date.now();
    const fileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
    const key = `uploads/${timestamp}-${fileName}`;

    // Create upload parameters
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ACL: "public-read",
      ContentType: file.mimetype,
      // Remove ACL for now - some buckets don't allow ACL settings
      // ACL: 'public-read', // Make file publicly accessible
    };

    console.log('Uploading to S3:', {
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
      throw new Error('AWS credentials are invalid or not configured properly');
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
  createS3Client,
  uploadToS3,
};
