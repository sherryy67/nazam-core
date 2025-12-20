const express = require('express');
const { body } = require('express-validator');
const {
    addAddress,
    getAddresses,
    getAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
} = require('../controllers/addressController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Validation rules
const addressValidation = [
    body('addressLine1').notEmpty().withMessage('Address line 1 is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('label').optional().isIn(['Home', 'Work', 'Other']).withMessage('Invalid label'),
    body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

// All routes are protected
router.use(protect);

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Add new address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addressLine1
 *               - city
 *             properties:
 *               label:
 *                 type: string
 *                 enum: [Home, Work, Other]
 *                 default: Home
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *                 default: UAE
 *               zipCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       201:
 *         description: Address added successfully
 */
router.post('/', addressValidation, addAddress);

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: Get all addresses for the logged-in user
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Addresses retrieved successfully
 */
router.get('/', getAddresses);

/**
 * @swagger
 * /api/addresses/{id}:
 *   get:
 *     summary: Get single address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address retrieved successfully
 */
router.get('/:id', getAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   put:
 *     summary: Update address
 *     tags: [Addresses]
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
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: Address updated successfully
 */
router.put('/:id', addressValidation, updateAddress);

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address deleted successfully
 */
router.delete('/:id', deleteAddress);

/**
 * @swagger
 * /api/addresses/{id}/default:
 *   put:
 *     summary: Set default address
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Default address set successfully
 */
router.put('/:id/default', setDefaultAddress);

module.exports = router;
