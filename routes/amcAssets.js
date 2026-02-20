const express = require("express");
const multer = require("multer");
const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/roleAuth");
const {
  addAsset,
  getAssets,
  updateAsset,
  deleteAsset,
  linkServices,
} = require("../controllers/amcAssetController");

// mergeParams to access :id from parent router (amcContracts)
const router = express.Router({ mergeParams: true });

// Multer config for image uploads
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, GIF, WebP) are allowed."), false);
  }
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// All routes are admin-protected
router.post("/", protect, isAdmin, upload.array("images", 10), addAsset);
router.get("/", protect, isAdmin, getAssets);
router.put("/:assetId", protect, isAdmin, upload.array("images", 10), updateAsset);
router.delete("/:assetId", protect, isAdmin, deleteAsset);
router.put("/:assetId/link-services", protect, isAdmin, linkServices);

module.exports = router;
