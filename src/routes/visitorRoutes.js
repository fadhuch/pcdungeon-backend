const express = require('express');
const router = express.Router();
const visitorController = require('../controllers/visitorController');

// GET /api/visitors - Get all visitors with optional search and pagination
router.get('/', visitorController.getAllVisitors);

// GET /api/visitors/stats - Get visitor statistics
router.get('/stats', visitorController.getVisitorStats);

// GET /api/visitors/scan/:qrId - Scan QR code and increment count
router.get('/scan/:qrId', visitorController.scanQRCode);

// GET /api/visitors/:id - Get visitor by ID
router.get('/:id', visitorController.getVisitorById);

// POST /api/visitors - Create new visitor
router.post('/', visitorController.createVisitor);

// PUT /api/visitors/:id/status - Update visitor status
router.put('/:id/status', visitorController.updateVisitorStatus);

// DELETE /api/visitors/:id - Delete visitor
router.delete('/:id', visitorController.deleteVisitor);

module.exports = router;
