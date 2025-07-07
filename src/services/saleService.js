const Sale = require('../models/sale');

class SaleService {
    async createSale(saleData) {
        try {
            const sale = new Sale(saleData);
            return await sale.save();
        } catch (error) {
            throw new Error(`Error creating sale: ${error.message}`);
        }
    }

    async getAllSales() {
        try {
            return await Sale.find().sort({ date: -1 });
        } catch (error) {
            throw new Error(`Error fetching sales: ${error.message}`);
        }
    }

    async getSalesOverview() {
        try {
            const [totalSales, recentSales, monthlySales] = await Promise.all([
                Sale.aggregate([
                    { $match: { status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),
                Sale.find().sort({ date: -1 }).limit(5),
                Sale.aggregate([
                    {
                        $group: {
                            _id: {
                                month: { $month: '$date' },
                                year: { $year: '$date' }
                            },
                            total: { $sum: '$amount' },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': -1, '_id.month': -1 } }
                ])
            ]);

            return {
                totalAmount: totalSales[0]?.total || 0,
                recentSales,
                monthlySales
            };
        } catch (error) {
            throw new Error(`Error getting sales overview: ${error.message}`);
        }
    }
}

module.exports = new SaleService();