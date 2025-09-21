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
  fields: [fieldSchema],
  productCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Method to add a field
categorySchema.methods.addField = function(fieldData) {
  this.fields.push(fieldData);
  return this.save();
};

// Method to update a field
categorySchema.methods.updateField = function(fieldId, updateData) {
  const field = this.fields.id(fieldId);
  if (!field) {
    throw new Error('Field not found');
  }
  
  Object.assign(field, updateData);
  return this.save();
};

// Method to remove a field
categorySchema.methods.removeField = function(fieldId) {
  this.fields.pull(fieldId);
  return this.save();
};

// Virtual for active fields
categorySchema.virtual('activeFields').get(function() {
  return this.fields.filter(field => field.isActive);
});

// Method to update product count
categorySchema.methods.updateProductCount = async function() {
  const Product = require('./product');
  this.productCount = await Product.countDocuments({ category: this.name });
  return this.save();
};

module.exports = mongoose.model('Category', categorySchema);
