const express = require('express');
const router = express.Router();
const {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    addProductToSupplier,
    removeProductFromSupplier,
    addSupplierComment,
    getSupplierComments,
    addSupplierRating,
    getSupplierRatings,
    getSupplierOrders
} = require('../controllers/supplierController');

// Supplier routes
router.get('/', getAllSuppliers);
router.get('/:id', getSupplierById);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

// Supplier-Product relationship routes
router.post('/:id/products', addProductToSupplier);
router.delete('/:supplierId/products/:productId', removeProductFromSupplier);

// Supplier comments routes
router.get('/:id/comments', getSupplierComments);
router.post('/:id/comments', addSupplierComment);

// Supplier ratings routes
router.get('/:id/ratings', getSupplierRatings);
router.post('/:id/ratings', addSupplierRating);

// Supplier orders routes
router.get('/:id/orders', getSupplierOrders);

module.exports = router;
