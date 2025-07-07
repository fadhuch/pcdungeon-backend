const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: [true, 'Product name is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    customer: {
        type: String,
        required: [true, 'Customer name is required']
    },
    status: {
        type: String,
        enum: ['completed', 'pending', 'cancelled'],
        default: 'completed'
    },
    date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Sale', saleSchema);