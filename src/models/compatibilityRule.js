const mongoose = require('mongoose');

const compatibilityRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sourceCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  targetCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  rules: [{
    sourceTag: {
      type: String,
      required: true,
      trim: true
    },
    targetTag: {
      type: String,
      required: true,
      trim: true
    },
    compatible: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for quick lookups
compatibilityRuleSchema.index({ sourceCategory: 1, targetCategory: 1 });

module.exports = mongoose.model('CompatibilityRule', compatibilityRuleSchema);
