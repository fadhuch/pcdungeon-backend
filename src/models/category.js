const mongoose = require('mongoose');

const fieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'number', 'select', 'boolean', 'textarea', 'url', 'email']
  },
  required: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    trim: true
  },
  helpText: {
    type: String,
    trim: true
  },
  validation: {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String
  },
  options: [{
    value: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    default: 'bg-gray-100 text-gray-800'
  },
  description: {
    type: String,
    trim: true
  },
  productCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);
