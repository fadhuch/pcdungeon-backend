const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    qrId: {
        type: String,
        unique: true,
        required: true
    },
    qrCode: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'checked-in', 'checked-out'],
        default: 'pending'
    },
    scanCount: {
        type: Number,
        default: 0
    },
    lastScannedAt: {
        type: Date,
        default: null
    },
    checkInTime: {
        type: Date,
        default: null
    },
    checkOutTime: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // This adds createdAt and updatedAt automatically
});

// Index for better query performance
visitorSchema.index({ name: 1 });
visitorSchema.index({ qrId: 1 });
visitorSchema.index({ status: 1 });
visitorSchema.index({ createdAt: -1 });

const Visitor = mongoose.model('Visitor', visitorSchema);

module.exports = Visitor;
