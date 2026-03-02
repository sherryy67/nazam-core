const mongoose = require("mongoose");

const amcContractSchema = new mongoose.Schema({
  // Auto-generated contract number
  contractNumber: { type: String, unique: true },

  // Client information
  companyName: { type: String, required: true, trim: true },
  contactPerson: { type: String, required: true, trim: true },
  contactPhone: { type: String, required: true, trim: true },
  contactEmail: { type: String, required: true, trim: true, lowercase: true },
  address: { type: String, required: true, trim: true },

  // Linked user (if they have an account)
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

  // Contract period
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  // Linked service requests (each service in the cart becomes a ServiceRequest)
  serviceRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "ServiceRequest" }],

  // Contract status
  status: {
    type: String,
    enum: ["Draft", "Pending", "Active", "Completed", "Cancelled"],
    default: "Pending"
  },

  // Contract-level pricing (set by admin after negotiation)
  totalContractValue: { type: Number, default: null },

  // Notes
  message: { type: String, trim: true },
  adminNotes: { type: String, trim: true },

  // Created by
  createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
}, { timestamps: true });

// Auto-generate contractNumber before saving
amcContractSchema.pre("save", async function (next) {
  if (this.isNew && !this.contractNumber) {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    // Count existing contracts for today to generate sequence
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const count = await mongoose.model("AMCContract").countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd }
    });

    const seq = String(count + 1).padStart(4, "0");
    this.contractNumber = `AMC-${dateStr}-${seq}`;
  }

  // Auto-set endDate to 1 year from startDate if not provided differently
  if (this.isNew && this.startDate && !this.endDate) {
    const end = new Date(this.startDate);
    end.setFullYear(end.getFullYear() + 1);
    this.endDate = end;
  }

  next();
});

module.exports = mongoose.model("AMCContract", amcContractSchema);
