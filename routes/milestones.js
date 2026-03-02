const express = require('express');
const router = express.Router();
const {
  createMilestones,
  getMilestones,
  updateMilestone,
  deleteMilestone,
  generateMilestonePaymentLink,
  getMilestoneByToken,
  initiateMilestonePaymentViaToken
} = require('../controllers/milestoneController');

/**
 * @swagger
 * tags:
 *   name: Milestones
 *   description: Milestone payment management for service requests
 */

/**
 * @swagger
 * /api/milestones/payment-link/{token}:
 *   get:
 *     summary: Get milestone payment details by token
 *     description: Public endpoint to retrieve milestone and service request details using a payment link token. Used by the payment page to display payment information.
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment link token
 *         example: "a1b2c3d4e5f6..."
 *     responses:
 *       200:
 *         description: Milestone payment details retrieved successfully
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
 *                   example: "Milestone payment details retrieved"
 *                 content:
 *                   type: object
 *                   properties:
 *                     canPay:
 *                       type: boolean
 *                       description: Whether this milestone can be paid (based on sequential payment rules)
 *                     blockingMilestone:
 *                       type: object
 *                       nullable: true
 *                       description: Previous unpaid milestone blocking payment (if sequential payment required)
 *                       properties:
 *                         name:
 *                           type: string
 *                         order:
 *                           type: number
 *                         amount:
 *                           type: number
 *                     serviceRequest:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         service_name:
 *                           type: string
 *                         category_name:
 *                           type: string
 *                         user_name:
 *                           type: string
 *                         user_email:
 *                           type: string
 *                         user_phone:
 *                           type: string
 *                         total_price:
 *                           type: number
 *                         paymentMethod:
 *                           type: string
 *                         requireSequentialPayment:
 *                           type: boolean
 *                     milestone:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         amount:
 *                           type: number
 *                         percentage:
 *                           type: number
 *                         order:
 *                           type: number
 *                         paymentStatus:
 *                           type: string
 *                           enum: [Pending, Success, Failure]
 *                         dueDate:
 *                           type: string
 *                           format: date-time
 *                         expiresAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Missing token or milestone already paid
 *       404:
 *         description: Payment link or milestone not found
 *       410:
 *         description: Payment link has expired
 */
router.get('/payment-link/:token', getMilestoneByToken);

/**
 * @swagger
 * /api/milestones/payment-link/{token}/initiate:
 *   post:
 *     summary: Initiate payment for a milestone via token
 *     description: Public endpoint to initiate CCAvenue payment for a milestone using the payment link token. Returns encrypted payment form data for CCAvenue.
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment link token
 *     responses:
 *       200:
 *         description: Payment initiated successfully
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
 *                   example: "Payment initiated for milestone: Initial Deposit"
 *                 content:
 *                   type: object
 *                   properties:
 *                     paymentUrl:
 *                       type: string
 *                       description: CCAvenue payment gateway URL
 *                     paymentFormData:
 *                       type: object
 *                       properties:
 *                         encRequest:
 *                           type: string
 *                           description: Encrypted payment request
 *                         access_code:
 *                           type: string
 *                           description: CCAvenue access code
 *                     orderId:
 *                       type: string
 *                       example: "64a1b2c3d4e5f6789abcdef1-M1"
 *                     amount:
 *                       type: number
 *                       example: 500.00
 *                     currency:
 *                       type: string
 *                       example: "AED"
 *                     paymentType:
 *                       type: string
 *                       example: "milestone"
 *                     milestoneId:
 *                       type: string
 *                     milestoneName:
 *                       type: string
 *                     milestoneOrder:
 *                       type: number
 *       400:
 *         description: Missing token, already paid, link already used, previous milestone unpaid, or invalid payment method
 *       404:
 *         description: Payment link or milestone not found
 *       410:
 *         description: Payment link has expired
 *       500:
 *         description: Failed to generate encrypted payment data
 */
router.post('/payment-link/:token/initiate', initiateMilestonePaymentViaToken);

