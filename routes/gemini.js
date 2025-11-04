const express = require('express');
const { body } = require('express-validator');
const { generateTooltip } = require('../controllers/geminiController');

const router = express.Router();

// Validation rules
const tooltipValidation = [
  body('serviceName')
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters')
];

/**
 * @swagger
 * /api/gemini/tooltip:
 *   post:
 *     summary: Generate tooltip content for a service using Gemini AI
 *     tags: [Gemini AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceName
 *             properties:
 *               serviceName:
 *                 type: string
 *                 example: "Home Renovation"
 *                 description: Name of the service to generate tooltip for
 *     responses:
 *       200:
 *         description: Tooltip generated successfully
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
 *                   example: "Tooltip generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     serviceName:
 *                       type: string
 *                       example: "Home Renovation"
 *                     tooltip:
 *                       type: string
 *                       example: "When requesting a quotation for home renovation, please include the dimensions of the area to be renovated, your preferred design style (modern, traditional, etc.), specific materials you'd like to use, your budget range, timeline expectations, and any special requirements or constraints. This will help us provide you with an accurate and tailored quotation."
 *       400:
 *         description: Bad request - validation error or missing service name
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Service name is required"
 *                 error:
 *                   type: string
 *                   example: "MISSING_SERVICE_NAME"
 *       500:
 *         description: Server error - Gemini API error or configuration issue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to generate tooltip: API key not configured"
 *                 error:
 *                   type: string
 *                   oneOf:
 *                     - "GEMINI_API_KEY_MISSING"
 *                     - "GEMINI_API_ERROR"
 *                     - "GEMINI_GENERATION_FAILED"
 */
router.post('/tooltip', tooltipValidation, generateTooltip);

module.exports = router;

