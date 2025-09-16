const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Component name is required'],
    trim: true,
    maxlength: [200, 'Component name cannot exceed 200 characters']
  },
  
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  
  brand: {
    type: String,
    trim: true,
    maxlength: [100, 'Brand name cannot exceed 100 characters']
  },
  
  model: {
    type: String,
    trim: true,
    maxlength: [100, 'Model cannot exceed 100 characters']
  },
  
  pricing: {
    cost: {
      amount: {
        type: Number,
        required: [true, 'Cost amount is required'],
        min: [0, 'Cost cannot be negative']
      },
      currency: {
        type: String,
        default: 'AED'
      }
    },
    individualPrice: {
      amount: {
        type: Number,
        required: [true, 'Individual price amount is required'],
        min: [0, 'Individual price cannot be negative']
      },
      currency: {
        type: String,
        default: 'AED'
      }
    },
    buildPrice: {
      amount: {
        type: Number,
        required: [true, 'Build price amount is required'],
        min: [0, 'Build price cannot be negative']
      },
      currency: {
        type: String,
        default: 'AED'
      }
    }
  },
  
  // Keep old price field for backward compatibility
  price: {
    amount: {
      type: Number,
      required: [true, 'Price amount is required'],
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'AED'
    }
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  specifications: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  technicalSpecs: {
    // CPU specific
    cores: Number,
    threads: Number,
    baseClock: String, // e.g., "3.6 GHz"
    boostClock: String, // e.g., "4.9 GHz"
    socket: String, // e.g., "LGA1700", "AM4"
    architecture: String, // e.g., "Zen 3", "Intel 7"
    
    // GPU specific
    vram: String, // e.g., "8GB GDDR6"
    coreClock: String,
    memoryClock: String,
    interface: String, // e.g., "PCIe 4.0 x16"
    
    // RAM specific
    capacity: String, // e.g., "16GB", "32GB"
    speed: String, // e.g., "DDR4-3200", "DDR5-4800"
    timings: String, // e.g., "16-18-18-38"
    voltage: String, // e.g., "1.35V"
    
    // Storage specific
    capacity_storage: String, // e.g., "1TB", "500GB"
    interface_storage: String, // e.g., "SATA III", "NVMe PCIe 4.0"
    formFactor: String, // e.g., "2.5\"", "M.2 2280"
    readSpeed: String, // e.g., "7000 MB/s"
    writeSpeed: String, // e.g., "6500 MB/s"
    
    // Motherboard specific
    chipset: String, // e.g., "Z690", "B550"
    memorySlots: Number,
    maxMemory: String, // e.g., "128GB"
    expansionSlots: [String], // e.g., ["PCIe 5.0 x16", "PCIe 4.0 x1"]
    
    // PSU specific
    wattage: Number,
    efficiency: String, // e.g., "80+ Gold"
    modular: String, // e.g., "Fully Modular", "Semi-Modular", "Non-Modular"
    
    // Case specific
    formFactorSupport: [String], // e.g., ["ATX", "Micro-ATX", "Mini-ITX"]
    maxGpuLength: String, // e.g., "400mm"
    maxCpuCoolerHeight: String, // e.g., "165mm"
    
    // Cooling specific
    coolerType: String, // e.g., "Air", "AIO Liquid", "Custom Loop"
    fanSize: String, // e.g., "120mm", "140mm"
    socketSupport: [String] // e.g., ["LGA1700", "AM4", "AM5"]
  },
  
  images: {
    primary: {
      type: String,
      trim: true
    },
    gallery: [{
      type: String,
      trim: true
    }],
    thumbnail: {
      type: String,
      trim: true
    }
  },
  
  availability: {
    inStock: {
      type: Boolean,
      default: true
    },
    stockCount: {
      type: Number,
      default: 0,
      min: [0, 'Stock count cannot be negative']
    },
    releaseDate: {
      type: Date
    },
    discontinuedDate: {
      type: Date
    }
  },
  
  ratings: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  compatibility: {
    requiredComponents: [{
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
      },
      specifications: {
        type: Map,
        of: String
      }
    }],
    incompatibleWith: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Component'
    }]
  },
  
  performance: {
    benchmarks: [{
      testName: String,
      score: Number,
      unit: String, // e.g., "FPS", "Points", "MB/s"
      testConditions: String
    }],
    powerConsumption: {
      idle: Number, // watts
      load: Number, // watts
      peak: Number // watts
    },
    thermals: {
      idleTemp: Number, // celsius
      loadTemp: Number, // celsius
      maxTemp: Number // celsius
    }
  },
  
  vendors: [{
    name: {
      type: String,
      required: true
    },
    price: {
      amount: Number,
      currency: String,
    },
    url: String,
    inStock: {
      type: Boolean,
      default: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  features: [{
    type: String,
    trim: true
  }],
  
  dimensions: {
    length: String, // e.g., "310mm"
    width: String, // e.g., "120mm"
    height: String, // e.g., "50mm"
    weight: String // e.g., "1.2kg"
  },
  
  warranty: {
    duration: String, // e.g., "3 years"
    type: String, // e.g., "Limited", "Full"
    provider: String // e.g., "Manufacturer", "Retailer"
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  sortOrder: {
    type: Number,
    default: 0
  },
  
  metadata: {
    seo: {
      title: String,
      description: String,
      keywords: [String]
    },
    slug: {
      type: String,
      unique: true,
      sparse: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
componentSchema.index({ category: 1, isActive: 1 });
componentSchema.index({ brand: 1, model: 1 });
componentSchema.index({ 'price.amount': 1 });
componentSchema.index({ 'pricing.individualPrice.amount': 1 });
componentSchema.index({ 'pricing.buildPrice.amount': 1 });
componentSchema.index({ 'pricing.cost.amount': 1 });
componentSchema.index({ tags: 1 });
componentSchema.index({ name: 'text', description: 'text', brand: 'text', model: 'text' });
componentSchema.index({ createdAt: -1 });
componentSchema.index({ 'ratings.average': -1 });
componentSchema.index({ isFeatured: -1, sortOrder: 1 });

// Virtual for formatted price (backward compatibility)
componentSchema.virtual('formattedPrice').get(function() {
  if (!this.price || !this.price.amount) return null;
  
  const formatter = new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: this.price.currency || 'AED'
  });
  
  return formatter.format(this.price.amount);
});

// Virtual for formatted individual price
componentSchema.virtual('formattedIndividualPrice').get(function() {
  if (!this.pricing || !this.pricing.individualPrice || !this.pricing.individualPrice.amount) return null;
  
  const formatter = new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: this.pricing.individualPrice.currency || 'AED'
  });
  
  return formatter.format(this.pricing.individualPrice.amount);
});

// Virtual for formatted build price
componentSchema.virtual('formattedBuildPrice').get(function() {
  if (!this.pricing || !this.pricing.buildPrice || !this.pricing.buildPrice.amount) return null;
  
  const formatter = new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: this.pricing.buildPrice.currency || 'AED'
  });
  
  return formatter.format(this.pricing.buildPrice.amount);
});

