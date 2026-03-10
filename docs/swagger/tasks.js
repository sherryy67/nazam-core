/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management and vendor workflow endpoints
 */

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create task from service request (Admin)
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceRequestId, vendorId, title, taskDate]
 *             properties:
 *               serviceRequestId:
 *                 type: string
 *                 description: Service request ObjectId
 *               vendorId:
 *                 type: string
 *                 description: Vendor ObjectId
 *               title:
 *                 type: string
 *                 example: Plumbing repair - Unit 203
 *               description:
 *                 type: string
 *                 example: Fix leaking kitchen sink
 *               location:
 *                 type: string
 *                 example: Building A, Downtown Dubai
 *               city:
 *                 type: string
 *                 example: Dubai
 *               taskDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-03-15"
 *               taskTime:
 *                 type: string
 *                 example: "10:00"
 *               isAMC:
 *                 type: boolean
 *                 default: false
 *                 description: Whether this is an AMC task (manually assigned only)
 *               amcContractId:
 *                 type: string
 *                 description: AMC contract ObjectId (if isAMC)
 *     responses:
 *       201:
 *         description: Task created and service request marked as Assigned
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
 *                     task:
 *                       type: object
 *       400:
 *         description: Missing required fields or vendor not approved
 *       404:
 *         description: Service request or vendor not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks (Admin)
 *     tags: [Tasks]
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
 *           enum: [Created, Notified, Accepted, Cancelled, InProgress, Completed]
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
 *         name: isAMC
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *     responses:
 *       200:
 *         description: Tasks list with pagination
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
 *                     tasks:
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
 * /api/tasks/my-tasks:
 *   get:
 *     summary: Get vendor's own tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Created, Notified, Accepted, Cancelled, InProgress, Completed]
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
 *         description: Vendor tasks list with pagination
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/tasks/{taskId}/accept:
 *   put:
 *     summary: Vendor accepts a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     description: "Task must be in Created or Notified status. Updates task to Accepted and service request to Accepted."
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task accepted successfully
 *       400:
 *         description: Invalid task status for acceptance
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/tasks/{taskId}/cancel:
 *   put:
 *     summary: Vendor cancels a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     description: "Task must be in Created, Notified, or Accepted status. Reverts service request to Pending for reassignment."
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Unable to attend due to scheduling conflict
 *     responses:
 *       200:
 *         description: Task cancelled successfully
 *       400:
 *         description: Invalid task status for cancellation
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/tasks/{taskId}/start:
 *   put:
 *     summary: Vendor starts work on a task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     description: "Task must be in Accepted status. Updates to InProgress."
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task started successfully
 *       400:
 *         description: Task must be accepted before starting
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/tasks/{taskId}/complete:
 *   put:
 *     summary: Vendor marks task as completed
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     description: "Task must be InProgress. Generates a revenue transaction with commission splits on completion."
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completionNotes:
 *                 type: string
 *                 example: Work completed. Replaced kitchen faucet.
 *     responses:
 *       200:
 *         description: Task completed and revenue transaction generated
 *       400:
 *         description: Task must be in progress to complete
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     description: Accessible by admin or the assigned vendor (vendors can only see their own tasks)
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details with populated vendor, organization, service request, property, and unit
 *       403:
 *         description: Access denied (vendor trying to view another vendor's task)
 *       404:
 *         description: Task not found
 *       401:
 *         description: Unauthorized
 */
