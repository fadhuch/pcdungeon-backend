const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['admin', 'sub-admin', 'customer'],
        default: 'customer'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    permissions: {
        canViewCosts: {
            type: Boolean,
            default: true
        },
        canEditProducts: {
            type: Boolean,
            default: true
        },
        canManagePurchases: {
            type: Boolean,
            default: true
        },
        canManageSales: {
            type: Boolean,
            default: true
        },
        canManageUsers: {
            type: Boolean,
            default: false
        },
        canViewReports: {
            type: Boolean,
            default: true
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    profile: {
        firstName: String,
        lastName: String,
        phone: String,
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String,
            country: String
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Set default permissions based on role
userSchema.pre('save', function(next) {
    if (this.isModified('role')) {
        if (this.role === 'admin') {
            this.permissions = {
                canViewCosts: true,
                canEditProducts: true,
                canManagePurchases: true,
                canManageSales: true,
                canManageUsers: true,
                canViewReports: true
            };
        } else if (this.role === 'sub-admin') {
            // Sub-admin permissions can be customized by main admin
            this.permissions = {
                canViewCosts: false, // Hidden by default
                canEditProducts: true,
                canManagePurchases: false,
                canManageSales: true,
                canManageUsers: false,
                canViewReports: false
            };
        }
    }
    next();
});

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ status: 1 });

// Virtual for user's builds
userSchema.virtual('builds', {
    ref: 'UserBuild',
    localField: '_id',
    foreignField: 'userId',
    count: true
});

// Static method to get user stats
userSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                suspendedUsers: {
                    $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] }
                },
                newUsersThisMonth: {
                    $sum: {
                        $cond: [
                            {
                                $gte: ['$createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalUsers: 0,
        activeUsers: 0,
        suspendedUsers: 0,
        newUsersThisMonth: 0
    };
};
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
