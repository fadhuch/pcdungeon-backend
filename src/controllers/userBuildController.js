const UserBuild = require('../models/userBuild');

// Get all user builds
exports.getUserBuilds = async (req, res) => {
  try {
    const { buildType, isPublic, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (buildType) filter.buildType = buildType;
    if (isPublic !== undefined) filter.isPublic = isPublic === 'true';
    
    const builds = await UserBuild.find(filter)
      .populate('user', 'username email')
      .populate('components.category', 'name')
      .populate('components.component', 'name brand price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await UserBuild.countDocuments(filter);
    
    res.status(200).json({
      status: 'success',
      results: builds.length,
      totalResults: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: { builds }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get user build by ID
exports.getUserBuild = async (req, res) => {
  try {
    const build = await UserBuild.findById(req.params.id)
      .populate('user', 'username email')
      .populate('components.category', 'name')
      .populate('components.component', 'name brand price specifications');
    
    if (!build) {
      return res.status(404).json({
        status: 'error',
        message: 'User build not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { build }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create new user build
exports.createUserBuild = async (req, res) => {
  try {
    const build = await UserBuild.create(req.body);
    await build.populate(['user', 'components.category', 'components.component']);
    
    res.status(201).json({
      status: 'success',
      data: { build }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update user build
exports.updateUserBuild = async (req, res) => {
  try {
    const build = await UserBuild.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate(['user', 'components.category', 'components.component']);
    
    if (!build) {
      return res.status(404).json({
        status: 'error',
        message: 'User build not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { build }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete user build
exports.deleteUserBuild = async (req, res) => {
  try {
    const build = await UserBuild.findByIdAndDelete(req.params.id);
    
    if (!build) {
      return res.status(404).json({
        status: 'error',
        message: 'User build not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'User build deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
