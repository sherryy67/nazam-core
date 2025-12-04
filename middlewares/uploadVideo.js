const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to validate video and image file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Video types
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
    'video/x-matroska',
    // Image types
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files (MP4, MOV, AVI, WMV, WebM, MKV) and image files (JPEG, PNG, GIF, WebP, SVG) are allowed.'), false);
  }
};

// Configure multer for video and image uploads
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos and images
  },
});

// Middleware for single video or image file upload (optional - file not required for updates)
const uploadVideo = (req, res, next) => {
  upload.single('video')(req, res, (err) => {
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

module.exports = uploadVideo;

