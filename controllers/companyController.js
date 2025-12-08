const Company = require('../models/Company');
const Vendor = require('../models/Vendor');
const { sendSuccess, sendError, sendNotFoundError } = require('../utils/response');

/**
 * @desc    Register new company
 * @route   POST /api/companies/register
 * @access  Public
 */
const registerCompany = async (req, res, next) => {
  try {
    const {
      companyName,
      registrationNumber,
      taxId,
      industry,
      description,
      email,
      countryCode,
      mobileNumber,
      phoneNumber,
      address,
      country,
      city,
      pinCode,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      bankingInfo,
      kycInfo
    } = req.body;

    // Check if company email already exists
    const existingCompany = await Company.findOne({
      $or: [
        { email },
        { adminEmail },
        { registrationNumber }
      ]
    });

    if (existingCompany) {
      return sendError(res, 400, 'Company with this email or registration number already exists', 'COMPANY_EXISTS');
    }

    // Create company
    const company = new Company({
      companyName,
      registrationNumber,
      taxId,
      industry,
      description,
      email,
      countryCode,
      mobileNumber,
      phoneNumber,
      address,
      country,
      city,
      pinCode,
      adminFirstName,
      adminLastName,
      adminEmail,
      adminPassword,
      bankingInfo: bankingInfo || {},
      kycInfo: kycInfo || {}
    });

    await company.save();

    // Generate auth token
    const token = company.generateAuthToken();

    sendSuccess(res, 201, 'Company registered successfully', {
      company: company.toJSON(),
      token
    });

  } catch (error) {
    console.error('Error registering company:', error);
    if (error.code === 11000) {
      return sendError(res, 400, 'Company with this information already exists', 'DUPLICATE_COMPANY');
    }
    next(error);
  }
};

/**
 * @desc    Company login
 * @route   POST /api/companies/login
 * @access  Public
 */
const loginCompany = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find company by admin email
    const company = await Company.findOne({ adminEmail: email });
    if (!company) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check password
    const isPasswordValid = await company.compareAdminPassword(password);
    if (!isPasswordValid) {
      return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
    }

    // Check if company is approved and not blocked
    if (!company.approved || company.blocked) {
      return sendError(res, 403, 'Company account is not active', 'COMPANY_NOT_ACTIVE');
    }

    // Generate token
    const token = company.generateAuthToken();

    sendSuccess(res, 200, 'Login successful', {
      company: company.toJSON(),
      token
    });

  } catch (error) {
    console.error('Error logging in company:', error);
    next(error);
  }
};

/**
 * @desc    Submit KYC documents for company
 * @route   PATCH /api/companies/me/kyc
 * @access  Private (Company Admin only)
 */
const submitCompanyKYC = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const {
      businessLicense,
      taxCertificate,
      additionalDocuments
    } = req.body;

    // Find company
    const company = await Company.findById(companyId);
    if (!company) {
      return sendNotFoundError(res, 'Company not found');
    }

    // Check if company is approved and not blocked
    if (!company.approved || company.blocked) {
      return sendError(res, 403, 'Company account is not active', 'COMPANY_NOT_ACTIVE');
    }

    // Validate required documents
    if (!businessLicense) {
      return sendError(res, 400, 'Business license is required', 'MISSING_BUSINESS_LICENSE');
    }

    // Prepare KYC data
    const kycData = {
      businessLicense,
      kycStatus: 'pending',
      kycSubmittedAt: new Date()
    };

    if (taxCertificate) kycData.taxCertificate = taxCertificate;
    if (additionalDocuments && Array.isArray(additionalDocuments)) {
      kycData.additionalDocuments = additionalDocuments;
    }

    // Update company KYC info
    company.kycInfo = { ...company.kycInfo, ...kycData };
    await company.save();

    sendSuccess(res, 200, 'Company KYC documents submitted successfully', {
      company: {
        _id: company._id,
        companyName: company.companyName,
        kycStatus: company.kycInfo.kycStatus,
        kycSubmittedAt: company.kycInfo.kycSubmittedAt
      }
    });

  } catch (error) {
    console.error('Error submitting company KYC:', error);
    next(error);
  }
};

/**
 * @desc    Admin verify company KYC
 * @route   PATCH /api/admin/companies/:companyId/kyc-verify
 * @access  Private (Admin only)
 */
