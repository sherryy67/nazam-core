const express = require('express');
const { sendSuccess } = require('../utils/response');

const router = express.Router();

/**
 * @swagger
 * /api/admin/status:
 *   get:
 *     summary: Get admin status
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Admin status retrieved successfully
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
 *                   example: "Admin module is available"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "available"
 */
router.get('/status', (req, res) => {
  sendSuccess(res, 200, 'Admin module is available', {
    status: 'available',
    note: 'Authentication has been removed from this API'
  });
});

module.exports = router;
