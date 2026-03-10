/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property owner, property, and unit management endpoints
 */

/**
 * @swagger
 * /api/properties/owners/login:
 *   post:
 *     summary: Property owner login
 *     tags: [Properties]
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
 *                 example: owner@example.com
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
 *                 content:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     owner:
 *                       type: object
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account is deactivated
 */

/**
 * @swagger
 * /api/properties/owner/dashboard:
 *   get:
 *     summary: Get property owner dashboard
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     description: Returns properties, units (occupied/vacant), tenants, service requests, and AMC contract counts
 *     responses:
 *       200:
 *         description: Dashboard data
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
 *                     properties:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         list:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               city:
 *                                 type: string
 *                               type:
 *                                 type: string
 *                     units:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         occupied:
 *                           type: number
 *                         vacant:
 *                           type: number
 *                     tenants:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         list:
 *                           type: array
 *                           items:
 *                             type: object
 *                     serviceRequests:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         pending:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         recent:
 *                           type: array
 *                           items:
 *                             type: object
 *                     amcContracts:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/properties/owner/service-requests:
 *   get:
 *     summary: Get service requests across owner's properties
 *     tags: [Properties]
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
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by service request status
 *       - in: query
 *         name: propertyId
 *         schema:
 *           type: string
 *         description: Filter by specific property ObjectId
 *     responses:
 *       200:
 *         description: Service requests with pagination
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/properties/owner/service-requests:
 *   post:
 *     summary: Create service request on behalf of tenant
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     description: Property owner creates a service request for one of their tenants. Tenant must be linked to a unit in the owner's property.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId]
 *             properties:
 *               tenantId:
 *                 type: string
 *                 description: User (tenant) ObjectId
 *               unitId:
 *                 type: string
 *                 description: Unit ObjectId where tenant resides
 *               service_name:
 *                 type: string
 *                 example: AC Maintenance
 *               request_type:
 *                 type: string
 *                 example: Standard
 *               address:
 *                 type: string
 *               requested_date:
 *                 type: string
 *                 format: date-time
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Service request created on behalf of tenant
 *       400:
 *         description: Missing tenant ID or tenant not linked to unit
 *       403:
 *         description: Property does not belong to owner
 *       404:
 *         description: Tenant not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/properties/owners:
 *   post:
 *     summary: Create property owner (Admin)
 *     tags: [Properties]
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
 *                 example: Ali Ahmed
 *               email:
 *                 type: string
 *                 format: email
 *                 example: owner@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               phone:
 *                 type: string
 *                 example: "+971501234567"
 *               address:
 *                 type: string
 *                 example: Al Nahda, Sharjah
 *               city:
 *                 type: string
 *                 example: Sharjah
 *               country:
 *                 type: string
 *                 example: UAE
 *               commissionPercentage:
 *                 type: number
 *                 example: 10
 *                 description: Property owner commission percentage (default 0)
 *               idType:
 *                 type: string
 *                 enum: [Passport, EmiratesID, NationalID]
 *               idNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Property owner created successfully
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Property owner with this email already exists
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/properties/owners:
 *   get:
 *     summary: Get all property owners (Admin)
 *     tags: [Properties]
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
 *     responses:
 *       200:
 *         description: Property owners list with pagination
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create property (Admin)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address, city, type, ownerId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sunrise Tower
 *               address:
 *                 type: string
 *                 example: Sheikh Zayed Road
 *               city:
 *                 type: string
 *                 example: Dubai
 *               country:
 *                 type: string
 *                 example: UAE
 *               type:
 *                 type: string
 *                 example: Apartment
 *               ownerId:
 *                 type: string
 *                 description: Property owner ObjectId
 *               totalUnits:
 *                 type: number
 *                 default: 0
 *     responses:
 *       201:
 *         description: Property created successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Property owner not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: Get all properties
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     description: Admin sees all properties. Property owner sees only their own.
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
 *         description: Properties list with pagination
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get property by ID with units
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     description: Returns property details and all units. Property owners can only see their own properties.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ObjectId
 *     responses:
 *       200:
 *         description: Property details with units
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
 *                     units:
 *                       type: array
 *                       items:
 *                         type: object
 *       403:
 *         description: Access denied
 *       404:
 *         description: Property not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/properties/{propertyId}/units:
 *   post:
 *     summary: Create unit in property (Admin)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unitNumber, type]
 *             properties:
 *               unitNumber:
 *                 type: string
 *                 example: "203"
 *               type:
 *                 type: string
 *                 example: Studio
 *               floor:
 *                 type: number
 *                 example: 2
 *     responses:
 *       201:
 *         description: Unit created and property totalUnits incremented
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Property not found
 *       409:
 *         description: Unit number already exists in this property
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/properties/{propertyId}/units/bulk:
 *   post:
 *     summary: Bulk create units in property (Admin)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [units]
 *             properties:
 *               units:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [unitNumber, type]
 *                   properties:
 *                     unitNumber:
 *                       type: string
 *                       example: "301"
 *                     type:
 *                       type: string
 *                       example: 1BR
 *                     floor:
 *                       type: number
 *                       example: 3
 *     responses:
 *       201:
 *         description: Units created successfully
 *       400:
 *         description: Units array is required
 *       404:
 *         description: Property not found
 *       409:
 *         description: Some unit numbers already exist
 *       401:
 *         description: Unauthorized
 */
