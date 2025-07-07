const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');

router.post('/add', salesController.addSale);
router.get('/', salesController.getAllSales);
router.get('/overview', salesController.getSalesOverview);

module.exports = router;