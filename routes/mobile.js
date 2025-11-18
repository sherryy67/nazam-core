const express = require('express');
const { getMobileHomeContent } = require('../controllers/categoryController');

const router = express.Router();

/**
 * @swagger
 * /api/mobile/home:
 *   get:
 *     summary: Get categories with their services for the mobile home screen
 *     tags: [Mobile]
 *     responses:
 *       200:
 *         description: Mobile home content retrieved successfully
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
 *                   example: "Mobile home content retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           services:
 *                             type: array
 *                             items:
 *                               type: object
 *                     bannerServices:
 *                       type: array
 *                       description: Featured services for banner display
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           basePrice:
 *                             type: number
 *                           isFeatured:
 *                             type: boolean
 *                     commercialServices:
 *                       type: array
 *                       description: Services from Commercial category
 *                       items:
 *                         type: object
 *                     residentialServices:
 *                       type: array
 *                       description: Services from Residential category
 *                       items:
 *                         type: object
 *                     total:
 *                       type: number
 *       500:
 *         description: Server error
 */
router.get('/home', getMobileHomeContent);

module.exports = router;

