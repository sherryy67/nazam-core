/**
 * Seeder script to add sample contentSections, benefits, whyChooseUs,
 * whereWeOffer, youtubeLink, and faqs to an existing service.
 *
 * Usage:
 *   node scripts/seed-service-content.js                  # seeds the first active service
 *   node scripts/seed-service-content.js <serviceId>      # seeds a specific service
 *   node scripts/seed-service-content.js --clear <id>     # clears content fields from a service
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Service = require("../models/Service");

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }
};

const sampleContentData = {
  contentSections: [
    {
      heading: "What's Included in Our Deep Cleaning",
      description:
        "Our comprehensive deep cleaning service covers every corner of your space. We go beyond surface cleaning to ensure a truly spotless result.",
      includedServices: [
        {
          icon: "",
          heading: "Kitchen Deep Cleaning",
          description:
            "Complete degreasing of stovetop, oven, microwave, countertops, cabinet exteriors, and thorough sink sanitization.",
        },
        {
          icon: "",
          heading: "Bathroom Sanitization",
          description:
            "Deep scrub of tiles, grout, shower, bathtub, toilet, and vanity. Mold and limescale removal included.",
        },
        {
          icon: "",
          heading: "Bedroom & Living Areas",
          description:
            "Dusting of all surfaces, ceiling fans, baseboards, door frames, light fixtures, and detailed vacuuming.",
        },
        {
          icon: "",
          heading: "Floor Treatment",
          description:
            "Mopping, vacuuming, and spot-cleaning all floor types including hardwood, tile, and carpet.",
        },
      ],
    },
    {
      heading: "Our Cleaning Process",
      description:
        "We follow a systematic 4-step process to deliver consistent, high-quality results every time.",
      includedServices: [
        {
          icon: "",
          heading: "Assessment",
          description:
            "Our team inspects your space and identifies areas requiring special attention.",
        },
        {
          icon: "",
          heading: "Deep Clean Execution",
          description:
            "Using professional-grade equipment and eco-friendly products for thorough cleaning.",
        },
        {
          icon: "",
          heading: "Quality Check",
          description:
            "A final walkthrough to ensure every area meets our strict quality standards.",
        },
      ],
    },
  ],

  benefits: [
    {
      icon: "",
      heading: "Trained Professionals",
      description:
        "All our cleaners are background-verified and professionally trained.",
    },
    {
      icon: "",
      heading: "Eco-Friendly Products",
      description:
        "We use non-toxic, biodegradable cleaning products safe for kids and pets.",
    },
    {
      icon: "",
      heading: "Satisfaction Guaranteed",
      description:
        "Not happy with the result? We will re-clean at no extra charge.",
    },
    {
      icon: "",
      heading: "Flexible Scheduling",
      description:
        "Book any day of the week at a time that works for you.",
    },
    {
      icon: "",
      heading: "Insured Service",
      description:
        "Full coverage for any accidental damage during the cleaning process.",
    },
    {
      icon: "",
      heading: "On-Time Arrival",
      description:
        "Our teams arrive within the scheduled window, every time.",
    },
  ],

  whyChooseUs: {
    heading: "Why Choose Zush for Cleaning",
    description:
      "With over 5,000 satisfied customers, Zush is the most trusted name in home services. Our vetted professionals use premium equipment and eco-friendly products to deliver spotless results. We offer transparent pricing with no hidden charges, real-time booking, and a 100% satisfaction guarantee. Whether it's a one-time deep clean or regular maintenance, Zush makes it effortless.",
  },

  whereWeOffer: {
    heading: "Where We Offer This Service",
    description:
      "Currently available across Dubai, Abu Dhabi, Sharjah, and Ajman. We are rapidly expanding to more emirates. Enter your location during booking to check availability in your area.",
  },

  youtubeLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",

  faqs: [
    {
      question: "How long does a deep cleaning session take?",
      answer:
        "A standard deep cleaning for a 1-2 bedroom apartment typically takes 3-5 hours. Larger spaces may require more time. Our team will provide an estimate based on your space.",
    },
    {
      question: "Do I need to provide cleaning supplies?",
      answer:
        "No, our team brings all necessary professional-grade equipment and eco-friendly cleaning products. You don't need to provide anything.",
    },
    {
      question: "Can I book for a specific time slot?",
      answer:
        "Yes, you can choose your preferred date and time slot during booking. We offer morning, afternoon, and evening slots.",
    },
    {
      question: "Is there a cancellation policy?",
      answer:
        "You can cancel or reschedule up to 4 hours before your appointment at no charge. Late cancellations may incur a small fee.",
    },
    {
      question: "Are your cleaners background-checked?",
      answer:
        "Absolutely. All Zush professionals undergo thorough background verification, identity checks, and professional training before joining our team.",
    },
  ],

  testimonials: [
    {
      name: "Sarah Ahmed",
      designation: "Homeowner",
      rating: 5,
      description:
        "Absolutely amazing service! The team was punctual, thorough, and left my apartment sparkling clean. I could not believe the difference. Highly recommend Zush to everyone!",
    },
    {
      name: "Mohammed Al Rashid",
      designation: "Business Owner",
      rating: 5,
      description:
        "We have been using Zush for our office cleaning for 6 months now. Consistent quality every single time. Their attention to detail is unmatched.",
    },
    {
      name: "Priya Sharma",
      designation: "Villa Owner",
      rating: 4,
      description:
        "Great deep cleaning service for my 4-bedroom villa. The team was professional and courteous. Only wish they offered weekend slots more frequently.",
    },
    {
      name: "James Wilson",
      designation: "Apartment Tenant",
      rating: 5,
      description:
        "Used Zush for my move-out cleaning and got my full deposit back! The landlord was impressed. Worth every dirham.",
    },
  ],
};

const seedServiceContent = async (serviceId) => {
  try {
    let service;

    if (serviceId) {
      service = await Service.findById(serviceId);
      if (!service) {
        console.error(`No service found with ID: ${serviceId}`);
        return;
      }
    } else {
      service = await Service.findOne({ isActive: true });
      if (!service) {
        service = await Service.findOne();
      }
      if (!service) {
        console.error("No services found in the database.");
        return;
      }
    }

    console.log(`\nTarget service: "${service.name}" (${service._id})\n`);

    const result = await Service.findByIdAndUpdate(
      service._id,
      { $set: sampleContentData },
      { new: true },
    );

    console.log("Content fields seeded successfully:");
    console.log(
      `  - contentSections: ${result.contentSections.length} section(s)`,
    );
    console.log(`  - benefits: ${result.benefits.length} item(s)`);
    console.log(
      `  - whyChooseUs: ${result.whyChooseUs.heading ? "set" : "empty"}`,
    );
    console.log(
      `  - whereWeOffer: ${result.whereWeOffer.heading ? "set" : "empty"}`,
    );
    console.log(`  - youtubeLink: ${result.youtubeLink ? "set" : "empty"}`);
    console.log(`  - faqs: ${result.faqs.length} item(s)`);
    console.log(`  - testimonials: ${result.testimonials.length} item(s)`);
  } catch (error) {
    console.error("Seeder error:", error);
    throw error;
  }
};

const clearServiceContent = async (serviceId) => {
  try {
    let service;

    if (serviceId) {
      service = await Service.findById(serviceId);
    } else {
      service = await Service.findOne({ isActive: true });
    }

    if (!service) {
      console.error("No service found.");
      return;
    }

    console.log(
      `\nClearing content from: "${service.name}" (${service._id})\n`,
    );

    await Service.findByIdAndUpdate(service._id, {
      $set: {
        contentSections: [],
        benefits: [],
        whyChooseUs: { heading: "", description: "" },
        whereWeOffer: { heading: "", description: "" },
        youtubeLink: "",
        faqs: [],
        testimonials: [],
      },
    });

    console.log("Content fields cleared successfully.");
  } catch (error) {
    console.error("Clear error:", error);
    throw error;
  }
};

const run = async () => {
  try {
    await connectDB();

    const args = process.argv.slice(2);
    const isClear = args.includes("--clear");
    const serviceId = args.find((a) => a !== "--clear") || null;

    if (isClear) {
      await clearServiceContent(serviceId);
    } else {
      await seedServiceContent(serviceId);
    }
  } catch (error) {
    console.error("Script failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
    process.exit(0);
  }
};

if (require.main === module) {
  run();
}

module.exports = { seedServiceContent, clearServiceContent };
