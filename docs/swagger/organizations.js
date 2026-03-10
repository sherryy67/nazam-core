/**
 * @swagger
 * tags:
 *   name: Organizations
 *   description: Organization management endpoints
 */

/**
 * @swagger
 * /api/organizations/login:
 *   post:
 *     summary: Organization login
 *     tags: [Organizations]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: org@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 description:
 *                   type: string
 *                   example: Login successful
 *                 content:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     organization:
 *                       type: object
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Organization account is deactivated
 */

/**
 * @swagger
 * /api/organizations/dashboard:
 *   get:
 *     summary: Get organization dashboard (own)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     description: Returns dashboard stats for the logged-in organization (vendors, tasks, revenue)
 *     responses:
 *       200:
 *         description: Dashboard data retrieved
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
 *                     vendors:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         active:
 *                           type: number
 *                     tasks:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         current:
 *                           type: number
 *                     revenue:
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
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/organizations/vendors:
 *   get:
 *     summary: Get vendors under organization
 *     tags: [Organizations]
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
 *         description: Organization vendors retrieved
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
 *                     vendors:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Vendor'
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
 * /api/organizations/vendors:
 *   post:
 *     summary: Create vendor under organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     description: Organization creates a vendor that is auto-approved and linked to the organization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, mobileNumber, countryCode, coveredCity, idType, idNumber]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [corporate, individual]
 *                 example: individual
 *               firstName:
 *                 type: string
 *                 example: Ahmed
 *               lastName:
 *                 type: string
 *                 example: Khan
 *               email:
 *                 type: string
 *                 format: email
 *                 example: vendor@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               countryCode:
 *                 type: string
 *                 example: "+971"
 *               mobileNumber:
 *                 type: string
 *                 example: "501234567"
 *               coveredCity:
 *                 type: string
 *                 example: Dubai
 *               serviceId:
 *                 type: string
 *                 description: Service ObjectId
 *               gender:
 *                 type: string
 *                 enum: [Male, Female]
 *               experience:
 *                 type: number
 *                 example: 3
 *               serviceAvailability:
 *                 type: string
 *                 enum: [Full-time, Part-time]
 *               idType:
 *                 type: string
 *                 enum: [Passport, EmiratesID, NationalID]
 *               idNumber:
 *                 type: string
 *                 example: "784-1234-5678901-2"
 *     responses:
 *       201:
 *         description: Vendor created under organization
 *       409:
 *         description: Vendor with this email or mobile already exists
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create organization (Admin)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phone]
 *             properties:
 *               name:
 *                 type: string
 *                 example: ABC Services LLC
 *               email:
 *                 type: string
 *                 format: email
 *                 example: org@abcservices.com
 *               password:
 *                 type: string
 *                 example: password123
 *               phone:
 *                 type: string
 *                 example: "+971501234567"
 *               address:
 *                 type: string
 *                 example: Downtown Dubai
 *               city:
 *                 type: string
 *                 example: Dubai
 *               country:
 *                 type: string
 *                 example: UAE
 *               commissionPercentage:
 *                 type: number
 *                 example: 15
 *                 description: Organization commission percentage (default 0)
 *     responses:
 *       201:
 *         description: Organization created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Organization with this email already exists
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get all organizations (Admin)
 *     tags: [Organizations]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *     responses:
 *       200:
 *         description: Organizations list with pagination
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
 *                     organizations:
 *                       type: array
 *                       items:
 *                         type: object
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
 * /api/organizations/{id}/dashboard:
 *   get:
 *     summary: Get organization dashboard by ID (Admin)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization dashboard data
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
 *                     vendors:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         active:
 *                           type: number
 *                     tasks:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         current:
 *                           type: number
 *                     revenue:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Get organization by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     description: Accessible by admin or the organization itself
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Organization details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */

/**
 * @swagger
 * /api/organizations/{id}:
 *   put:
 *     summary: Update organization (Admin)
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               country:
 *                 type: string
 *               commissionPercentage:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Organization updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */
