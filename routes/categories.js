const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middlewares/auth');
const { authorize, isAdmin } = require('../middlewares/roleAuth');
const { 
  createCategory, 
  getCategories, 
  getAllCategories, 
  getCategoryById, 
  updateCategory, 
  deleteCategory,
  getHomeCategories,
  updateCategorySortOrder
} = require('../controllers/categoryController');

const router = express.Router();

// Validation rules for category creation
const createCategoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-&]+$/)
    .withMessage('Category name can only contain letters, numbers, spaces, hyphens, and ampersands'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
];

// Validation rules for category update
const updateCategoryValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-&]+$/)
    .withMessage('Category name can only contain letters, numbers, spaces, hyphens, and ampersands'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation rules for category sort order
const updateSortOrderValidation = [
  body('categories')
    .isArray({ min: 1 })
    .withMessage('Categories array is required and must not be empty'),
  body('categories.*.id')
    .notEmpty()
    .withMessage('Category ID is required for each category')
    .isMongoId()
    .withMessage('Invalid category ID format'),
  body('categories.*.sortOrder')
    .isInt({ min: 0 })
    .withMessage('sortOrder must be a non-negative integer')
];

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Home Cleaning"
 *               description:
 *                 type: string
 *                 example: "Professional home cleaning services"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 description:
 *                   type: string
 *                 content:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     exception:
 *                       type: string
 *                     description:
 *                       type: string
 *                     content:
 *                       type: object
 *                       properties:
 *                         categories:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               isActive:
 *                                 type: boolean
 *                               createdAt:
 *                                 type: string
 *                               updatedAt:
 *                                 type: string
 *                         total:
 *                           type: number
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Category already exists
 *       500:
 *         description: Server error
 */
router.post('/', protect, isAdmin, createCategoryValidation, createCategory);

/**
 * @swagger
 * /api/categories/home:
 *   get:
 *     summary: Get categories for home page with one service each
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Home categories retrieved successfully
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
 *                   example: null
 *                 description:
 *                   type: string
 *                   example: "Home categories retrieved successfully"
 *                 content:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               isActive:
 *                                 type: boolean
 *                               createdAt:
 *                                 type: string
 *                               updatedAt:
 *                                 type: string
 *                           service:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               basePrice:
 *                                 type: number
 *                               unitType:
 *                                 type: string
 *                               imageUri:
 *                                 type: string
 *                               service_icon:
 *                                 type: string
 *                               category_id:
 *                                 type: string
 *                               availability:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                               job_service_type:
 *                                 type: string
 *                               price_type:
 *                                 type: string
 *                               subservice_type:
 *                                 type: string
 *                               isActive:
 *                                 type: boolean
 *                               createdBy:
 *                                 type: object
 *                               createdAt:
 *                                 type: string
 *                               updatedAt:
 *                                 type: string
 *                     total:
 *                       type: number
 *                       example: 3
 *       500:
 *         description: Server error
 */
router.get('/home', getHomeCategories);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all active categories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 description:
 *                   type: string
 *                 content:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       createdBy:
 *                         type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/', protect, getCategories);

/**
 * @swagger
 * /api/categories/all:
 *   get:
 *     summary: Get all categories including inactive (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 description:
 *                   type: string
 *                 content:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/all', protect, isAdmin, getAllCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 description:
 *                   type: string
 *                 content:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */
/**
 * @swagger
 * /api/categories/sort:
 *   put:
 *     summary: Bulk update category sort order (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categories
 *             properties:
 *               categories:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - sortOrder
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: objectid
 *                       example: "64f2a9b3c4d5e6f7a8b9c0d1"
 *                     sortOrder:
 *                       type: integer
 *                       minimum: 0
 *                       example: 1
 *     responses:
 *       200:
 *         description: Category sort order updated successfully
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
 *                   example: null
 *                 description:
 *                   type: string
 *                   example: "Category sort order updated successfully"
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
 *                           isActive:
 *                             type: boolean
 *                           sortOrder:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: integer
 *                     updatedCount:
 *                       type: integer
 *       400:
 *         description: Bad request - invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Categories not found
 */
router.put('/sort', protect, isAdmin, updateSortOrderValidation, updateCategorySortOrder);

router.get('/:id', protect, getCategoryById);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Home Cleaning"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 description:
 *                   type: string
 *                 content:
 *                   type: object
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name already exists
 */
router.put('/:id', protect, isAdmin, updateCategoryValidation, updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Bad request - Category is in use
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Category not found
 */
router.delete('/:id', protect, isAdmin, deleteCategory);

module.exports = router;
