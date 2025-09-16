const Component = require('../models/component');
const Category = require('../models/category');
const User = require('../models/user');
const UserBuild = require('../models/userBuild');

// Get all components with filtering and pagination
exports.getComponents = async (req, res) => {
  try {
    const { 
      category, 
      brand, 
      stockStatus, 
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
    
    // Brand filter
    if (brand) filter.brand = brand;
    
    // Stock status filter
    if (stockStatus) filter.stockStatus = stockStatus;
    
    // In stock filter
    if (inStock === 'true') {
      filter['availability.inStock'] = true;
    }
    
    // Featured filter
    if (featured === 'true') {
      filter.isFeatured = true;
    }
    
    // Price range filter - support both old and new pricing structure
    if (priceMin || priceMax) {
      const priceFilter = { $or: [] };
      
      // Legacy price filter
      if (priceMin || priceMax) {
        const legacyPriceFilter = {};
        if (priceMin) legacyPriceFilter.$gte = parseFloat(priceMin);
        if (priceMax) legacyPriceFilter.$lte = parseFloat(priceMax);
        priceFilter.$or.push({ 'price.amount': legacyPriceFilter });
      }
      
      // New individual price filter
      if (priceMin || priceMax) {
        const individualPriceFilter = {};
        if (priceMin) individualPriceFilter.$gte = parseFloat(priceMin);
        if (priceMax) individualPriceFilter.$lte = parseFloat(priceMax);
        priceFilter.$or.push({ 'pricing.individualPrice.amount': individualPriceFilter });
      }
      
      filter.$and = filter.$and || [];
      filter.$and.push(priceFilter);
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Sorting options
    let sortOptions = {};
    switch (sortBy) {
      case 'price-low':
        sortOptions = { 'price.amount': 1 };
        break;
      case 'price-high':
        sortOptions = { 'price.amount': -1 };
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
    
    const components = await Component.find(filter)
      .populate('category', 'name description')
      .select('name brand model price pricing description images availability ratings isFeatured tags specifications category')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Component.countDocuments(filter);
    
    // Get unique brands for filtering
    const brands = await Component.distinct('brand', { isActive: true });
    
    // Get price range
    const priceRange = await Component.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: null, 
          minPrice: { $min: '$price.amount' }, 
          maxPrice: { $max: '$price.amount' } 
        } 
      }
    ]);
    
    res.status(200).json({
      status: 'success',
      results: components.length,
      totalResults: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      filters: {
        brands: brands.sort(),
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
      },
      data: { components }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get component by ID
exports.getComponent = async (req, res) => {
  try {
    const component = await Component.findById(req.params.id)
      .populate('category', 'name description');
    
    if (!component) {
      return res.status(404).json({
        status: 'error',
        message: 'Component not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { component }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create new component
exports.createComponent = async (req, res) => {
  try {
    const component = await Component.create(req.body);
    await component.populate('category', 'name description');
    
    res.status(201).json({
      status: 'success',
      data: { component }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update component
exports.updateComponent = async (req, res) => {
  try {
    const component = await Component.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name description');
    
    if (!component) {
      return res.status(404).json({
        status: 'error',
        message: 'Component not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { component }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete component
exports.deleteComponent = async (req, res) => {
  try {
    const component = await Component.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!component) {
      return res.status(404).json({
        status: 'error',
        message: 'Component not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Component deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const { PreBuildPc } = require('../models'); // Import PreBuildPc model
    
    const totalComponents = await Component.countDocuments({ isActive: true });
    const totalCategories = await Category.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ status: { $ne: 'suspended' } });
    const totalBuilds = await UserBuild.countDocuments({ isActive: true });
    const totalPreBuilds = await PreBuildPc.countDocuments({ isActive: true });
    
    const popularComponents = await Component.find({ isActive: true })
      .populate('category', 'name')
      .sort({ popularity: -1 })
      .limit(5);
    
    const componentsByCategory = await Component.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { categoryName: '$category.name', count: 1 } }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalComponents,
          totalCategories,
          totalUsers,
          totalBuilds,
          totalPreBuilds,
          popularComponents,
          componentsByCategory
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get components for products page with enhanced formatting
exports.getProductsPage = async (req, res) => {
  try {
    const { 
      category, 
      brand, 
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
    
    // Always filter out out-of-stock items on products page
    filter['availability.inStock'] = true;
    filter['availability.stockCount'] = { $gt: 0 };
    
    // Category filter
    if (category && category !== 'undefined' && category !== 'null' && category !== '') {
      filter.category = category;
    }
    
    // Brand filter
    if (brand) filter.brand = brand;
    
    // Featured filter
    if (featured === 'true') {
      filter.isFeatured = true;
    }
    
    // Price range filter
    if (priceMin || priceMax) {
      filter['price.amount'] = {};
      if (priceMin) filter['price.amount'].$gte = parseFloat(priceMin);
      if (priceMax) filter['price.amount'].$lte = parseFloat(priceMax);
    }
    
    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Sorting options
    let sortOptions = {};
    switch (sortBy) {
      case 'price-low':
        sortOptions = { 'price.amount': 1 };
        break;
      case 'price-high':
        sortOptions = { 'price.amount': -1 };
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
    
    const components = await Component.find(filter)
      .populate('category', 'name description')
      .select('name brand model price description images availability ratings isFeatured tags specifications technicalSpecs features')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Transform components for product card display
    const products = components.map(component => ({
      _id: component._id,
      name: component.name,
      brand: component.brand,
      model: component.model,
      description: component.description,
      basePrice: component.price.amount,
      currency: component.price.currency,
      imageUrl: component.images?.primary || '/images/default-component.jpg',
      gallery: component.images?.gallery || [],
      thumbnail: component.images?.thumbnail,
      rating: component.ratings?.average || 0,
      ratingCount: component.ratings?.count || 0,
      inStock: component.availability?.inStock || false,
      stockCount: component.availability?.stockCount || 0,
      category: component.category,
      isFeatured: component.isFeatured,
      customizable: true, // All components are customizable in your system
      tags: component.tags || [],
      
      // Transform specifications into components array for the card
      components: [
        {
          type: 'cpu',
          name: component.technicalSpecs?.cores ? 
            `${component.technicalSpecs.cores} Core${component.technicalSpecs.cores > 1 ? 's' : ''}` : 
            component.name,
          price: component.price.amount * 0.3, // Estimated component price
          specs: {
            'Base Clock': component.technicalSpecs?.baseClock,
            'Boost Clock': component.technicalSpecs?.boostClock,
            'Socket': component.technicalSpecs?.socket
          }
        },
        {
          type: 'gpu',
          name: component.technicalSpecs?.vram ? 
            `${component.technicalSpecs.vram} Graphics` : 
            'Graphics Card',
          price: component.price.amount * 0.4,
          specs: {
            'VRAM': component.technicalSpecs?.vram,
            'Core Clock': component.technicalSpecs?.coreClock,
            'Interface': component.technicalSpecs?.interface
          }
        },
        {
          type: 'ram',
          name: component.technicalSpecs?.capacity || 'Memory',
          price: component.price.amount * 0.15,
          specs: {
            'Capacity': component.technicalSpecs?.capacity,
            'Speed': component.technicalSpecs?.speed,
            'Type': component.technicalSpecs?.speed?.includes('DDR5') ? 'DDR5' : 'DDR4'
          }
        },
        {
          type: 'storage',
          name: component.technicalSpecs?.capacity_storage || 'Storage',
          price: component.price.amount * 0.15,
          specs: {
            'Capacity': component.technicalSpecs?.capacity_storage,
            'Interface': component.technicalSpecs?.interface_storage,
            'Read Speed': component.technicalSpecs?.readSpeed
          }
        }
      ].filter(comp => comp.specs && Object.values(comp.specs).some(val => val)), // Only include components with actual specs
      
      // Available customization options
      availableOptions: {
        cpu: ['Intel i5', 'Intel i7', 'AMD Ryzen 5', 'AMD Ryzen 7'],
        gpu: ['RTX 4060', 'RTX 4070', 'RX 7600', 'RX 7700 XT'],
        ram: ['16GB', '32GB', '64GB'],
        storage: ['512GB SSD', '1TB SSD', '2TB SSD']
      }
    }));
    
    const total = await Component.countDocuments(filter);
    
    // Get categories for filtering
    const categories = await Category.find({ isActive: true }).select('_id name description');
    
    // Get unique brands for filtering
    const brands = await Component.distinct('brand', { isActive: true });
    
    // Get price range
    const priceRange = await Component.aggregate([
      { $match: { isActive: true } },
      { 
        $group: { 
          _id: null, 
          minPrice: { $min: '$price.amount' }, 
          maxPrice: { $max: '$price.amount' } 
        } 
      }
    ]);
    
    res.status(200).json({
      status: 'success',
      results: products.length,
      totalResults: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      filters: {
        categories,
        brands: brands.sort(),
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 }
      },
      data: { products }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
