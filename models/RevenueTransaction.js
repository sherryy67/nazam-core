const mongoose = require("mongoose");

const revenueTransactionSchema = new mongoose.Schema({
  // Linked task (optional - not all revenue comes from tasks)
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    default: null
  },

  // Linked service request
  serviceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServiceRequest"
  },

  // Revenue source
  source: {
    type: String,
    enum: ["task_completion", "payment_received", "status_completed"],
    default: "payment_received"
  },

  // Milestone tracking (for milestone/chunk payments)
  milestoneId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  milestoneName: {
    type: String,
    default: null
  },

  // Parties involved
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    default: null
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    default: null
  },
  propertyOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PropertyOwner",
    default: null
  },

  // Amounts
  totalAmount: { type: Number, required: true },

  // Organization commission split
  organizationCommissionPercent: { type: Number, default: 0 },
  organizationShare: { type: Number, default: 0 },

  // Property owner commission split
  propertyOwnerCommissionPercent: { type: Number, default: 0 },
  propertyOwnerShare: { type: Number, default: 0 },

  // Vendor share (what vendor receives after all commissions)
  vendorShare: { type: Number, default: 0 },

  // Platform share (Zushh cut if any)
  platformShare: { type: Number, default: 0 },

  // Payment status
  paymentStatus: {
    type: String,
    enum: ["Pending", "Processing", "Completed", "Failed"],
    default: "Pending"
  },

  // Payout tracking
  vendorPaidAt: { type: Date },
  organizationPaidAt: { type: Date },
  propertyOwnerPaidAt: { type: Date },

  notes: { type: String, trim: true },
}, { timestamps: true });

revenueTransactionSchema.index({ vendor: 1, paymentStatus: 1 });
revenueTransactionSchema.index({ organization: 1, paymentStatus: 1 });
revenueTransactionSchema.index({ propertyOwner: 1, paymentStatus: 1 });
revenueTransactionSchema.index({ serviceRequest: 1, source: 1 });

module.exports = mongoose.model("RevenueTransaction", revenueTransactionSchema);
