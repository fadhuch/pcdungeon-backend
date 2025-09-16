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
<<<<<<< HEAD
=======
  color: {
    type: String,
    required: true,
    default: 'bg-gray-100 text-gray-800'
  },
>>>>>>> eb325fe022e5165673bba4598ff70524d395f366
  description: {
    type: String,
    trim: true
  },
<<<<<<< HEAD
  required: {
    type: Boolean,
    default: false,
    description: 'Whether this category must be selected when building a PC'
  },
  icon: {
    type: String,
    trim: true
  },
  fields: [fieldSchema],
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
=======
  productCount: {
    type: Number,
    default: 0
>>>>>>> eb325fe022e5165673bba4598ff70524d395f366
  }
}, {
  timestamps: true
});

<<<<<<< HEAD
// Index for better performance
categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.index({ name: 1 });

// Virtual to get active fields only
categorySchema.virtual('activeFields').get(function() {
  return this.fields.filter(field => field.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
});

// Method to add a field
categorySchema.methods.addField = function(fieldData) {
  this.fields.push(fieldData);
  return this.save();
};

// Method to update a field
categorySchema.methods.updateField = function(fieldId, fieldData) {
  const field = this.fields.id(fieldId);
  if (field) {
    Object.assign(field, fieldData);
    return this.save();
  }
  throw new Error('Field not found');
};

// Method to remove a field
categorySchema.methods.removeField = function(fieldId) {
  this.fields.pull(fieldId);
  return this.save();
=======
// Update product count when products are added/removed
categorySchema.methods.updateProductCount = async function() {
  const Product = mongoose.model('Product');
  const count = await Product.countDocuments({ category: this.name });
  this.productCount = count;
  await this.save();
  return this;
>>>>>>> eb325fe022e5165673bba4598ff70524d395f366
};

module.exports = mongoose.model('Category', categorySchema);
