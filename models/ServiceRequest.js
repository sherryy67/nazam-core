const mongoose = require("mongoose");

const serviceRequestSchema = new mongoose.Schema({
  // User information
  user_name: { type: String, required: true, trim: true },
  user_phone: { type: String, required: true, trim: true },
  user_email: { type: String, required: true, trim: true, lowercase: true },
  
  // Service information
  service_id: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  service_name: { type: String, required: true, trim: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  category_name: { type: String, required: true, trim: true },
  
  // Request details
  request_type: { 
    type: String, 
    enum: ["Quotation", "OnTime", "Scheduled"], 
    required: true 
  },
  requested_date: { type: Date, required: true },
  message: { type: String, trim: true },
  
  // Status and assignment
  status: { 
    type: String, 
    enum: ["Pending", "Accepted", "Completed", "Cancelled"], 
    default: "Pending" 
  },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" }, // assigned later
  
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
