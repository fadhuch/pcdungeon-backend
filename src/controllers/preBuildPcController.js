const PreBuildPc = require('../models/preBuildPc');
const Component = require('../models/component');

// Get all pre-built PCs with filtering and pagination
exports.getPreBuildPcs = async (req, res) => {
  try {
    const { 
      category, 
      page = 1, 
      limit = 12, 
      search,
      priceMin,
      priceMax,
      sortBy = 'popularity',
      inStock,
      featured
    } = req.query;
    
    const filter = { isActive: true };
    
    // Category filter
    if (category && category !== 'undefined' && category !== 'null' && category !== '') {
      filter.category = category;
    }
    
    // In stock filter
    if (inStock === 'true') {
      filter['availability.inStock'] = true;
    }
    
    // Featured filter
    if (featured === 'true') {
      filter.isFeatured = true;
    }
    
    // Price range filter
    if (priceMin || priceMax) {
      filter['pricing.sellingPrice'] = {};
      if (priceMin) filter['pricing.sellingPrice'].$gte = parseFloat(priceMin);
      if (priceMax) filter['pricing.sellingPrice'].$lte = parseFloat(priceMax);
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Sorting options
    let sortOptions = {};
    switch (sortBy) {
      case 'price-low':
        sortOptions = { 'pricing.sellingPrice': 1 };
        break;
      case 'price-high':
        sortOptions = { 'pricing.sellingPrice': -1 };
        break;
      case 'name':
        sortOptions = { name: 1 };
        break;
      case 'rating':
        sortOptions = { 'ratings.average': -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'popularity':
      default:
        sortOptions = { isFeatured: -1, 'ratings.average': -1, name: 1 };
        break;
    }
    
    const preBuildPcs = await PreBuildPc.find(filter)
      .populate('components.cpu.component', 'name brand model pricing price')
      .populate('components.gpu.component', 'name brand model pricing price')
      .populate('components.motherboard.component', 'name brand model pricing price')
      .populate('components.ram.component', 'name brand model pricing price')
      .populate('components.storage.component', 'name brand model pricing price')
      .populate('components.psu.component', 'name brand model pricing price')
      .populate('components.case.component', 'name brand model pricing price')
      .populate('components.cooling.component', 'name brand model pricing price')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await PreBuildPc.countDocuments(filter);
    
    // Get price range
    const priceRange = await PreBuildPc.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: null, 
          minPrice: { $min: '$pricing.sellingPrice' }, 
          maxPrice: { $max: '$pricing.sellingPrice' } 
        } 
      }
    ]);
    
    res.status(200).json({
      status: 'success',
      results: preBuildPcs.length,
      totalResults: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      filters: {
        categories: ['general', 'powered-by-asus'],
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
      },
      data: { preBuildPcs }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get pre-built PC by ID
exports.getPreBuildPc = async (req, res) => {
  try {
    const preBuildPc = await PreBuildPc.findById(req.params.id)
      .populate('components.cpu.component', 'name brand model pricing price')
      .populate('components.gpu.component', 'name brand model pricing price')
      .populate('components.motherboard.component', 'name brand model pricing price')
      .populate('components.ram.component', 'name brand model pricing price')
      .populate('components.storage.component', 'name brand model pricing price')
      .populate('components.psu.component', 'name brand model pricing price')
      .populate('components.case.component', 'name brand model pricing price')
      .populate('components.cooling.component', 'name brand model pricing price');
    
    if (!preBuildPc) {
      return res.status(404).json({
        status: 'error',
        message: 'Pre-built PC not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { preBuildPc }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create new pre-built PC
exports.createPreBuildPc = async (req, res) => {
  try {
    // If components are provided, populate their prices
    if (req.body.components) {
      for (const componentType of Object.keys(req.body.components)) {
        const componentData = req.body.components[componentType];
        if (componentData && componentData.component) {
          const component = await Component.findById(componentData.component);
          if (component) {
            componentData.name = `${component.brand} ${component.name}`;
            componentData.price = component.pricing?.buildPrice?.amount || component.price?.amount || 0;
          }
        }
      }
    }
    
    const preBuildPc = await PreBuildPc.create(req.body);
    await preBuildPc.populate('components.cpu.component', 'name brand model');
    await preBuildPc.populate('components.gpu.component', 'name brand model');
    await preBuildPc.populate('components.motherboard.component', 'name brand model');
    await preBuildPc.populate('components.ram.component', 'name brand model');
    await preBuildPc.populate('components.storage.component', 'name brand model');
    await preBuildPc.populate('components.psu.component', 'name brand model');
    await preBuildPc.populate('components.case.component', 'name brand model');
    await preBuildPc.populate('components.cooling.component', 'name brand model');
    
    res.status(201).json({
      status: 'success',
      data: { preBuildPc }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update pre-built PC
exports.updatePreBuildPc = async (req, res) => {
  try {
    // If components are provided, populate their prices
    if (req.body.components) {
      for (const componentType of Object.keys(req.body.components)) {
        const componentData = req.body.components[componentType];
        if (componentData && componentData.component) {
          const component = await Component.findById(componentData.component);
          if (component) {
            componentData.name = `${component.brand} ${component.name}`;
            componentData.price = component.pricing?.buildPrice?.amount || component.price?.amount || 0;
          }
        }
      }
    }
    
    const preBuildPc = await PreBuildPc.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('components.cpu.component', 'name brand model')
      .populate('components.gpu.component', 'name brand model')
      .populate('components.motherboard.component', 'name brand model')
      .populate('components.ram.component', 'name brand model')
      .populate('components.storage.component', 'name brand model')
      .populate('components.psu.component', 'name brand model')
      .populate('components.case.component', 'name brand model')
      .populate('components.cooling.component', 'name brand model');
    
    if (!preBuildPc) {
      return res.status(404).json({
        status: 'error',
        message: 'Pre-built PC not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { preBuildPc }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete pre-built PC
exports.deletePreBuildPc = async (req, res) => {
  try {
    const preBuildPc = await PreBuildPc.findByIdAndDelete(req.params.id);
    
    if (!preBuildPc) {
      return res.status(404).json({
        status: 'error',
        message: 'Pre-built PC not found'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get components for building pre-built PC
exports.getComponentsForBuild = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Map frontend category names to database category names
    const categoryMap = {
      'cpu': 'CPU',
      'gpu': 'GPU',
      'motherboard': 'Motherboard',
      'ram': 'RAM',
      'memory': 'RAM',
      'storage': 'Storage',
      'psu': 'Power Supply',
      'power-supply': 'Power Supply',
      'case': 'Case',
      'cooling': 'Cooling',
      'cooler': 'Cooling'
    };
    
    const categoryName = categoryMap[category.toLowerCase()];
    if (!categoryName) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid component category'
      });
    }

    // Find the category by name
    const Category = require('../models/category');
    const categoryDoc = await Category.findOne({ name: categoryName, isActive: true });
    
    if (!categoryDoc) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }
    
    const components = await Component.find({
      category: categoryDoc._id,
      isActive: true,
      'availability.inStock': true,
      'availability.stockCount': { $gt: 0 }
    })
      .populate('category', 'name')
      .select('name brand model pricing price description images')
      .sort({ name: 1 });
    
    res.status(200).json({
      status: 'success',
      data: { components }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
