const express = require('express');
const compatibilityController = require('../controllers/compatibilityController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Admin only routes
router.use(protect);
router.use(restrictTo('admin'));

router.get('/', compatibilityController.getCompatibilityRules);
router.post('/', compatibilityController.createCompatibilityRule);
router.patch('/:id', compatibilityController.updateCompatibilityRule);
router.delete('/:id', compatibilityController.deleteCompatibilityRule);

module.exports = router;
