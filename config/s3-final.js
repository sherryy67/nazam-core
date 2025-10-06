const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

/**
 * Final robust S3 configuration
 * This version handles credential issues more comprehensively
 */

// Validate and get credentials
const getCredentials = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION;
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  // Check for missing variables
  const missing = [];
  if (!accessKeyId) missing.push('AWS_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!region) missing.push('AWS_REGION');
  if (!bucketName) missing.push('AWS_S3_BUCKET_NAME');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Check for placeholder values
  if (accessKeyId === 'your_aws_access_key_id' || 
      secretAccessKey === 'your_aws_secret_access_key' ||
      bucketName === 'your_s3_bucket_name') {
    throw new Error('Please configure your actual AWS credentials in the .env file');
  }

  // Validate credential format
  if (!/^AKIA[0-9A-Z]{16}$/.test(accessKeyId)) {
    throw new Error('Invalid AWS Access Key ID format');
  }

  if (!/^[A-Za-z0-9/+=]{40}$/.test(secretAccessKey)) {
    throw new Error('Invalid AWS Secret Access Key format');
  }

  return {
    accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
    region: region.trim(),
    bucketName: bucketName.trim()
  };
};

// Create S3Client with robust error handling
const createS3Client = () => {
  try {
    const credentials = getCredentials();
    
    console.log('Creating S3Client with credentials:', {
      accessKeyId: credentials.accessKeyId.substring(0, 8) + '...',
      region: credentials.region,
      bucketName: credentials.bucketName
    });

    const s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
      maxAttempts: 3,
      retryMode: 'adaptive',
    });

    return s3Client;
  } catch (error) {
    console.error('Failed to create S3Client:', error.message);
    throw error;
  }
};

/**
 * Upload a file to AWS S3
 * @param {Object} file - File object from multer
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
const uploadToS3 = async (file) => {
  let s3Client;
  
  try {
    // Create fresh S3Client for each upload
    s3Client = createS3Client();
    
    // Generate unique key with timestamp and original filename
    const timestamp = Date.now();
    const fileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
    const key = `uploads/${timestamp}-${fileName}`;

    const credentials = getCredentials();

    // Create upload parameters
    const uploadParams = {
      Bucket: credentials.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    console.log('Uploading to S3:', {
      bucket: credentials.bucketName,
      key: key,
      region: credentials.region,
      fileSize: file.buffer.length
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
    console.error('S3 Upload Error Details:', {
      name: error.name,
      message: error.message,
      code: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId
    });
    
    // Handle specific AWS errors with detailed messages
    if (error.name === 'CredentialsProviderError' || error.name === 'InvalidUserID.NotFound') {
      throw new Error('AWS credentials are invalid. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.');
    } else if (error.name === 'NoSuchBucket') {
      throw new Error(`S3 bucket '${process.env.AWS_S3_BUCKET_NAME}' does not exist. Please create the bucket or check the bucket name.`);
    } else if (error.name === 'AccessDenied') {
      throw new Error('Access denied to S3 bucket. Please check your IAM user permissions for S3 access.');
    } else if (error.name === 'InvalidAccessKeyId') {
      throw new Error('Invalid AWS Access Key ID. Please check your AWS_ACCESS_KEY_ID in your .env file.');
    } else if (error.name === 'SignatureDoesNotMatch') {
      throw new Error('Invalid AWS Secret Access Key. Please check your AWS_SECRET_ACCESS_KEY in your .env file.');
    } else if (error.name === 'TokenRefreshRequired') {
      throw new Error('AWS credentials have expired. Please refresh your credentials.');
    } else if (error.message && error.message.includes('Resolved credential object is not valid')) {
      throw new Error('AWS credentials are not properly configured. Please check your .env file and ensure all AWS variables are set correctly.');
    }
    
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

module.exports = {
  createS3Client,
  uploadToS3,
};
