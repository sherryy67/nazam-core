const express = require('express');
const multer = require('multer');
const { uploadToS3 } = require('../config/s3-final');
const { sendSuccess, sendError, sendValidationError, sendServerError } = require('../utils/response');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to validate file types (optional - customize as needed)
const fileFilter = (req, file, cb) => {
  // Allow common file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file to AWS S3
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 exception:
 *                   type: string
 *                   example: null
 *                 description:
 *                   type: string
 *                   example: "File uploaded successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: "https://bucket-name.s3.region.amazonaws.com/uploads/1234567890-filename.jpg"
 *                     filename:
 *                       type: string
 *                       example: "image.jpg"
 *                     size:
 *                       type: number
 *                       example: 1024000
 *                     mimetype:
 *                       type: string
 *                       example: "image/jpeg"
 *       400:
 *         description: Bad request - No file provided or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 exception:
 *                   type: string
 *                   example: "NO_FILE"
 *                 description:
 *                   type: string
 *                   example: "No file provided"
 *                 content:
 *                   type: object
 *                   example: null
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 exception:
 *                   type: string
 *                   example: "UPLOAD_ERROR"
 *                 description:
 *                   type: string
 *                   example: "Failed to upload file to S3"
 *                 content:
 *                   type: object
 *                   example: null
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    // Check if file was provided
    if (!req.file) {
      return sendError(res, 400, 'No file provided', 'NO_FILE');
    }

    // Upload file to S3
    const fileUrl = await uploadToS3(req.file);

    // Return success response with file URL
    return sendSuccess(res, 200, 'File uploaded successfully', {
      url: fileUrl,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload Error:', error);
    
    // Handle specific error types with appropriate response functions
    if (error.message.includes('Invalid file type')) {
      return sendValidationError(res, error.message, [
        { field: 'file', message: 'Invalid file type. Only images, PDFs, and documents are allowed.' }
      ]);
    }
    
    if (error.message.includes('File too large')) {
      return sendValidationError(res, 'File size exceeds 10MB limit', [
        { field: 'file', message: 'File size must be less than 10MB' }
      ]);
    }

    // Handle AWS S3 specific errors
    if (error.message.includes('AWS credentials')) {
      return sendServerError(res, 'AWS configuration error. Please contact support.', 'AWS_CONFIG_ERROR');
    }

    if (error.message.includes('S3 bucket')) {
      return sendServerError(res, 'Storage service unavailable. Please try again later.', 'STORAGE_UNAVAILABLE');
    }

    // Generic server error response
    return sendServerError(res, error.message || 'Failed to upload file', 'UPLOAD_ERROR');
  }
});

// Multer error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return sendValidationError(res, 'File size exceeds 10MB limit', [
        { field: 'file', message: 'File size must be less than 10MB' }
      ]);
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return sendValidationError(res, 'Too many files uploaded', [
        { field: 'file', message: 'Only one file is allowed per request' }
      ]);
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return sendValidationError(res, 'Unexpected file field', [
        { field: 'file', message: 'File must be uploaded with field name "file"' }
      ]);
    }
    
    return sendValidationError(res, 'File upload error', [
      { field: 'file', message: error.message }
    ]);
  }
  
  // Handle other errors
  if (error.message.includes('Invalid file type')) {
    return sendValidationError(res, error.message, [
      { field: 'file', message: 'Invalid file type. Only images, PDFs, and documents are allowed.' }
    ]);
  }
  
  next(error);
});

module.exports = router;
