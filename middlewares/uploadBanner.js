const multer = require('multer');

// Configure multer for memory storage (same as upload.js)
const storage = multer.memoryStorage();

// File filter to validate file types - images and videos only
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
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

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

// Configure multer (same pattern as upload.js)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

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

module.exports = uploadBanner;

