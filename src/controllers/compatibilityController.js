const CompatibilityRule = require('../models/compatibilityRule');

// Get all compatibility rules
exports.getCompatibilityRules = async (req, res) => {
  try {
    const rules = await CompatibilityRule.find({ isActive: true })
      .populate('sourceCategory', 'name')
      .populate('targetCategory', 'name')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      status: 'success',
      results: rules.length,
      data: { rules }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get compatibility rule by ID
exports.getCompatibilityRule = async (req, res) => {
  try {
    const rule = await CompatibilityRule.findById(req.params.id)
      .populate('sourceCategory', 'name')
      .populate('targetCategory', 'name');
    
    if (!rule) {
      return res.status(404).json({
        status: 'error',
        message: 'Compatibility rule not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { rule }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create new compatibility rule
exports.createCompatibilityRule = async (req, res) => {
  try {
    const rule = await CompatibilityRule.create(req.body);
    await rule.populate(['sourceCategory', 'targetCategory'], 'name');
    
    res.status(201).json({
      status: 'success',
      data: { rule }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update compatibility rule
exports.updateCompatibilityRule = async (req, res) => {
  try {
    const rule = await CompatibilityRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate(['sourceCategory', 'targetCategory'], 'name');
    
    if (!rule) {
      return res.status(404).json({
        status: 'error',
        message: 'Compatibility rule not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { rule }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete compatibility rule
exports.deleteCompatibilityRule = async (req, res) => {
  try {
    const rule = await CompatibilityRule.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!rule) {
      return res.status(404).json({
        status: 'error',
        message: 'Compatibility rule not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Compatibility rule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