/**
 * @swagger
 * /api/milestones/service-requests/{id}/milestones:
 *   post:
 *     summary: Create milestones for a service request
 *     description: Create multiple milestones for a service request. Sets the payment type to 'milestone'. Total milestone amount cannot exceed the total price.
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service request ID
 *         example: "64a1b2c3d4e5f6789abcdef1"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - milestones
 *             properties:
 *               milestones:
 *                 type: array
 *                 description: Array of milestones to create
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Milestone name
 *                       example: "Initial Deposit"
 *                     description:
 *                       type: string
 *                       description: Milestone description
 *                       example: "30% upfront payment"
 *                     amount:
 *                       type: number
 *                       description: Milestone amount (if not using percentage)
 *                       example: 500.00
 *                     percentage:
 *                       type: number
 *                       description: Percentage of total price (alternative to amount)
 *                       example: 30
 *                     order:
 *                       type: number
 *                       description: Order of the milestone (auto-assigned if not provided)
 *                       example: 1
 *                     dueDate:
 *                       type: string
 *                       format: date-time
 *                       description: Due date for the milestone
 *                     isRequired:
 *                       type: boolean
 *                       description: Whether the milestone is required
 *                       default: true
 *               requireSequentialPayment:
 *                 type: boolean
 *                 description: Whether milestones must be paid in order
 *                 default: true
 *           example:
 *             milestones:
 *               - name: "Initial Deposit"
 *                 percentage: 30
 *                 order: 1
 *               - name: "Mid-Project Payment"
 *                 percentage: 40
 *                 order: 2
 *               - name: "Final Payment"
 *                 percentage: 30
 *                 order: 3
 *             requireSequentialPayment: true
 *     responses:
 *       201:
 *         description: Milestones created successfully
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
 *                   example: "Milestones created successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequestId:
 *                       type: string
 *                     paymentType:
 *                       type: string
 *                       example: "milestone"
 *                     requireSequentialPayment:
 *                       type: boolean
 *                     milestones:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Milestone'
 *                     totalMilestoneAmount:
 *                       type: string
 *                       example: "1000.00"
 *                     totalPrice:
 *                       type: number
 *       400:
 *         description: Invalid service request ID, invalid milestones, or amount exceeds total price
 *       404:
 *         description: Service request not found
 *   get:
 *     summary: Get all milestones for a service request
 *     description: Retrieve all milestones and payment status for a service request
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service request ID
 *     responses:
 *       200:
 *         description: Milestones retrieved successfully
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
 *                   example: "Milestones retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequestId:
 *                       type: string
 *                     paymentType:
 *                       type: string
 *                       enum: [full, milestone]
 *                     paymentMethod:
 *                       type: string
 *                     totalPrice:
 *                       type: number
 *                     requireSequentialPayment:
 *                       type: boolean
 *                     milestones:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Milestone'
 *                     overallPaymentStatus:
 *                       type: string
 *                       description: Aggregated payment status
 *                       example: "Partially Paid (1/3)"
 *       400:
 *         description: Invalid service request ID
 *       404:
 *         description: Service request not found
 */
router.post('/service-requests/:id/milestones', createMilestones);
router.get('/service-requests/:id/milestones', getMilestones);

/**
 * @swagger
 * /api/milestones/service-requests/{id}/milestones/{milestoneId}:
 *   put:
 *     summary: Update a specific milestone
 *     description: Update milestone details such as name, description, due date, or completion status. Payment-related fields cannot be updated directly.
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service request ID
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *         description: Milestone ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Updated milestone name
 *               description:
 *                 type: string
 *                 description: Updated description
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Updated due date
 *               completionStatus:
 *                 type: string
 *                 enum: [NotStarted, InProgress, Completed]
 *                 description: Milestone completion status
 *               isRequired:
 *                 type: boolean
 *                 description: Whether the milestone is required
 *     responses:
 *       200:
 *         description: Milestone updated successfully
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
 *                   example: "Milestone updated successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequestId:
 *                       type: string
 *                     milestone:
 *                       $ref: '#/components/schemas/Milestone'
 *       400:
 *         description: Invalid service request ID
 *       404:
 *         description: Service request or milestone not found
 *   delete:
 *     summary: Delete a milestone
 *     description: Delete a milestone from a service request. Cannot delete a milestone that has already been paid.
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service request ID
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *         description: Milestone ID
 *     responses:
 *       200:
 *         description: Milestone deleted successfully
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
 *                   example: "Milestone deleted successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequestId:
 *                       type: string
 *                     deletedMilestoneId:
 *                       type: string
 *       400:
 *         description: Invalid service request ID or milestone already paid
 *       404:
 *         description: Service request or milestone not found
 */
router.put('/service-requests/:id/milestones/:milestoneId', updateMilestone);
router.delete('/service-requests/:id/milestones/:milestoneId', deleteMilestone);

/**
 * @swagger
 * /api/milestones/service-requests/{id}/milestones/{milestoneId}/payment-link:
 *   post:
 *     summary: Generate payment link for a milestone
 *     description: Generate a secure payment link for a specific milestone. The link can be shared with the customer via email. If sequential payment is required, previous milestones must be paid first.
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service request ID
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *         description: Milestone ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiryHours:
 *                 type: number
 *                 description: Hours until the payment link expires
 *                 default: 72
 *                 example: 48
 *     responses:
 *       201:
 *         description: Payment link generated successfully
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
 *                   example: "Payment link generated successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     serviceRequestId:
 *                       type: string
 *                     milestoneId:
 *                       type: string
 *                     milestoneName:
 *                       type: string
 *                       example: "Initial Deposit"
 *                     amount:
 *                       type: number
 *                       example: 500.00
 *                     paymentLink:
 *                       type: string
 *                       example: "https://zushh.com/pay-milestone/abc123..."
 *                     token:
 *                       type: string
 *                       description: Secure token for the payment link
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     emailSent:
 *                       type: boolean
 *                       description: Whether email was sent to customer
 *                     emailError:
 *                       type: string
 *                       nullable: true
 *                       description: Email error message if sending failed
 *       400:
 *         description: Invalid service request ID, milestone already paid, or previous milestone unpaid
 *       404:
 *         description: Service request or milestone not found
 */
router.post('/service-requests/:id/milestones/:milestoneId/payment-link', generateMilestonePaymentLink);

module.exports = router;
