/**
 * @swagger
 * tags:
 *   name: Revenue
 *   description: Revenue tracking and commission management
 */

/**
 * @swagger
 * /api/revenue:
 *   get:
 *     summary: Get all revenue transactions (Admin)
 *     tags: [Revenue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [Pending, Processing, Completed, Failed]
 *       - in: query
 *         name: vendorId
 *         schema:
 *           type: string
 *         description: Filter by vendor ObjectId
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *         description: Filter by organization ObjectId
 *       - in: query
 *         name: propertyOwnerId
 *         schema:
 *           type: string
 *         description: Filter by property owner ObjectId
 *     responses:
 *       200:
 *         description: Revenue transactions with summary and pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 content:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         totalVendorShare:
 *                           type: number
 *                         totalOrganizationShare:
 *                           type: number
 *                         totalPropertyOwnerShare:
 *                           type: number
 *                         totalPlatformShare:
 *                           type: number
 *                         pendingAmount:
 *                           type: number
 *                         completedAmount:
 *                           type: number
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         page:
 *                           type: number
 *                         pages:
 *                           type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/revenue/{id}/status:
 *   put:
 *     summary: Update revenue transaction payment status (Admin)
 *     tags: [Revenue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Revenue transaction ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentStatus]
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [Pending, Processing, Completed, Failed]
 *                 example: Completed
 *     responses:
 *       200:
 *         description: Revenue status updated. If set to Completed, timestamps are set for vendor/org/owner paid dates.
 *       400:
 *         description: Invalid payment status
 *       404:
 *         description: Transaction not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/revenue/organization:
 *   get:
 *     summary: Get revenue for logged-in organization
 *     tags: [Revenue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [Pending, Processing, Completed, Failed]
 *     responses:
 *       200:
 *         description: Organization revenue with summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 content:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         organizationShare:
 *                           type: number
 *                         vendorShare:
 *                           type: number
 *                         pendingPayments:
 *                           type: number
 *                         completedPayments:
 *                           type: number
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/revenue/property-owner:
 *   get:
 *     summary: Get revenue for logged-in property owner
 *     tags: [Revenue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Property owner revenue with summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 content:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         propertyOwnerShare:
 *                           type: number
 *                         pendingPayments:
 *                           type: number
 *                         completedPayments:
 *                           type: number
 *                     pagination:
 *                       type: object
 *       401:
 *         description: Unauthorized
 */
