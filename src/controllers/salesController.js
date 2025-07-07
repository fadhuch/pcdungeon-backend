const saleService = require('../services/saleService');

const salesController = {
    async addSale(req, res) {
        try {
            const sale = await saleService.createSale(req.body);
            res.status(201).json({
                status: 'success',
                data: sale
            });
        } catch (error) {
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    },

    async getAllSales(req, res) {
        try {
            const sales = await saleService.getAllSales();
            res.json({
                status: 'success',
                data: sales
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    },

    async getSalesOverview(req, res) {
        try {
            const overview = await saleService.getSalesOverview();
            res.json({
                status: 'success',
                data: overview
            });
        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: error.message
            });
        }
    }
};

module.exports = salesController;