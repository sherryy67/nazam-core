const AMCAsset = require("../models/AMCAsset");
const AMCContract = require("../models/AMCContract");
const ServiceRequest = require("../models/ServiceRequest");
const mongoose = require("mongoose");
const { sendSuccess, sendError, sendCreated } = require("../utils/response");
const { uploadToS3 } = require("../config/s3-final");

// @desc    Add an asset to an AMC contract
// @route   POST /api/amc-contracts/:id/assets
// @access  Admin
const addAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, linkedServices } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid contract ID", "INVALID_ID");
    }

    if (!name || !name.trim()) {
      return sendError(res, 400, "Asset name is required", "MISSING_NAME");
    }

    // Verify contract exists
    const contract = await AMCContract.findById(id);
    if (!contract) {
      return sendError(res, 404, "AMC Contract not found", "CONTRACT_NOT_FOUND");
    }

    // Upload images to S3
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToS3(file, "amc-assets");
        images.push({
          url,
          filename: file.originalname,
        });
      }
    }

    // Parse linkedServices if it's a JSON string (from multipart form)
    let parsedLinkedServices = [];
    if (linkedServices) {
      try {
        parsedLinkedServices =
          typeof linkedServices === "string"
            ? JSON.parse(linkedServices)
            : linkedServices;
      } catch {
        parsedLinkedServices = [];
      }
    }

    // Validate linked services belong to this contract
    if (parsedLinkedServices.length > 0) {
      const validServices = await ServiceRequest.find({
        _id: { $in: parsedLinkedServices },
        amcContract: id,
      });
      parsedLinkedServices = validServices.map((s) => s._id);
    }

    const asset = await AMCAsset.create({
      name: name.trim(),
      description: description ? description.trim() : undefined,
      images,
      amcContract: id,
      linkedServices: parsedLinkedServices,
    });

    const populatedAsset = await AMCAsset.findById(asset._id).populate(
      "linkedServices",
      "service_name status"
    );

    return sendCreated(res, "Asset added successfully", populatedAsset);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all assets for an AMC contract
// @route   GET /api/amc-contracts/:id/assets
// @access  Admin
const getAssets = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid contract ID", "INVALID_ID");
    }

    const assets = await AMCAsset.find({ amcContract: id })
      .populate("linkedServices", "service_name status")
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, "Assets retrieved successfully", assets);
  } catch (error) {
    next(error);
  }
};

// @desc    Update an asset
// @route   PUT /api/amc-contracts/:id/assets/:assetId
// @access  Admin
const updateAsset = async (req, res, next) => {
  try {
    const { id, assetId } = req.params;
    const { name, description, removeImages } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(assetId)
    ) {
      return sendError(res, 400, "Invalid ID", "INVALID_ID");
    }

    const asset = await AMCAsset.findOne({ _id: assetId, amcContract: id });
    if (!asset) {
      return sendError(res, 404, "Asset not found", "ASSET_NOT_FOUND");
    }

    // Update name and description
    if (name) asset.name = name.trim();
    if (description !== undefined) asset.description = description.trim();

    // Remove specified images
    if (removeImages) {
      const imagesToRemove =
        typeof removeImages === "string"
          ? JSON.parse(removeImages)
          : removeImages;
      asset.images = asset.images.filter(
        (img) => !imagesToRemove.includes(img.url)
      );
    }

    // Upload and append new images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToS3(file, "amc-assets");
        asset.images.push({
          url,
          filename: file.originalname,
        });
      }
    }

    await asset.save();

    const populatedAsset = await AMCAsset.findById(asset._id).populate(
      "linkedServices",
      "service_name status"
    );

    return sendSuccess(res, 200, "Asset updated successfully", populatedAsset);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an asset
// @route   DELETE /api/amc-contracts/:id/assets/:assetId
// @access  Admin
const deleteAsset = async (req, res, next) => {
  try {
    const { id, assetId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(assetId)
    ) {
      return sendError(res, 400, "Invalid ID", "INVALID_ID");
    }

    const asset = await AMCAsset.findOneAndDelete({
      _id: assetId,
      amcContract: id,
    });

    if (!asset) {
      return sendError(res, 404, "Asset not found", "ASSET_NOT_FOUND");
    }

    return sendSuccess(res, 200, "Asset deleted successfully");
  } catch (error) {
    next(error);
  }
};

// @desc    Link/unlink services to an asset
// @route   PUT /api/amc-contracts/:id/assets/:assetId/link-services
// @access  Admin
const linkServices = async (req, res, next) => {
  try {
    const { id, assetId } = req.params;
    const { linkedServices } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(assetId)
    ) {
      return sendError(res, 400, "Invalid ID", "INVALID_ID");
    }

    const asset = await AMCAsset.findOne({ _id: assetId, amcContract: id });
    if (!asset) {
      return sendError(res, 404, "Asset not found", "ASSET_NOT_FOUND");
    }

    // Validate linked services belong to this contract
    let validServiceIds = [];
    if (Array.isArray(linkedServices) && linkedServices.length > 0) {
      const validServices = await ServiceRequest.find({
        _id: { $in: linkedServices },
        amcContract: id,
      });
      validServiceIds = validServices.map((s) => s._id);
    }

    asset.linkedServices = validServiceIds;
    await asset.save();

    const populatedAsset = await AMCAsset.findById(asset._id).populate(
      "linkedServices",
      "service_name status"
    );

    return sendSuccess(
      res,
      200,
      "Services linked successfully",
      populatedAsset
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addAsset,
  getAssets,
  updateAsset,
  deleteAsset,
  linkServices,
};
