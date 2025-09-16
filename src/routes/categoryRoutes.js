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

<<<<<<< HEAD
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategory);
router.get('/:id/fields', categoryController.getCategoryWithFields);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
=======
// Routes
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.post('/update-counts', updateAllProductCounts);
>>>>>>> eb325fe022e5165673bba4598ff70524d395f366

// Field management routes
router.post('/:id/fields', categoryController.addField);
router.put('/:id/fields/:fieldId', categoryController.updateField);
router.delete('/:id/fields/:fieldId', categoryController.removeField);

module.exports = router;
