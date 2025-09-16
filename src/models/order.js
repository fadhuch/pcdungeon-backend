const mongoose = require('mongoose');

const supplierInfoSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  contact: {
    type: String
  },
  email: {
    type: String
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  isBestPrice: {
    type: Boolean,
    default: false
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  listedPrice: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: false
  },
  supplierName: {
    type: String,
    required: false
  },
  suppliers: [supplierInfoSchema],
  totalAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDeliveryDate: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate total amount
orderSchema.pre('save', function(next) {
  this.totalAmount = this.quantity * this.unitPrice;
  next();
});

// Generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const currentYear = new Date().getFullYear();
    const orderCount = await this.constructor.countDocuments({
      orderNumber: new RegExp(`^ORD-${currentYear}`)
    });
    this.orderNumber = `ORD-${currentYear}-${String(orderCount + 1).padStart(3, '0')}`;
  }
  next();
});

// Instance method to update best price indicators
orderSchema.methods.updateBestPriceIndicators = function() {
  if (this.suppliers && this.suppliers.length > 0) {
    const bestPrice = Math.min(...this.suppliers.map(s => s.price));
    this.suppliers.forEach(s => {
      s.isBestPrice = s.price === bestPrice;
    });
  }
};

// Static method to get orders with analytics
orderSchema.statics.getOrderAnalytics = async function() {
  const analytics = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  const totalOrders = await this.countDocuments();
  const totalValue = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: '$totalAmount' }
      }
    }
  ]);
  
  return {
    totalOrders,
    totalValue: totalValue[0]?.total || 0,
    byStatus: analytics.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        value: item.totalValue
      };
      return acc;
    }, {})
  };
};

module.exports = mongoose.model('Order', orderSchema);