const verifyCompanyKYC = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { status, rejectionReason } = req.body;
    const adminId = req.admin.id;

    // Validate companyId
    if (!companyId || !companyId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid company ID format', 'INVALID_COMPANY_ID');
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return sendError(res, 400, 'Invalid status. Must be approved or rejected', 'INVALID_STATUS');
    }

    // If rejecting, rejection reason is required
    if (status === 'rejected' && !rejectionReason) {
      return sendError(res, 400, 'Rejection reason is required when rejecting KYC', 'MISSING_REJECTION_REASON');
    }

    // Find company
    const company = await Company.findById(companyId);
    if (!company) {
      return sendNotFoundError(res, 'Company not found');
    }

    // Check if KYC is pending
    if (company.kycInfo.kycStatus !== 'pending') {
      return sendError(res, 400, 'KYC is not in pending status', 'KYC_NOT_PENDING');
    }

    // Update KYC status
    company.kycInfo.kycStatus = status;
    company.kycInfo.kycVerifiedAt = new Date();
    company.kycInfo.kycVerifiedBy = adminId;

    if (status === 'rejected') {
      company.kycInfo.kycRejectionReason = rejectionReason;
    }

    await company.save();

    sendSuccess(res, 200, `Company KYC ${status} successfully`, {
      company: {
        _id: company._id,
        companyName: company.companyName,
        email: company.email,
        kycStatus: company.kycInfo.kycStatus,
        kycVerifiedAt: company.kycInfo.kycVerifiedAt,
        ...(status === 'rejected' && { kycRejectionReason: company.kycInfo.kycRejectionReason })
      }
    });

  } catch (error) {
    console.error('Error verifying company KYC:', error);
    next(error);
  }
};

/**
 * @desc    Get company profile
 * @route   GET /api/companies/me
 * @access  Private (Company Admin only)
 */
const getCompanyProfile = async (req, res, next) => {
  try {
    const companyId = req.company.id;

    const company = await Company.findById(companyId)
      .populate('staffVendors.vendorId', 'firstName lastName email type approved blocked')
      .select('-adminPassword');

    if (!company) {
      return sendNotFoundError(res, 'Company not found');
    }

    sendSuccess(res, 200, 'Company profile retrieved successfully', {
      company: company.toJSON()
    });

  } catch (error) {
    console.error('Error getting company profile:', error);
    next(error);
  }
};

/**
 * @desc    Add staff vendor to company
 * @route   POST /api/companies/:companyId/staff
 * @access  Private (Company Admin only)
 */
const addStaffVendor = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { vendorId } = req.body;
    const requestingCompanyId = req.company.id;

    // Validate that company admin is managing their own company
    if (companyId !== requestingCompanyId) {
      return sendError(res, 403, 'You can only manage your own company staff', 'UNAUTHORIZED_COMPANY_ACCESS');
    }

    // Validate vendorId
    if (!vendorId || !vendorId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid vendor ID format', 'INVALID_VENDOR_ID');
    }

    // Find company
    const company = await Company.findById(companyId);
    if (!company) {
      return sendNotFoundError(res, 'Company not found');
    }

    // Check if company is approved and not blocked
    if (!company.approved || company.blocked) {
      return sendError(res, 403, 'Company account is not active', 'COMPANY_NOT_ACTIVE');
    }

    // Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return sendNotFoundError(res, 'Vendor not found');
    }

    // Check if vendor is individual and approved
    if (vendor.type !== 'individual' || !vendor.approved || vendor.blocked) {
      return sendError(res, 400, 'Vendor must be an approved individual vendor', 'INVALID_VENDOR_TYPE');
    }

    // Check if vendor is already staff of another company
    if (vendor.companyId && vendor.companyId.toString() !== companyId) {
      return sendError(res, 400, 'Vendor is already staff of another company', 'VENDOR_ALREADY_STAFF');
    }

    // Add vendor as staff
    await company.addStaffVendor(vendorId);

    // Update vendor record
    vendor.companyId = companyId;
    vendor.isStaff = true;
    await vendor.save();

    sendSuccess(res, 200, 'Staff vendor added successfully', {
      company: {
        _id: company._id,
        companyName: company.companyName
      },
      vendor: {
        _id: vendor._id,
        firstName: vendor.firstName,
        lastName: vendor.lastName,
        email: vendor.email
      }
    });

  } catch (error) {
    console.error('Error adding staff vendor:', error);
    next(error);
  }
};