// Virtual for formatted cost
componentSchema.virtual('formattedCost').get(function() {
  if (!this.pricing || !this.pricing.cost || !this.pricing.cost.amount) return null;
  
  const formatter = new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: this.pricing.cost.currency || 'AED'
  });
  
  return formatter.format(this.pricing.cost.amount);
});

// Virtual for availability status
componentSchema.virtual('availabilityStatus').get(function() {
  if (!this.availability.inStock) return 'Out of Stock';
  if (this.availability.stockCount === 0) return 'Out of Stock';
  if (this.availability.stockCount < 5) return 'Low Stock';
  return 'In Stock';
});

// Pre-save middleware to generate slug and maintain backward compatibility
componentSchema.pre('save', function(next) {
  // Generate slug when name, brand, or model changes
  if (this.isModified('name') || this.isModified('brand') || this.isModified('model')) {
    const slugText = `${this.brand} ${this.name} ${this.model}`.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    this.metadata.slug = slugText;
  }
  
  // Maintain backward compatibility by syncing legacy price with individual price
  if (this.pricing && this.pricing.individualPrice && this.pricing.individualPrice.amount) {
    if (!this.price) {
      this.price = {};
    }
    this.price.amount = this.pricing.individualPrice.amount;
    this.price.currency = this.pricing.individualPrice.currency || 'AED';
  }
  
  next();
});

// Static method to find by category
componentSchema.statics.findByCategory = function(categoryId, options = {}) {
  const query = { category: categoryId, isActive: true };
  
  if (options.inStock) {
    query['availability.inStock'] = true;
    query['availability.stockCount'] = { $gt: 0 };
  }
  
  if (options.priceRange) {
    query['price.amount'] = {
      $gte: options.priceRange.min || 0,
      $lte: options.priceRange.max || Number.MAX_SAFE_INTEGER
    };
  }
  
  return this.find(query)
    .populate('category', 'name')
    .sort(options.sort || { sortOrder: 1, name: 1 });
};

// Static method to search components
componentSchema.statics.search = function(searchTerm, options = {}) {
  const query = {
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { brand: { $regex: searchTerm, $options: 'i' } },
          { model: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { tags: { $in: [new RegExp(searchTerm, 'i')] } }
        ]
      }
    ]
  };
  
  if (options.category) {
    query.$and.push({ category: options.category });
  }
  
  return this.find(query)
    .populate('category', 'name')
    .sort(options.sort || { 'ratings.average': -1, name: 1 });
};

// Instance method to check compatibility
componentSchema.methods.isCompatibleWith = function(otherComponent) {
  // Basic compatibility check - can be expanded with more complex logic
  if (this.compatibility.incompatibleWith.includes(otherComponent._id)) {
    return false;
  }
  
  // Add more compatibility logic here based on specifications
  return true;
};

module.exports = mongoose.model('Component', componentSchema);
