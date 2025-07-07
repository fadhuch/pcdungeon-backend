const IndexController = (req, res) => {
    res.send('Hello from Index Controller!');
};

exports.productController = require('./productController');
exports.categoryController = require('./categoryController');

module.exports = IndexController;