/**
 * @desc    Get company staff vendors
 * @route   GET /api/companies/:companyId/staff
 * @access  Private (Company Admin only)
 */
const getCompanyStaff = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const requestingCompanyId = req.company.id;

    // Validate that company admin is accessing their own company
    if (companyId !== requestingCompanyId) {
      return sendError(res, 403, 'You can only view your own company staff', 'UNAUTHORIZED_COMPANY_ACCESS');
    }

    // Find company with populated staff
    const company = await Company.findById(companyId)
      .populate('staffVendors.vendorId', 'firstName lastName email mobileNumber serviceId availabilitySchedule unavailableDates approved blocked kycInfo')
      .select('staffVendors');

    if (!company) {
      return sendNotFoundError(res, 'Company not found');
    }

    sendSuccess(res, 200, 'Company staff retrieved successfully', {
      staff: company.staffVendors.map(staff => ({
        ...staff.vendorId.toJSON(),
        addedAt: staff.addedAt
      }))
    });

  } catch (error) {
    console.error('Error getting company staff:', error);
    next(error);
  }
};

/**
 * @desc    Update company banking information
 * @route   PATCH /api/companies/me/banking
 * @access  Private (Company Admin only)
 */
const updateCompanyBanking = async (req, res, next) => {
  try {
    const companyId = req.company.id;
    const {
      bankName,
      branchName,
      bankAccountNumber,
      iban,
      vatRegistration,
      collectTax
    } = req.body;

    // Find company
    const company = await Company.findById(companyId);
    if (!company) {
      return sendNotFoundError(res, 'Company not found');
    }

    // Check if company is approved and not blocked
    if (!company.approved || company.blocked) {
      return sendError(res, 403, 'Company account is not active', 'COMPANY_NOT_ACTIVE');
    }

    // Validate banking info
    if (!bankName || !branchName || !bankAccountNumber) {
      return sendError(res, 400, 'Bank name, branch name, and account number are required', 'MISSING_BANKING_INFO');
    }

    // Update banking info
    const bankingData = {
      bankName,
      branchName,
      bankAccountNumber,
      iban,
      vatRegistration: vatRegistration || false,
      collectTax: collectTax || false,
      bankingVerified: false // Reset verification when info is updated
    };

    company.bankingInfo = { ...company.bankingInfo, ...bankingData };
    await company.save();

    sendSuccess(res, 200, 'Company banking information updated successfully', {
      company: {
        _id: company._id,
        companyName: company.companyName,
        bankingInfo: {
          bankName: company.bankingInfo.bankName,
          bankingVerified: company.bankingInfo.bankingVerified
        }
      }
    });

  } catch (error) {
    console.error('Error updating company banking:', error);
    next(error);
  }
};

/**
 * @desc    Admin verify company banking information
 * @route   PATCH /api/admin/companies/:companyId/banking-verify
 * @access  Private (Admin only)
 */
const verifyCompanyBanking = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const adminId = req.admin.id;

    // Validate companyId
    if (!companyId || !companyId.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid company ID format', 'INVALID_COMPANY_ID');
    }

    // Find company
    const company = await Company.findById(companyId);
    if (!company) {
      return sendNotFoundError(res, 'Company not found');
    }

    // Check if banking info exists
    if (!company.bankingInfo.bankName) {
      return sendError(res, 400, 'Company has not submitted banking information', 'NO_BANKING_INFO');
    }

    // Verify banking info
    company.bankingInfo.bankingVerified = true;
    company.bankingInfo.verifiedAt = new Date();
    company.bankingInfo.verifiedBy = adminId;

    await company.save();

    sendSuccess(res, 200, 'Company banking information verified successfully', {
      company: {
        _id: company._id,
        companyName: company.companyName,
        email: company.email,
        bankingInfo: {
          bankName: company.bankingInfo.bankName,
          bankingVerified: company.bankingInfo.bankingVerified,
          verifiedAt: company.bankingInfo.verifiedAt
        }
      }
    });

  } catch (error) {
    console.error('Error verifying company banking:', error);
    next(error);
  }
};

module.exports = {
  registerCompany,
  loginCompany,
  submitCompanyKYC,
  verifyCompanyKYC,
  getCompanyProfile,
  addStaffVendor,
  getCompanyStaff,
  updateCompanyBanking,
  verifyCompanyBanking
};
