const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to validate video file types only
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
    'video/x-matroska'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files (MP4, MOV, AVI, WMV, WebM, MKV) are allowed.'), false);
  }
};

// Configure multer for video uploads
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for videos
  },
});

// Middleware for single video file upload (optional - file not required for updates)
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

