const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  // Linked service request
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceRequest",
    required: true
  },

  // Assigned vendor
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true
  },

  // Organization (if vendor belongs to one)
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    default: null
  },

  // Task details
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  // Location
  location: { type: String, trim: true },
  city: { type: String, trim: true },

  // Schedule
  taskDate: { type: Date, required: true },
  taskTime: { type: String }, // HH:MM format

  // Service info
  serviceType: { type: String, trim: true },
  serviceName: { type: String, trim: true },

  // Task status flow: Created -> Notified -> Accepted/Cancelled -> InProgress -> Completed
  status: {
    type: String,
    enum: ["Created", "Notified", "Accepted", "Cancelled", "InProgress", "Completed"],
    default: "Created"
  },

  // Vendor response
  vendorResponse: {
    action: { type: String, enum: ["Accepted", "Cancelled"] },
    respondedAt: { type: Date },
    cancellationReason: { type: String, trim: true }
  },

  // Completion details
  completedAt: { type: Date },
  completionNotes: { type: String, trim: true },

  // Pricing
  taskAmount: { type: Number, default: 0 },

  // AMC flag — if true, task was manually assigned (no auto-allocation)
  isAMC: { type: Boolean, default: false },
  amcContract: { type: mongoose.Schema.Types.ObjectId, ref: "AMCContract", default: null },

  // Property tracking (for building owner visibility)
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: "Unit", default: null },

  // Created by
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
}, { timestamps: true });

// Index for vendor task lookups
taskSchema.index({ vendor: 1, status: 1 });
taskSchema.index({ organization: 1, status: 1 });
taskSchema.index({ property: 1 });

module.exports = mongoose.model("Task", taskSchema);
