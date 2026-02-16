const mongoose = require("mongoose");

const serviceRequestSchema = new mongoose.Schema({
  // User information
  user_name: { type: String, required: true, trim: true },
  user_phone: { type: String, required: true, trim: true },
  user_email: { type: String, required: true, trim: true, lowercase: true },
  
  // Service information
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: function () { return !this.isCustomService; },
  },
  service_name: { type: String, required: true, trim: true },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: function () { return !this.isCustomService; },
  },
  category_name: { type: String, required: true, trim: true },

  // Custom service (for AMC services not on the platform)
  isCustomService: { type: Boolean, default: false },
  customServiceName: { type: String, trim: true },
  customServiceDescription: { type: String, trim: true },
  
  // Request details
  request_type: { 
    type: String, 
    enum: ["Quotation", "OnTime", "Scheduled"], 
    required: true 
  },
  requested_date: { type: Date, required: true },
  message: { type: String, trim: true },
  
  // Pricing information
  unit_type: { 
    type: String, 
    enum: ["per_unit", "per_hour"], 
    required: function() {
      return this.request_type !== "Quotation";
    }
  },
  unit_price: { 
    type: Number, 
    required: function() {
      return this.request_type !== "Quotation";
    }
  }, // Price per unit or per hour - not required for Quotation requests
  number_of_units: { type: Number, required: true }, // Number of units or hours
  total_price: { 
    type: Number, 
    required: function() {
      return this.request_type !== "Quotation";
    }
  }, // Calculated total price - not required for Quotation requests
  
  // Status and assignment
  status: {
    type: String,
    enum: ["Pending", "Quoted", "Assigned", "Accepted", "InProgress", "Completed", "Cancelled"],
    default: "Pending"
  },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" }, // assigned later
  
  // Payment information
  paymentMethod: {
    type: String,
    enum: ["Cash On Delivery", "Online Payment"],
    default: "Cash On Delivery"
  },
  paymentStatus: {
    type: String,
    enum: ["Pending", "Success", "Failure", "Cancelled"],
    default: "Pending"
  },
  paymentDetails: {
    transactionId: { type: String }, // CCAvenue tracking_id
    orderId: { type: String }, // CCAvenue order_id
    amount: { type: Number },
    currency: { type: String, default: "AED" },
    paymentDate: { type: Date },
    failureReason: { type: String },
    bankReferenceNumber: { type: String }
  },

  // Payment link information (Admin generated)
  paymentLink: {
    token: { type: String, unique: true, sparse: true }, // Secure unique token
    url: { type: String }, // Full payment URL
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    generatedAt: { type: Date },
    expiresAt: { type: Date },
    isExpired: { type: Boolean, default: false },
    isUsed: { type: Boolean, default: false }
  },

  // Milestone Payments (for breaking payments into stages)
  paymentType: {
    type: String,
    enum: ["full", "milestone"],
    default: "full"
  },
  milestones: [{
    name: { type: String, required: true, trim: true }, // e.g., "Initial Deposit", "Work Completion", "Final Payment"
    description: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    percentage: { type: Number, min: 0, max: 100 }, // Optional: percentage of total price
    order: { type: Number, required: true, min: 1 }, // Sequence of milestone
    paymentStatus: {
      type: String,
      enum: ["Pending", "Success", "Failure", "Cancelled"],
      default: "Pending"
    },
    paymentDetails: {
      transactionId: { type: String },
      orderId: { type: String },
      amount: { type: Number },
      currency: { type: String, default: "AED" },
      paymentDate: { type: Date },
      failureReason: { type: String },
      bankReferenceNumber: { type: String }
    },
    // Payment link for this specific milestone
    paymentLink: {
      token: { type: String, unique: true, sparse: true },
      url: { type: String },
      generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
      generatedAt: { type: Date },
      expiresAt: { type: Date },
      isExpired: { type: Boolean, default: false },
      isUsed: { type: Boolean, default: false }
    },
    // Service completion tracking
    completionStatus: {
      type: String,
      enum: ["NotStarted", "InProgress", "Completed"],
      default: "NotStarted"
    },
    completedAt: { type: Date },
    dueDate: { type: Date }, // Expected completion/payment date
    isRequired: { type: Boolean, default: true }, // Must be paid to proceed
    createdAt: { type: Date, default: Date.now }
  }],
  requireSequentialPayment: { type: Boolean, default: true }, // Must pay milestones in order
  
  // Sub-services selection (optional - for services with subServices array)
  selectedSubServices: [{
    name: { type: String, required: true },
    items: { type: Number, default: 1 },
    rate: { type: Number, required: true },
    quantity: { type: Number, default: 1 } // Quantity selected by user
  }],

  // Question answers (optional - for Quotation requests with service questions)
  // Stores user's answers to quotation questions defined in the service
  questionAnswers: [{
    question: { type: String, required: true, trim: true },
    answer: { type: String, trim: true },
    questionType: { type: String, trim: true }
  }],
  
  // AMC Contract link (optional - only for AMC service requests)
  amcContract: { type: mongoose.Schema.Types.ObjectId, ref: "AMCContract", default: null },

  // Admin created order tracking
  createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },

  // Legacy fields (for backward compatibility)
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  address: { type: String, trim: true },
  scheduledDate: { type: Date },
  notes: { type: String, trim: true },
  quantity: { type: Number, default: 1 },      
  hours: { type: Number, default: 0 },         
  totalPrice: { type: Number }, 
}, { timestamps: true });

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
