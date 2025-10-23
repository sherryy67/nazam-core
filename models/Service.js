const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },       // e.g. AC Cleaning
  description: { type: String },
  basePrice: { type: Number, required: true },  // price per unit/hour
  unitType: { type: String, enum: ["per_unit", "per_hour"], required: true },
  imageUri: { type: String },                   // optional image URL for the service
  
  // New fields for enhanced service management
  category_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Category", 
    required: true 
  },
  service_icon: { type: String },               // S3 image URL for service icon
  min_time_required: { 
    type: Number, 
    required: true,
    min: 1,
    max: 1440 // Maximum 24 hours in minutes
  },
  availability: [{ 
    type: String, 
    enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one day must be selected for availability'
    }
  }],
  job_service_type: { 
    type: String, 
    enum: ["OnTime", "Scheduled", "Quotation"],
    required: true 
  },
  order_name: { 
    type: String,
    required: function() {
      return this.job_service_type === "Quotation";
    }
  },
  price_type: { 
    type: String, 
    enum: ["30min", "1hr", "1day", "fixed"],
    required: function() {
      return this.job_service_type !== "Quotation";
    }
  },
  subservice_type: { 
    type: String, 
    enum: ["single", "multiple"],
    required: function() {
      return this.job_service_type !== "Quotation";
    }
  },
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" }
}, { timestamps: true });

module.exports = mongoose.model("Service", serviceSchema);
