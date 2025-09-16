const User = require('../models/user');
const UserBuild = require('../models/userBuild');

// Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Build filter object
        const filter = {};
        
        if (req.query.status) {
            filter.status = req.query.status;
        }
        
        if (req.query.search) {
            filter.$or = [
                { username: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        // Get users with builds count
        const users = await User.find(filter)
            .populate('builds')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-password');
        
        const totalUsers = await User.countDocuments(filter);
        const totalPages = Math.ceil(totalUsers / limit);
        
        res.json({
            status: 'success',
            data: {
                users,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: totalUsers,
                    limit,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch users'
        });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .populate('builds')
            .select('-password');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        
        res.json({
            status: 'success',
            data: { user }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user'
        });
    }
};

// Create new user
const createUser = async (req, res) => {
    try {
        const { username, email, password, status = 'active' } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });
        
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'User with this email or username already exists'
            });
        }
        
        const user = new User({
            username,
            email,
            password,
            status
        });
        
        await user.save();
        
        res.status(201).json({
            status: 'success',
            data: { user },
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Error creating user:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'User with this email or username already exists'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to create user'
        });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const allowedUpdates = ['username', 'email', 'status', 'role', 'permissions'];
        const updates = {};
        
        // Only include allowed fields
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        
        res.json({
            status: 'success',
            data: { user },
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'error',
                message: 'Username or email already exists'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to update user'
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        
        // Delete user's builds first
        await UserBuild.deleteMany({ userId: req.params.id });
        
        // Delete the user
        await User.findByIdAndDelete(req.params.id);
        
        res.json({
            status: 'success',
            message: 'User and associated data deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete user'
        });
    }
};

// Get user statistics
const getUserStats = async (req, res) => {
    try {
        const stats = await User.getStats();
        
        res.json({
            status: 'success',
            data: { stats }
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user statistics'
        });
    }
};

// Bulk update users
const bulkUpdateUsers = async (req, res) => {
    try {
        const { userIds, updates } = req.body;
        
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'userIds must be a non-empty array'
            });
        }
        
        const allowedUpdates = ['status', 'role'];
        const filteredUpdates = {};
        
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });
        
        const result = await User.updateMany(
            { _id: { $in: userIds } },
            filteredUpdates
        );
        
        res.json({
            status: 'success',
            data: { 
                modifiedCount: result.modifiedCount,
                matchedCount: result.matchedCount
            },
            message: `${result.modifiedCount} users updated successfully`
        });
    } catch (error) {
        console.error('Error bulk updating users:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update users'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserStats,
    bulkUpdateUsers
};
