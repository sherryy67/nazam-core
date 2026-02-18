const AMCContract = require("../models/AMCContract");
const ServiceRequest = require("../models/ServiceRequest");
const Service = require("../models/Service");
const mongoose = require("mongoose");
const { sendSuccess, sendError, sendCreated } = require("../utils/response");
const emailService = require("../utils/emailService");

// @desc    Submit an AMC contract with multiple services
// @route   POST /api/amc-contracts
// @access  Public
const submitAMCContract = async (req, res, next) => {
  try {
    const {
      companyName,
      contactPerson,
      contactPhone,
      contactEmail,
      address,
      message,
      startDate,
      endDate,
      services, // Array of cart items
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "companyName",
      "contactPerson",
      "contactPhone",
      "contactEmail",
      "address",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return sendError(
        res,
        400,
        `Missing required fields: ${missingFields.join(", ")}`,
        "MISSING_REQUIRED_FIELDS"
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return sendError(res, 400, "Invalid email format", "INVALID_EMAIL");
    }

    // Validate services array
    if (!Array.isArray(services) || services.length === 0) {
      return sendError(
        res,
        400,
        "At least one service is required in the cart",
        "NO_SERVICES"
      );
    }

    // Separate custom services from platform services
    const platformServices = services.filter((s) => !s.isCustomService);
    const customServices = services.filter((s) => s.isCustomService);

    // Validate custom services have a name
    for (const cs of customServices) {
      if (!cs.customServiceName || !cs.customServiceName.trim()) {
        return sendError(
          res,
          400,
          "Custom services must have a name",
          "INVALID_CUSTOM_SERVICE",
        );
      }
    }

    // Validate platform services exist and are active
    const serviceMap = {};
    if (platformServices.length > 0) {
      const serviceIds = platformServices.map((s) => s.service_id);
      const activeServices = await Service.find({
        _id: { $in: serviceIds },
        isActive: true,
      }).select("+subServices");

      if (activeServices.length !== serviceIds.length) {
        const activeIds = activeServices.map((s) => s._id.toString());
        const invalidIds = serviceIds.filter(
          (id) => !activeIds.includes(id),
        );
        return sendError(
          res,
          400,
          `Some services are invalid or inactive: ${invalidIds.join(", ")}`,
          "INVALID_SERVICES",
        );
      }

      for (const svc of activeServices) {
        serviceMap[svc._id.toString()] = svc;
      }
    }

    // Link contract to logged-in user directly via req.user (set by protect middleware)
    const userId = req.user ? (req.user.id || req.user._id) : null;

    // Calculate endDate (default: 1 year from startDate if provided)
    const contractStartDate = startDate ? new Date(startDate) : null;
    let contractEndDate = null;
    if (contractStartDate) {
      if (endDate) {
        contractEndDate = new Date(endDate);
      } else {
        contractEndDate = new Date(contractStartDate);
        contractEndDate.setFullYear(contractEndDate.getFullYear() + 1);
      }
    }

    // Use a transaction to create the contract and all service requests atomically
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create the AMC contract
      const [amcContract] = await AMCContract.create(
        [
          {
            companyName: companyName.trim(),
            contactPerson: contactPerson.trim(),
            contactPhone: contactPhone.trim(),
            contactEmail: contactEmail.trim().toLowerCase(),
            address: address.trim(),
            message: message ? message.trim() : undefined,
            user: userId || undefined,
            startDate: contractStartDate || undefined,
            endDate: contractEndDate || undefined,
            status: "Pending",
            serviceRequests: [],
          },
        ],
        { session }
      );

      // Create a ServiceRequest for each cart item
      const createdServiceRequests = [];

      for (const cartItem of services) {
        let serviceRequestData;

        if (cartItem.isCustomService) {
          // Custom service — no platform service_id or category_id
          serviceRequestData = {
            user_name: contactPerson.trim(),
            user_phone: contactPhone.trim(),
            user_email: contactEmail.trim().toLowerCase(),
            address: address.trim(),
            service_name: cartItem.customServiceName.trim(),
            category_name: "Custom Service",
            request_type: "Quotation",
            requested_date: cartItem.requested_date
              ? new Date(cartItem.requested_date)
              : contractStartDate || new Date(),
            message: cartItem.customServiceDescription
              ? cartItem.customServiceDescription.trim()
              : cartItem.message
                ? cartItem.message.trim()
                : undefined,
            status: "Pending",
            number_of_units:
              cartItem.number_of_units || cartItem.quantity || 1,
            paymentMethod: "Cash On Delivery",
            user: userId || undefined,
            amcContract: amcContract._id,
            isCustomService: true,
            customServiceName: cartItem.customServiceName.trim(),
            customServiceDescription: cartItem.customServiceDescription
              ? cartItem.customServiceDescription.trim()
              : undefined,
          };
        } else {
          // Platform service — existing logic
          const service = serviceMap[cartItem.service_id];
          if (!service) continue;

          serviceRequestData = {
            user_name: contactPerson.trim(),
            user_phone: contactPhone.trim(),
            user_email: contactEmail.trim().toLowerCase(),
            address: address.trim(),
            service_id: cartItem.service_id,
            service_name: cartItem.service_name || service.name,
            category_id: cartItem.category_id || service.category_id,
            category_name: cartItem.category_name || "",
            request_type: "Quotation",
            requested_date: cartItem.requested_date
              ? new Date(cartItem.requested_date)
              : contractStartDate || new Date(),
            message: cartItem.message ? cartItem.message.trim() : undefined,
            status: "Pending",
            number_of_units:
              cartItem.number_of_units || cartItem.quantity || 1,
            paymentMethod: "Cash On Delivery",
            user: userId || undefined,
            amcContract: amcContract._id,
          };

          // Add duration/persons if provided
          if (cartItem.durationType) {
            serviceRequestData.durationType = cartItem.durationType;
            serviceRequestData.duration = cartItem.duration
              ? Number(cartItem.duration)
              : 1;
          }
          if (cartItem.numberOfPersons) {
            serviceRequestData.numberOfPersons = Number(
              cartItem.numberOfPersons,
            );
          }

          // Add selected sub-services if provided
          if (
            Array.isArray(cartItem.selectedSubServices) &&
            cartItem.selectedSubServices.length > 0
          ) {
            serviceRequestData.selectedSubServices =
              cartItem.selectedSubServices.map((selected) => {
                const matchingSub = service.subServices
                  ? service.subServices.find(
                      (sub) =>
                        sub.name.toLowerCase().trim() ===
                        selected.name.toLowerCase().trim(),
                    )
                  : null;
                return {
                  name: matchingSub ? matchingSub.name : selected.name,
                  items: matchingSub
                    ? matchingSub.items || 1
                    : selected.items || 1,
                  rate: matchingSub ? matchingSub.rate : selected.rate || 0,
                  quantity:
                    selected.quantity !== undefined
                      ? parseInt(selected.quantity)
                      : 1,
                };
              });
          }

          // Add question answers if provided
          if (
            Array.isArray(cartItem.questionAnswers) &&
            cartItem.questionAnswers.length > 0
          ) {
            serviceRequestData.questionAnswers = cartItem.questionAnswers
              .filter(
                (qa) => qa.question && qa.answer && qa.answer.trim() !== "",
              )
              .map((qa) => ({
                question: qa.question.trim(),
                answer: qa.answer.trim(),
                questionType: qa.questionType || "text",
              }));
          }
        }

        const [serviceRequest] = await ServiceRequest.create(
          [serviceRequestData],
          { session },
        );
        createdServiceRequests.push(serviceRequest);
      }

      // Update the contract with service request IDs
      amcContract.serviceRequests = createdServiceRequests.map((sr) => sr._id);
      await amcContract.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Send admin notification email (non-blocking)
      try {
        const adminEmail = process.env.ADMIN_EMAIL || "info@zushh.com";
        if (emailService.isValidEmail(adminEmail)) {
          await emailService.sendAdminNotificationEmail(adminEmail, {
            ...createdServiceRequests[0].toObject(),
            service_name: `AMC Contract: ${amcContract.contractNumber} (${createdServiceRequests.length} services)`,
          });
        }
      } catch (emailError) {
        console.error(
          "Failed to send AMC admin notification email:",
          emailError.message
        );
      }

      // Populate service requests for the response
      const populatedContract = await AMCContract.findById(amcContract._id)
        .populate({
          path: "serviceRequests",
          select:
            "service_name service_id category_name status requested_date number_of_units durationType duration numberOfPersons selectedSubServices",
        });

      return sendCreated(res, "AMC contract submitted successfully", {
        amcContract: populatedContract,
      });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single AMC contract by ID
// @route   GET /api/amc-contracts/:id
// @access  Public
const getAMCContract = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid contract ID", "INVALID_ID");
    }

    const contract = await AMCContract.findById(id).populate({
      path: "serviceRequests",
      populate: [
        { path: "service_id", select: "name thumbnailUri service_icon imageUri" },
        { path: "vendor", select: "name phone email" },
      ],
    });

    if (!contract) {
      return sendError(res, 404, "AMC contract not found", "NOT_FOUND");
    }

    return sendSuccess(res, 200, "AMC contract retrieved successfully", {
      contract,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged-in user's AMC contracts
// @route   GET /api/amc-contracts/my
// @access  Protected
const getUserAMCContracts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find contracts by linked user, email, or phone
    // Note: protect middleware sets req.user.id (not _id)
    const query = {};
    if (req.user && (req.user.id || req.user._id)) {
      const userId = req.user.id || req.user._id;
      const matchConditions = [
        { user: userId },
      ];
      if (req.user.email) {
        matchConditions.push({ contactEmail: req.user.email.toLowerCase() });
      }
      // Also fetch user's phone number for matching
      const User = require("../models/User");
      const fullUser = await User.findById(userId).select("phoneNumber");
      if (fullUser && fullUser.phoneNumber) {
        matchConditions.push({ contactPhone: fullUser.phoneNumber });
      }
      query.$or = matchConditions;
    } else {
      return sendError(res, 401, "Not authenticated", "UNAUTHORIZED");
    }

    const [contracts, totalCount] = await Promise.all([
      AMCContract.find(query)
        .populate({
          path: "serviceRequests",
          select:
            "service_name service_id category_name status requested_date total_price paymentType milestones",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AMCContract.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return sendSuccess(res, 200, "User AMC contracts retrieved successfully", {
      contracts,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all AMC contracts (admin)
// @route   GET /api/amc-contracts
// @access  Admin
const getAllAMCContracts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { contractNumber: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { contactEmail: { $regex: search, $options: "i" } },
      ];
    }

    const [contracts, totalCount] = await Promise.all([
      AMCContract.find(query)
        .populate({
          path: "serviceRequests",
          select: "service_name status total_price requested_date",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AMCContract.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return sendSuccess(res, 200, "AMC contracts retrieved successfully", {
      contracts,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update AMC contract status (admin)
// @route   PUT /api/amc-contracts/:id/status
// @access  Admin
const updateAMCContractStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid contract ID", "INVALID_ID");
    }

    const validStatuses = ["Draft", "Pending", "Active", "Completed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return sendError(
        res,
        400,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        "INVALID_STATUS"
      );
    }

    const contract = await AMCContract.findById(id);
    if (!contract) {
      return sendError(res, 404, "AMC contract not found", "NOT_FOUND");
    }

    contract.status = status;
    await contract.save();

    // If cancelled, also cancel all linked service requests
    if (status === "Cancelled") {
      await ServiceRequest.updateMany(
        { amcContract: contract._id, status: { $nin: ["Completed", "Cancelled"] } },
        { status: "Cancelled" }
      );
    }

    return sendSuccess(res, 200, "AMC contract status updated successfully", {
      contract,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update AMC contract details (admin)
// @route   PUT /api/amc-contracts/:id
// @access  Admin
const updateAMCContractDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, adminNotes, totalContractValue } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, "Invalid contract ID", "INVALID_ID");
    }

    const contract = await AMCContract.findById(id);
    if (!contract) {
      return sendError(res, 404, "AMC contract not found", "NOT_FOUND");
    }

    // Update fields if provided
    if (startDate !== undefined) {
      contract.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      contract.endDate = endDate ? new Date(endDate) : null;
    }
    if (adminNotes !== undefined) {
      contract.adminNotes = adminNotes;
    }
    if (totalContractValue !== undefined) {
      contract.totalContractValue = totalContractValue !== null
        ? Number(totalContractValue)
        : null;
    }

    // Auto-calculate endDate if startDate set but endDate not provided
    if (contract.startDate && !contract.endDate) {
      const end = new Date(contract.startDate);
      end.setFullYear(end.getFullYear() + 1);
      contract.endDate = end;
    }

    await contract.save();

    // Return populated contract
    const populatedContract = await AMCContract.findById(id).populate({
      path: "serviceRequests",
      select:
        "service_name service_id category_name status requested_date number_of_units",
    });

    return sendSuccess(res, 200, "AMC contract details updated successfully", {
      contract: populatedContract,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitAMCContract,
  getAMCContract,
  getUserAMCContracts,
  getAllAMCContracts,
  updateAMCContractStatus,
  updateAMCContractDetails,
};
