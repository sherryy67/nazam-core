/**
 * @swagger
 * tags:
 *   name: Referral Codes
 *   description: Property owner referral code management for tenant linking
 */

/**
 * @swagger
 * /api/referral-codes:
 *   post:
 *     summary: Generate referral code (Property Owner)
 *     tags: [Referral Codes]
 *     security:
 *       - bearerAuth: []
 *     description: Generates a unique referral code linked to a property (and optionally a unit). Tenants can redeem this code to link themselves to the property.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [propertyId]
 *             properties:
 *               propertyId:
 *                 type: string
 *                 description: Property ObjectId
 *               unitId:
 *                 type: string
 *                 description: Unit ObjectId (optional - links code to specific unit)
 *               expiresInDays:
 *                 type: number
 *                 default: 7
 *                 example: 7
 *                 description: Number of days until code expires
 *               maxUses:
 *                 type: number
 *                 default: 1
 *                 example: 1
 *                 description: Maximum number of times code can be redeemed
 *     responses:
 *       201:
 *         description: Referral code generated
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
 *                     referralCode:
 *                       type: object
 *                       properties:
 *                         code:
 *                           type: string
 *                           example: ABC12345
 *                         property:
 *                           type: string
 *                           example: Sunrise Tower
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *                         maxUses:
 *                           type: number
 *       400:
 *         description: Missing property ID or invalid unit
 *       403:
 *         description: Property does not belong to owner
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/referral-codes:
 *   get:
 *     summary: Get my referral codes (Property Owner)
 *     tags: [Referral Codes]
 *     security:
 *       - bearerAuth: []
 *     description: Returns all referral codes for the logged-in property owner with validity status
 *     responses:
 *       200:
 *         description: Referral codes list with validity info
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
 *                     referralCodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           code:
 *                             type: string
 *                           property:
 *                             type: object
 *                           unit:
 *                             type: object
 *                             nullable: true
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                           maxUses:
 *                             type: number
 *                           usedCount:
 *                             type: number
 *                           isActive:
 *                             type: boolean
 *                           isValid:
 *                             type: boolean
 *                           isExpired:
 *                             type: boolean
 *                           usedBy:
 *                             type: array
 *                             items:
 *                               type: object
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/referral-codes/{id}/deactivate:
 *   put:
 *     summary: Deactivate referral code (Property Owner)
 *     tags: [Referral Codes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Referral code ObjectId
 *     responses:
 *       200:
 *         description: Referral code deactivated
 *       404:
 *         description: Referral code not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/referral-codes/redeem:
 *   post:
 *     summary: Redeem referral code (User/Tenant)
 *     tags: [Referral Codes]
 *     security:
 *       - bearerAuth: []
 *     description: User redeems a referral code to link themselves to a property. If the code is linked to a specific unit, the user is assigned as tenant of that unit.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: ABC12345
 *                 description: The referral code to redeem (case-insensitive)
 *     responses:
 *       200:
 *         description: Successfully linked to property
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
 *                     property:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         address:
 *                           type: string
 *                         city:
 *                           type: string
 *                     unit:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         unitNumber:
 *                           type: string
 *                         type:
 *                           type: string
 *                         floor:
 *                           type: number
 *       400:
 *         description: Missing code, already linked, code expired, or max uses reached
 *       404:
 *         description: Invalid referral code
 *       401:
 *         description: Unauthorized
 */
