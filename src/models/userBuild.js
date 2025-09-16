const mongoose = require('mongoose');

const userBuildSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous builds
  },
  components: [{
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    component: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Component',
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    }
  }],
  totalPrice: {
    type: Number,
    default: 0
  },
  buildType: {
    type: String,
    enum: ['gaming', 'office', 'workstation', 'budget', 'high-end', 'custom'],
    default: 'custom'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for searching builds
userBuildSchema.index({ buildType: 1, isPublic: 1 });
userBuildSchema.index({ totalPrice: 1 });
userBuildSchema.index({ createdAt: -1 });

module.exports = mongoose.model('UserBuild', userBuildSchema);
