const express = require('express');
const router = express.Router();
const {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    updateAllProductCounts,
    addField,
    updateField,
    removeField,
    getCategoryWithFields
} = require('../controllers/categoryController');

// Routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.post('/update-counts', updateAllProductCounts);

// Field management routes
router.post('/:id/fields', addField);
router.put('/:id/fields/:fieldId', updateField);
router.delete('/:id/fields/:fieldId', removeField);
router.get('/:id/fields', getCategoryWithFields);

module.exports = router;
