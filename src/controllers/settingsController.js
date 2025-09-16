const Settings = require('../models/settings');

// Get all settings
exports.getSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    
    const settings = await Settings.find(filter).sort({ category: 1, key: 1 });
    
    res.status(200).json({
      status: 'success',
      results: settings.length,
      data: { settings }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get setting by key
exports.getSetting = async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({
        status: 'error',
        message: 'Setting not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: { setting }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update setting
exports.updateSetting = async (req, res) => {
  try {
    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      req.body,
      { new: true, runValidators: true, upsert: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: { setting }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update multiple settings
exports.updateMultipleSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const updatedSettings = [];
    
    for (const settingData of settings) {
      const setting = await Settings.findOneAndUpdate(
        { key: settingData.key },
        settingData,
        { new: true, runValidators: true, upsert: true }
      );
      updatedSettings.push(setting);
    }
    
    res.status(200).json({
      status: 'success',
      data: { settings: updatedSettings }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};
