const Visitor = require('../models/visitor');
const QRCode = require('qrcode');

// Get all visitors
exports.getAllVisitors = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        
        // Build query
        const query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (status) {
            query.status = status;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        
        // Execute query with pagination
        const visitors = await Visitor.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await Visitor.countDocuments(query);
        
        res.status(200).json({
            status: 'success',
            data: {
                visitors,
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: visitors.length,
                    totalRecords: total
                }
            }
        });
    } catch (error) {
        console.error('Error fetching visitors:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch visitors'
        });
    }
};

// Get visitor by ID
exports.getVisitorById = async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id);
        
        if (!visitor) {
            return res.status(404).json({
                status: 'error',
                message: 'Visitor not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { visitor }
        });
    } catch (error) {
        console.error('Error fetching visitor:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch visitor'
        });
    }
};

// Create new visitor
exports.createVisitor = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                status: 'error',
                message: 'Visitor name is required'
            });
        }

        // Generate unique QR ID: name + random 5-digit number
        const generateQrId = (name) => {
            const cleanName = name.trim().replace(/\s+/g, '').toLowerCase();
            const randomNumber = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
            return `${cleanName}${randomNumber}`;
        };

        let qrId;
        let attempts = 0;
        const maxAttempts = 10;

        // Ensure unique QR ID
        do {
            qrId = generateQrId(name);
            const existingVisitor = await Visitor.findOne({ qrId });
            if (!existingVisitor) break;
            attempts++;
        } while (attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            return res.status(500).json({
                status: 'error',
                message: 'Unable to generate unique QR ID. Please try again.'
            });
        }

        // Create visitor
        const visitor = new Visitor({
            name: name.trim(),
            qrId
        });

        await visitor.save();

        // Generate QR code with scan URL
        const qrData = `https://onam.cartiquestore.com/scan/${qrId}`;
        
        const qrCodeSvg = await QRCode.toString(qrData, {
            type: 'svg',
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });

        // Update visitor with QR code
        visitor.qrCode = qrCodeSvg;
        await visitor.save();

        res.status(201).json({
            status: 'success',
            message: 'Visitor created successfully',
            data: { visitor }
        });
    } catch (error) {
        console.error('Error creating visitor:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create visitor'
        });
    }
};

// Update visitor status
exports.updateVisitorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'checked-in', 'checked-out'].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid status. Must be: pending, checked-in, or checked-out'
            });
        }

        const visitor = await Visitor.findById(id);
        
        if (!visitor) {
            return res.status(404).json({
                status: 'error',
                message: 'Visitor not found'
            });
        }

        // Update status and timestamps
        visitor.status = status;
        
        if (status === 'checked-in') {
            visitor.checkInTime = new Date();
            visitor.checkOutTime = null;
        } else if (status === 'checked-out') {
            visitor.checkOutTime = new Date();
            // Keep checkInTime if it exists
        }

        await visitor.save();

        res.status(200).json({
            status: 'success',
            message: 'Visitor status updated successfully',
            data: { visitor }
        });
    } catch (error) {
        console.error('Error updating visitor status:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update visitor status'
        });
    }
};

// Delete visitor
exports.deleteVisitor = async (req, res) => {
    try {
        const visitor = await Visitor.findByIdAndDelete(req.params.id);
        
        if (!visitor) {
            return res.status(404).json({
                status: 'error',
                message: 'Visitor not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'Visitor deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting visitor:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete visitor'
        });
    }
};

// Get visitor statistics
exports.getVisitorStats = async (req, res) => {
    try {
        const stats = await Visitor.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const total = await Visitor.countDocuments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayVisitors = await Visitor.countDocuments({
            createdAt: { $gte: today }
        });

        const statsObj = {
            total,
            todayVisitors,
            byStatus: {}
        };

        stats.forEach(stat => {
            statsObj.byStatus[stat._id] = stat.count;
        });

        res.status(200).json({
            status: 'success',
            data: { stats: statsObj }
        });
    } catch (error) {
        console.error('Error fetching visitor stats:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch visitor statistics'
        });
    }
};

// Scan QR code - increment scan count and return visitor info
exports.scanQRCode = async (req, res) => {
    try {
        console.log('Scan QR Code endpoint called');
        console.log('Request params:', req.params);
        console.log('Request headers:', req.headers);
        
        const { qrId } = req.params;

        if (!qrId) {
            console.log('QR ID missing in request');
            return res.status(400).json({
                status: 'error',
                message: 'QR ID is required'
            });
        }

        console.log('Looking for visitor with QR ID:', qrId);
        const visitor = await Visitor.findOne({ qrId });
        
        if (!visitor) {
            console.log('Visitor not found for QR ID:', qrId);
            return res.status(404).json({
                status: 'error',
                message: 'Visitor not found'
            });
        }

        console.log('Visitor found:', visitor.name, 'Current scan count:', visitor.scanCount);

        // Increment scan count and update last scanned time
        visitor.scanCount += 1;
        visitor.lastScannedAt = new Date();
        
        // Auto check-in on first scan if status is pending
        if (visitor.status === 'pending' && visitor.scanCount === 1) {
            visitor.status = 'checked-in';
            visitor.checkInTime = new Date();
            console.log('Auto check-in performed for first scan');
        }

        await visitor.save();
        console.log('Visitor updated successfully. New scan count:', visitor.scanCount);

        res.status(200).json({
            status: 'success',
            data: { 
                visitor,
                isFirstScan: visitor.scanCount === 1,
                isMultipleScan: visitor.scanCount > 1
            }
        });
    } catch (error) {
        console.error('Error scanning QR code:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            status: 'error',
            message: 'Failed to scan QR code',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
};
