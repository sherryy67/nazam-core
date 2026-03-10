const RevenueTransaction = require('../models/RevenueTransaction');
const Organization = require('../models/Organization');
const Property = require('../models/Property');
const Vendor = require('../models/Vendor');

/**
 * Calculate commission splits for a given amount.
 * @returns {{ orgId, orgCommissionPercent, orgShare, ownerId, ownerCommissionPercent, ownerShare, vendorShare }}
 */
const calculateCommissionSplits = async ({ totalAmount, vendorId, organizationId, propertyId }) => {
  let orgCommissionPercent = 0;
  let orgShare = 0;
  let orgId = organizationId || null;
  let ownerCommissionPercent = 0;
  let ownerShare = 0;
  let ownerId = null;

  // If vendor assigned, check their organization
  if (vendorId && !orgId) {
    const vendor = await Vendor.findById(vendorId).select('organizationId');
    if (vendor && vendor.organizationId) {
      orgId = vendor.organizationId;
    }
  }

  // Calculate organization commission
  if (orgId) {
    const org = await Organization.findById(orgId);
    if (org) {
      orgCommissionPercent = org.commissionPercentage || 0;
      orgShare = (totalAmount * orgCommissionPercent) / 100;
    }
  }

  // Calculate property owner commission
  if (propertyId) {
    const property = await Property.findById(propertyId).populate('owner');
    if (property && property.owner) {
      ownerId = property.owner._id;
      ownerCommissionPercent = property.owner.commissionPercentage || 0;
      ownerShare = (totalAmount * ownerCommissionPercent) / 100;
    }
  }

  const vendorShare = Math.max(totalAmount - orgShare - ownerShare, 0);

  return { orgId, orgCommissionPercent, orgShare, ownerId, ownerCommissionPercent, ownerShare, vendorShare };
};

/**
 * Generate a revenue transaction from a service request (full or milestone payment).
 *
 * For full payments: one revenue record per serviceRequest + source.
 * For milestone payments: one revenue record per serviceRequest + source + milestoneId.
 *
 * @param {Object} options
 * @param {string} options.serviceRequestId - ServiceRequest._id
 * @param {number} options.totalAmount - Amount to split
 * @param {string} [options.vendorId] - Vendor._id (if assigned)
 * @param {string} [options.taskId] - Task._id (if from task flow)
 * @param {string} [options.organizationId] - Organization._id
 * @param {string} [options.propertyId] - Property._id
 * @param {string} options.source - "task_completion" | "payment_received" | "status_completed"
 * @param {string} [options.milestoneId] - Milestone subdoc _id (for milestone payments)
 * @param {string} [options.milestoneName] - Milestone name
 * @returns {Object|null} The created RevenueTransaction or null if skipped/duplicate
 */
const generateRevenueFromServiceRequest = async (options) => {
  try {
    const {
      serviceRequestId,
      totalAmount,
      vendorId,
      taskId,
      organizationId,
      propertyId,
      source,
      milestoneId,
      milestoneName
    } = options;

    if (!serviceRequestId || !totalAmount || totalAmount <= 0) {
      return null;
    }

    // Prevent duplicates: check serviceRequest + source + milestoneId
    const dupeQuery = {
      serviceRequest: serviceRequestId,
      source: source
    };
    if (milestoneId) {
      dupeQuery.milestoneId = milestoneId;
    }
    const existing = await RevenueTransaction.findOne(dupeQuery);
    if (existing) {
      return null; // Already generated
    }

    const splits = await calculateCommissionSplits({ totalAmount, vendorId, organizationId, propertyId });

    const transaction = await RevenueTransaction.create({
      task: taskId || null,
      serviceRequest: serviceRequestId,
      milestoneId: milestoneId || null,
      milestoneName: milestoneName || null,
      vendor: vendorId || null,
      organization: splits.orgId || null,
      propertyOwner: splits.ownerId || null,
      source,
      totalAmount,
      organizationCommissionPercent: splits.orgCommissionPercent,
      organizationShare: splits.orgShare,
      propertyOwnerCommissionPercent: splits.ownerCommissionPercent,
      propertyOwnerShare: splits.ownerShare,
      vendorShare: splits.vendorShare,
      platformShare: 0,
      paymentStatus: source === 'payment_received' ? 'Completed' : 'Pending'
    });

    return transaction;
  } catch (error) {
    console.error('Error generating revenue transaction:', error);
    return null;
  }
};

module.exports = { generateRevenueFromServiceRequest };
