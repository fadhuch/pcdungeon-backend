const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
    type: { type: String, required: true }, // e.g., CPU, GPU, RAM
    name: { type: String, required: true },
    specs: { type: Object }, // e.g., { cores: 8, speed: '3.6GHz' }
    price: { type: Number, required: true }
}, { _id: false });

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    basePrice: { type: Number, required: true },
    imageUrl: { type: String },
    components: [componentSchema], // Pre-built components
    customizable: { type: Boolean, default: true },
    availableOptions: {
        cpu: [String],
        gpu: [String],
        ram: [String],
        storage: [String],
        others: [String]
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
