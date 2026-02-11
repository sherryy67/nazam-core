const mongoose = require("mongoose");

const timeBasedPricingSchema = new mongoose.Schema(
  {
    hours: {
      type: Number,
      min: 1,
      required: true,
    },
    price: {
      type: Number,
      min: 0,
      required: true,
    },
  },
  { _id: false },
);

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. AC Cleaning
    description: { type: String },
    basePrice: {
      type: Number,
      required: function () {
        return (
          this.job_service_type !== "Quotation" && this.unitType !== "per_hour"
        );
      },
    }, // price per unit/hour - not required for Quotation services
    unitType: {
      type: String,
      enum: ["per_unit", "per_hour"],
      required: function () {
        return this.job_service_type !== "Quotation";
      },
    },
    imageUri: { type: String }, // optional image URL for the service

    // New fields for enhanced service management
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    service_icon: { type: String },
    thumbnailUri: { type: String }, // S3 image URL for service icon
    minAdvanceHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 720, // Maximum 30 days in hours
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isMarketingService: {
      type: Boolean,
      default: false,
    },
    serviceType: {
      type: String,
      enum: ["residential", "commercial"],
      default: "residential",
    },
    badge: {
      type: String,
      default: "",
    },
    termsCondition: {
      type: String,
      default: "",
    },
    timeBasedPricing: {
      type: [timeBasedPricingSchema],
      default: [],
      validate: {
        validator: function (value) {
          if (this.unitType !== "per_hour") {
            return (
              !value ||
              value.length === 0 ||
              value.every(
                (tier) =>
                  typeof tier.hours === "number" &&
                  tier.hours >= 1 &&
                  typeof tier.price === "number" &&
                  tier.price >= 0,
              )
            );
          }

          if (value === undefined || value === null) {
            return true;
          }

          if (!Array.isArray(value) || value.length === 0) {
            return true;
          }

          return value.every(
            (tier) =>
              typeof tier.hours === "number" &&
              tier.hours >= 1 &&
              typeof tier.price === "number" &&
              tier.price >= 0,
          );
        },
        message:
          "timeBasedPricing tiers must include valid hours and price values",
      },
    },

    // Per Hour rate-based pricing (alternative to timeBasedPricing)
    // When set, user can book by hours, days, or months with person-based pricing
    // Formula: totalPrice = selectedRate × duration × numberOfPersons
    perHourRate: { type: Number, min: 0, default: null }, // Rate for 1 hour per person
    perDayRate: { type: Number, min: 0, default: null }, // Rate for 1 day per person
    perMonthRate: { type: Number, min: 0, default: null }, // Rate for 1 month per person
    availability: [
      {
        type: String,
        enum: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        required: true,
        validate: {
          validator: function (v) {
            return v && v.length > 0;
          },
          message: "At least one day must be selected for availability",
        },
      },
    ],
    job_service_type: {
      type: String,
      enum: ["OnTime", "Scheduled", "Quotation"],
      required: true,
    },
    price_type: {
      type: String,
      enum: ["30min", "1hr", "1day", "fixed"],
      required: function () {
        return this.job_service_type !== "Quotation";
      },
    },
    subservice_type: {
      type: String,
      enum: ["single", "multiple"],
      required: function () {
        return this.job_service_type !== "Quotation";
      },
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },

    // Service assignment and scheduling fields
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    scheduledDate: {
      type: Date,
      required: function () {
        return this.job_service_type === "Scheduled";
      },
    },
    scheduledTime: {
      type: String, // Format: "HH:MM" (24-hour format)
      required: function () {
        return this.job_service_type === "Scheduled";
      },
      validate: {
        validator: function (v) {
          if (!v) return true; // Allow empty if not required
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Time must be in HH:MM format (24-hour)",
      },
    },
    isAssigned: {
      type: Boolean,
      default: false,
    },
    assignedAt: {
      type: Date,
    },

    // Sub-services array (optional nested sub-services)
    subServices: [
      {
        name: { type: String, required: true },
        items: { type: Number, default: 1 },
        rate: { type: Number, required: true },
        max: { type: Number, default: 1 },
      },
    ],

    // Quotation questions (optional - for Quotation service type)
    // Admin can add questions that users can optionally answer when submitting a quotation request
    quotationQuestions: [
      {
        question: { type: String, required: true, trim: true },
        questionType: {
          type: String,
          enum: ["text", "textarea", "number", "select"],
          default: "text",
        },
        options: [{ type: String, trim: true }], // For select type questions
        placeholder: { type: String, trim: true },
        order: { type: Number, default: 0 },
      },
    ],

    // Discount percentage for service
    discount: { type: Number, min: 0, max: 100, default: null },

    // Content sections (all optional - for service detail page)
    contentSections: [
      {
        heading: { type: String, trim: true },
        description: { type: String },
        includedServices: [
          {
            icon: { type: String, trim: true },
            heading: { type: String, trim: true },
            description: { type: String },
          },
        ],
      },
    ],

    benefits: [{ type: String, trim: true }],

    whyChooseUs: {
      heading: { type: String, trim: true, default: "" },
      description: { type: String, default: "" },
    },

    whereWeOffer: {
      heading: { type: String, trim: true, default: "" },
      description: { type: String, default: "" },
    },

    youtubeLink: { type: String, trim: true, default: "" },

    faqs: [
      {
        question: { type: String, trim: true },
        answer: { type: String },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Service", serviceSchema);
