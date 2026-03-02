const express = require("express");
const authRoutes = require("./auth");
const adminRoutes = require("./admin");
const userRoutes = require("./users");
const uploadRoutes = require("./upload");
const serviceRoutes = require("./services");
const requestRoutes = require("./requests");
const categoryRoutes = require("./categories");
const mobileRoutes = require("./mobile");
const serviceRequestRoutes = require("./serviceRequests");
const submitServiceRequestRoutes = require("./submitServiceRequest");
const geminiRoutes = require("./gemini");
const bannerRoutes = require("./banner");
const emailRoutes = require("./email");
const contactRoutes = require("./contact");
const addressRoutes = require("./addresses");
const paymentRoutes = require("./payments");
const marketingRoutes = require("./marketing");
const paymentLinkRoutes = require("./paymentLinks");
const milestoneRoutes = require("./milestones");
const amcContractRoutes = require("./amcContracts");
const { sendSuccess } = require("../utils/response");
const {
  getCategoryServiceSummary,
} = require("../controllers/categoryController");
const { protect } = require("../middlewares/auth");
const { getVideoByKey } = require("../controllers/videoController");

const router = express.Router();

// Mount routes
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/users", userRoutes);
router.use("/upload", uploadRoutes);
router.use("/services", serviceRoutes);
router.use("/requests", requestRoutes);
router.use("/categories", categoryRoutes);
router.use("/mobile", mobileRoutes);
router.use("/service-requests", serviceRequestRoutes);
router.use("/submit-service-requests", submitServiceRequestRoutes);
router.use("/gemini", geminiRoutes);
router.use("/email", emailRoutes);
router.use("/contact", contactRoutes);
router.use("/addresses", addressRoutes);
router.use("/payments", paymentRoutes);
router.use("/marketing", marketingRoutes);
router.use("/milestones", milestoneRoutes);
router.use("/amc-contracts", amcContractRoutes);
router.use("/", paymentLinkRoutes);
router.use("/", bannerRoutes);

/**
 * @swagger
 * /api/videos/{key}:
 *   get:
 *     summary: Get video by key (Public endpoint)
 *     description: Customers can fetch videos by passing the key (e.g., "home", "signup", "service")
 *     tags: [Videos]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: Video key (e.g., "home", "signup", "service")
 *     responses:
 *       200:
 *         description: Video retrieved successfully
 *       400:
 *         description: Missing video key
 *       404:
 *         description: Video not found
 *       500:
 *         description: Server error
 */
router.get("/videos/:key", getVideoByKey);

/**
 * @swagger
 * /api/getCategoryService:
 *   get:
 *     summary: Get categories with up to 3 services and total count
 *     description: Returns each active category with total active services count and up to 3 latest services.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category service summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 exception:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                 description:
 *                   type: string
 *                   example: Category service summary retrieved successfully
 *                 content:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "6700123abc..."
 *                       name:
 *                         type: string
 *                         example: "Home Cleaning"
 *                       totalServices:
 *                         type: number
 *                         example: 12
 *                       services:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "6700..."
 *                             name:
 *                               type: string
 *                               example: "Carpet Cleaning"
 *                             icon:
 *                               type: string
 *                               example: "https://.../icon.png"
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /api/getCategoryService - summarized categories with up to 3 services and total count (JWT protected)
router.get("/getCategoryService", getCategoryServiceSummary);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Server is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-12-01T10:30:00.000Z"
 */
router.get("/health", (req, res) => {
  sendSuccess(res, 200, "Server is running", {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

module.exports = router;
