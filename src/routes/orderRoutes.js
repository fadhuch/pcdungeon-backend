const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Order routes
router.get('/', orderController.getAllOrders);
router.get('/analytics', orderController.getOrderAnalytics);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.patch('/:id/status', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);

// Product suppliers route for order creation
router.get('/product/:productId/suppliers', orderController.getProductSuppliers);

module.exports = router;
