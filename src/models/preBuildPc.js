const mongoose = require('mongoose');

const preBuildPcSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Pre-built PC name is required'],
    trim: true,
    maxlength: [200, 'Pre-built PC name cannot exceed 200 characters']
  },
  
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['general', 'powered-by-asus'],
    default: 'general'
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  components: {
    cpu: {
      component: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component'
      },
      name: String,
      price: Number
    },
    gpu: {
      component: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component'
      },
      name: String,
      price: Number
    },
    motherboard: {
      component: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component'
      },
      name: String,
      price: Number
    },
    ram: {
      component: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component'
      },
      name: String,
      price: Number
    },
    storage: {
      component: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component'
      },
      name: String,
      price: Number
    },
    psu: {
      component: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component'
      },
      name: String,
      price: Number
    },
    case: {
      component: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component'
      },
      name: String,
      price: Number
    },
    cooling: {
      component: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Component'
      },
      name: String,
      price: Number
    }
  },
  
  pricing: {
    componentsCost: {
      type: Number,
      default: 0
    },
    assemblyFee: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    currency: {
      type: String,
      default: 'AED'
    }
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
    estimatedBuildTime: {
      type: String, // e.g., "2-3 business days"
      default: '3-5 business days'
    }
  },
  
  specifications: {
    performance: {
      gaming: String, // e.g., "High-end gaming", "Budget gaming"
      workload: String, // e.g., "Content creation", "Office work"
      benchmarks: [{
        game: String,
        fps: Number,
        settings: String
      }]
    },
    features: [{
      type: String,
      trim: true
    }],
    warranty: {
      duration: String, // e.g., "2 years"
      type: String, // e.g., "Full system warranty"
      provider: String // e.g., "PC Dungeon"
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
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
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
preBuildPcSchema.index({ category: 1, isActive: 1 });
preBuildPcSchema.index({ 'pricing.sellingPrice': 1 });
preBuildPcSchema.index({ isFeatured: -1, sortOrder: 1 });
preBuildPcSchema.index({ name: 'text', description: 'text' });
preBuildPcSchema.index({ createdAt: -1 });
preBuildPcSchema.index({ 'ratings.average': -1 });

// Virtual for formatted price
preBuildPcSchema.virtual('formattedPrice').get(function() {
  const formatter = new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: this.pricing.currency || 'AED'
  });
  
  return formatter.format(this.pricing.sellingPrice);
});

// Virtual for availability status
preBuildPcSchema.virtual('availabilityStatus').get(function() {
  if (!this.availability.inStock) return 'Out of Stock';
  if (this.availability.stockCount === 0) return 'Build to Order';
  if (this.availability.stockCount < 3) return 'Limited Stock';
  return 'In Stock';
});

// Virtual for component count
preBuildPcSchema.virtual('componentCount').get(function() {
  const components = this.components;
  return Object.keys(components).filter(key => 
    components[key] && components[key].component
  ).length;
});

// Pre-save middleware to calculate costs and generate slug
preBuildPcSchema.pre('save', function(next) {
  // Generate slug
  if (this.isModified('name') || this.isModified('category')) {
    const slugText = `${this.name} ${this.category}`.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    this.metadata.slug = slugText;
  }
  
  // Calculate components cost
  let componentsCost = 0;
  Object.keys(this.components).forEach(key => {
    if (this.components[key] && this.components[key].price) {
      componentsCost += this.components[key].price;
    }
  });
  
  this.pricing.componentsCost = componentsCost;
  this.pricing.totalCost = componentsCost + (this.pricing.assemblyFee || 0);
  
  next();
});

// Static method to find by category
preBuildPcSchema.statics.findByCategory = function(category, options = {}) {
  const query = { category, isActive: true };
  
  if (options.inStock) {
    query['availability.inStock'] = true;
  }
  
  if (options.priceRange) {
    query['pricing.sellingPrice'] = {
      $gte: options.priceRange.min || 0,
      $lte: options.priceRange.max || Number.MAX_SAFE_INTEGER
    };
  }
  
  return this.find(query)
    .populate('components.cpu.component', 'name brand model')
    .populate('components.gpu.component', 'name brand model')
    .populate('components.motherboard.component', 'name brand model')
    .populate('components.ram.component', 'name brand model')
    .populate('components.storage.component', 'name brand model')
    .populate('components.psu.component', 'name brand model')
    .populate('components.case.component', 'name brand model')
    .populate('components.cooling.component', 'name brand model')
    .sort(options.sort || { sortOrder: 1, name: 1 });
};

module.exports = mongoose.model('PreBuildPc', preBuildPcSchema);
