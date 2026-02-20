const express = require("express");
const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/roleAuth");
const {
  submitAMCContract,
  getAMCContract,
  getUserAMCContracts,
  getAllAMCContracts,
  updateAMCContractStatus,
  updateAMCContractDetails,
  updateContractServiceRequest,
} = require("../controllers/amcContractController");
const amcAssetRoutes = require("./amcAssets");

const router = express.Router();

/**
 * @swagger
 * /api/amc-contracts:
 *   post:
 *     summary: Submit a new AMC contract with multiple services
 *     tags: [AMC Contracts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - contactPerson
 *               - contactPhone
 *               - contactEmail
 *               - address
 *               - startDate
 *               - services
 *             properties:
 *               companyName:
 *                 type: string
 *               contactPerson:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               address:
 *                 type: string
 *               message:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               services:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - service_id
 *                     - service_name
 *                   properties:
 *                     service_id:
 *                       type: string
 *                     service_name:
 *                       type: string
 *                     category_id:
 *                       type: string
 *                     category_name:
 *                       type: string
 *                     requested_date:
 *                       type: string
 *                       format: date-time
 *                     number_of_units:
 *                       type: number
 *                     durationType:
 *                       type: string
 *                       enum: [hours, days, months]
 *                     duration:
 *                       type: number
 *                     numberOfPersons:
 *                       type: number
 *                     selectedSubServices:
 *                       type: array
 *                     questionAnswers:
 *                       type: array
 *                     message:
 *                       type: string
 *     responses:
 *       201:
 *         description: AMC contract submitted successfully
 *       400:
 *         description: Validation error
 */
router.post("/", protect, submitAMCContract);

/**
 * @swagger
 * /api/amc-contracts/my:
 *   get:
 *     summary: Get logged-in user's AMC contracts
 *     tags: [AMC Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User's AMC contracts retrieved successfully
 */
router.get("/my", protect, getUserAMCContracts);

/**
 * @swagger
 * /api/amc-contracts/{id}:
 *   get:
 *     summary: Get a single AMC contract by ID
 *     tags: [AMC Contracts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AMC contract retrieved successfully
 *       404:
 *         description: Contract not found
 */
router.get("/:id", getAMCContract);

/**
 * @swagger
 * /api/amc-contracts:
 *   get:
 *     summary: Get all AMC contracts (admin only)
 *     tags: [AMC Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Draft, Pending, Active, Completed, Cancelled]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: AMC contracts retrieved successfully
 */
router.get("/", protect, isAdmin, getAllAMCContracts);

/**
 * @swagger
 * /api/amc-contracts/{id}/status:
 *   put:
 *     summary: Update AMC contract status (admin only)
 *     tags: [AMC Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Draft, Pending, Active, Completed, Cancelled]
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.put("/:id/status", protect, isAdmin, updateAMCContractStatus);

/**
 * @swagger
 * /api/amc-contracts/{id}:
 *   put:
 *     summary: Update AMC contract details (admin only)
 *     tags: [AMC Contracts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               adminNotes:
 *                 type: string
 *               totalContractValue:
 *                 type: number
 *     responses:
 *       200:
 *         description: Contract details updated successfully
 */
router.put("/:id", protect, isAdmin, updateAMCContractDetails);

// Update a service request's scheduling within a contract (admin only)
router.put("/:id/service-requests/:srId", protect, isAdmin, updateContractServiceRequest);

// Mount asset sub-routes
router.use("/:id/assets", amcAssetRoutes);

module.exports = router;
