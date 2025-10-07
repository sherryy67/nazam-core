const mongoose = require("mongoose");

const serviceRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" }, // assigned later
  quantity: { type: Number, default: 1 },      
  hours: { type: Number, default: 0 },         
  totalPrice: { type: Number, required: true }, 
  status: { 
    type: String, 
    enum: ["Pending", "Assigned", "InProgress", "Completed", "Cancelled"], 
    default: "Pending" 
  },
  address: { type: String, required: true },
  scheduledDate: { type: Date, required: true },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
