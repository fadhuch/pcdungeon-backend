const express = require('express');
const router = express.Router();
const componentController = require('../controllers/componentController');

// Dashboard stats route
router.get('/dashboard-stats', componentController.getDashboardStats);

// Product page specific route
router.get('/products', componentController.getProductsPage);

// CSV template download route
router.get('/template/:categoryId', componentController.downloadTemplate);

// Bulk import route
router.post('/bulk-import', componentController.bulkImport);

// Component CRUD routes
router.get('/', componentController.getComponents);
router.get('/:id', componentController.getComponent);
router.post('/', componentController.createComponent);
router.put('/:id', componentController.updateComponent);
router.delete('/:id', componentController.deleteComponent);

module.exports = router;
