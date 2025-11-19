const multer = require('multer');
const path = require('path');

// Get bucket name from environment variable
const bucketName = process.env.AWS_BUCKET || process.env.AWS_S3_BUCKET_NAME;

if (!bucketName) {
  throw new Error('AWS_BUCKET or AWS_S3_BUCKET_NAME environment variable is required');
}

// Try to use multer-s3 with AWS SDK v2 (multer-s3 requires aws-sdk v2)
// If not available, fall back to memory storage and manual S3 upload
let upload;
let useMulterS3 = false;
let uploadToS3 = null; // Will be set if multer-s3 is not available

try {
  const multerS3 = require('multer-s3');
  const AWS = require('aws-sdk');
  
  // Create S3 client using AWS SDK v2 (required for multer-s3)
  const s3Client = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });

  // Configure multer-s3 for banner uploads
  upload = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: bucketName,
      acl: 'public-read',
      key: function (req, file, cb) {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const uniqueSuffix = Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
        const key = `banners/${timestamp}-${uniqueSuffix}-${name}${ext}`;
        cb(null, key);
      },
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: function (req, file, cb) {
        cb(null, {
          fieldName: file.fieldname,
          originalName: file.originalname
        });
      }
    }),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
      // Accept images and videos
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo'
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
      }
    }
  });
  
  useMulterS3 = true;
  console.log('Using multer-s3 with AWS SDK v2 for banner uploads');
} catch (error) {
  // Fallback to memory storage - file will be uploaded to S3 manually in controller
  console.log('multer-s3 not available, using memory storage. Install aws-sdk v2 and multer-s3 for direct S3 uploads.');
  
  const { S3Client } = require('@aws-sdk/client-s3');
  const { Upload } = require('@aws-sdk/lib-storage');
  
  // Store S3 upload function for use in controller
  uploadToS3 = async (file) => {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });

    const timestamp = Date.now();
    const uniqueSuffix = Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const key = `banners/${timestamp}-${uniqueSuffix}-${name}${ext}`;

    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'
      }
    });

    const result = await upload.done();
    return result.Location;
  };

  upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
      // Accept images and videos
      const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo'
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
      }
    }
  });

  // Attach upload function to req for controller use
  upload.uploadToS3 = uploadToS3;
}

// Middleware for single file upload (optional - file not required for updates)
const uploadBanner = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    // Multer errors - handle gracefully
    if (err) {
      // If it's a "no file" type error, that's okay for updates
      if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.message?.includes('No file')) {
        // No file provided - this is acceptable for updates
        return next();
      }
      // For other multer errors, pass them along
      return next(err);
    }
    // No error, continue
    next();
  });
};

// Export the middleware, flag, and upload function
module.exports = uploadBanner;
module.exports.useMulterS3 = useMulterS3;
if (uploadToS3) {
  module.exports.uploadToS3 = uploadToS3;
}

