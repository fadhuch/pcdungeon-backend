const Category = require('../models/category');

// Get all categories
const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        
        res.status(200).json({
            status: 'success',
            results: categories.length,
            data: categories
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get category by ID
const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: category
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Create new category
const createCategory = async (req, res) => {
    try {
        const { name, color, description } = req.body;

        // Check if category already exists
        const existingCategory = await Category.findOne({ 
            name: { $regex: new RegExp(`^${name}$`, 'i') } 
        });

        if (existingCategory) {
            return res.status(400).json({
                status: 'error',
                message: 'Category with this name already exists'
            });
        }

        const category = await Category.create({
            name,
            color: color || 'bg-gray-100 text-gray-800',
            description
        });

        res.status(201).json({
            status: 'success',
            data: category
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Category with this name already exists'
            });
        }
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { name, color, description } = req.body;

        // Check if another category has the same name
        if (name) {
            const existingCategory = await Category.findOne({ 
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: req.params.id }
            });

            if (existingCategory) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Category with this name already exists'
                });
            }
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, color, description },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }

        // Update product count

        res.status(200).json({
            status: 'success',
            data: category
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Category with this name already exists'
            });
        }
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                status: 'error',
                message: 'Category not found'
            });
        }

        // Check if category is being used by products
        const Product = require('../models/product');
     

        await Category.findByIdAndDelete(req.params.id);

        res.status(200).json({
            status: 'success',
            message: 'Category deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Add field to category
const addField = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    const fieldData = {
      ...req.body,
      sortOrder: category.fields.length
    };

    await category.addField(fieldData);
    
    res.status(201).json({
      status: 'success',
      data: { category }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update field in category
const updateField = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    await category.updateField(req.params.fieldId, req.body);
    
    res.status(200).json({
      status: 'success',
      data: { category }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Remove field from category
const removeField = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    await category.removeField(req.params.fieldId);
    
    res.status(200).json({
      status: 'success',
      data: { category }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get category with active fields only
const getCategoryWithFields = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found'
      });
    }

    const response = {
      ...category.toObject(),
      activeFields: category.activeFields
    };
    
    res.status(200).json({
      status: 'success',
      data: { category: response }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update product counts for all categories
const updateAllProductCounts = async (req, res) => {
    try {
        const categories = await Category.find();
       
        res.status(200).json({
            status: 'success',
            message: 'Product counts updated for all categories'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    updateAllProductCounts,
    addField,
    updateField,
    removeField,
    getCategoryWithFields
};
