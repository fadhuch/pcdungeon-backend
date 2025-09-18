const express = require('express');
const router = express.Router();
const {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    updateAllProductCounts
} = require('../controllers/categoryController');

// Routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.post('/update-counts', updateAllProductCounts);

// Field management routes
router.post('/:id/fields', categoryController.addField);
router.put('/:id/fields/:fieldId', categoryController.updateField);
router.delete('/:id/fields/:fieldId', categoryController.removeField);

module.exports = router;
