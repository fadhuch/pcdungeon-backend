const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['general', 'currency', 'tax', 'display', 'features'],
    default: 'general'
  }
}, {
  timestamps: true
});

// Default settings
const defaultSettings = [
  {
    key: 'currency',
    value: 'AED',
    type: 'string',
    description: 'Default currency for pricing',
    category: 'currency'
  },
  {
    key: 'taxRate',
    value: 5,
    type: 'number',
    description: 'VAT/Tax percentage',
    category: 'tax'
  },
  {
    key: 'defaultSorting',
    value: 'price',
    type: 'string',
    description: 'Default sorting method for components',
    category: 'display'
  },
  {
    key: 'enableCompatibilityCheck',
    value: true,
    type: 'boolean',
    description: 'Enable compatibility checking for builds',
    category: 'features'
  }
];

settingsSchema.statics.initializeDefaults = async function() {
  for (const setting of defaultSettings) {
    const exists = await this.findOne({ key: setting.key });
    if (!exists) {
      await this.create(setting);
    }
  }
};

module.exports = mongoose.model('Settings', settingsSchema);
