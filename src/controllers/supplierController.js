const Supplier = require('../models/supplier');
const Product = require('../models/product');
const mongoose = require('mongoose');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const XLSX = require('xlsx');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        const allowedExtensions = ['.csv', '.xls', '.xlsx'];
        const hasValidType = allowedTypes.includes(file.mimetype);
        const hasValidExtension = allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext));
        
        if (hasValidType || hasValidExtension) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Get all suppliers
const getAllSuppliers = async (req, res) => {
    try {
        const { search } = req.query;
        let filter = {};

        // Apply search filter
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { contact: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { website: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });

        // For each supplier, find their products and calculate product count
        const suppliersWithProducts = await Promise.all(
            suppliers.map(async (supplier) => {
                // Find products for this supplier
                const products = await Product.find({
                    'suppliers.supplier': supplier._id
                });

                const productCount = products.length;
                const totalValue = products.reduce((sum, product) => {
                    const supplierEntry = product.suppliers.find(s => s.supplier.toString() === supplier._id.toString());
                    return sum + (supplierEntry ? supplierEntry.price : 0);
                }, 0);

                return {
                    ...supplier.toObject(),
                    productCount,
                    totalValue
                };
            })
        );

        res.status(200).json({
            status: 'success',
            results: suppliersWithProducts.length,
            data: suppliersWithProducts
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get supplier by ID
const getSupplierById = async (req, res) => {
    try {
        const supplierId = req.params.id;
        
        // Validate ObjectId
        if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid supplier ID provided'
            });
        }
        
        // Get the supplier
        const supplier = await Supplier.findById(supplierId);

        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        // Find all products that have this supplier in their suppliers array
        const products = await Product.find({
            'suppliers.supplier': supplierId
        }).populate('suppliers.supplier', 'name contact');

        // Extract products with this supplier's price information
        const supplierProducts = products.map(product => {
            // Find the supplier entry for this specific supplier
            const supplierEntry = product.suppliers.find(s => s.supplier._id.toString() === supplierId);
            
            return {
                _id: product._id,
                name: product.name,
                category: product.category,
                description: product.description,
                status: product.status,
                price: supplierEntry ? supplierEntry.price : 0,
                lastUpdated: supplierEntry ? supplierEntry.lastUpdated : null,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt
            };
        });

        // Create the response with supplier info and their products
        const supplierWithProducts = {
            ...supplier.toObject(),
            products: supplierProducts,
            productCount: supplierProducts.length,
            totalValue: supplierProducts.reduce((sum, product) => sum + product.price, 0)
        };

        res.status(200).json({
            status: 'success',
            data: supplierWithProducts
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Create new supplier
const createSupplier = async (req, res) => {
    try {
        const { name, contact, email, phone, address, website, location } = req.body;

        // Check if supplier with same email already exists (only if email is provided)
        if (email) {
            const existingSupplier = await Supplier.findOne({ email });
            if (existingSupplier) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Supplier with this email already exists'
                });
            }
        }

        const supplier = new Supplier({
            name,
            contact,
            email: email || undefined, // Only set email if provided
            phone,
            address,
            website: website || undefined, // Only set website if provided
            location: location || undefined // Only set location if provided
        });

        await supplier.save();

        res.status(201).json({
            status: 'success',
            data: supplier
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Update supplier
const updateSupplier = async (req, res) => {
    try {
        const { name, contact, email, phone, address, website, location } = req.body;

        // Check if email is being updated and if it already exists (only if email is provided)
        if (email) {
            const existingSupplier = await Supplier.findOne({ 
                email, 
                _id: { $ne: req.params.id } 
            });
            if (existingSupplier) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Supplier with this email already exists'
                });
            }
        }

        const updateData = {
            name,
            contact,
            phone,
            address
        };

        // Only update email, website, location if provided
        if (email !== undefined) updateData.email = email;
        if (website !== undefined) updateData.website = website;
        if (location !== undefined) updateData.location = location;

        const supplier = await Supplier.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('products.product', 'name category');

        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: supplier
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Delete supplier
const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);

        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        // Remove supplier from all products
        await Product.updateMany(
            { 'suppliers.supplier': req.params.id },
            { $pull: { suppliers: { supplier: req.params.id } } }
        );

        // Recalculate lowest prices for affected products
        const affectedProducts = await Product.find({
            'suppliers.supplier': { $exists: true }
        });

        for (const product of affectedProducts) {
            if (product.suppliers.length > 0) {
                product.lowestPrice = Math.min(...product.suppliers.map(s => s.price));
            } else {
                product.lowestPrice = 0;
            }
            await product.save();
        }

        res.status(200).json({
            status: 'success',
            message: 'Supplier deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Add product to supplier
const addProductToSupplier = async (req, res) => {
    try {
        const { productId, price } = req.body;
        const supplierId = req.params.id;

        // Check if supplier exists
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found'
            });
        }

        // Check if product already exists for this supplier
        const existingProduct = supplier.products.find(p => p.product.toString() === productId);
        if (existingProduct) {
            existingProduct.price = price;
            existingProduct.lastUpdated = Date.now();
        } else {
            supplier.products.push({
                product: productId,
                price: price
            });
        }

        await supplier.save();

        // Also add supplier to product if not exists
        const existingSupplier = product.suppliers.find(s => s.supplier.toString() === supplierId);
        if (existingSupplier) {
            existingSupplier.price = price;
            existingSupplier.lastUpdated = Date.now();
        } else {
            product.suppliers.push({
                supplier: supplierId,
                price: price
            });
        }

        await product.save();

        const updatedSupplier = await Supplier.findById(supplierId)
            .populate('products.product', 'name category');

        res.status(200).json({
            status: 'success',
            data: updatedSupplier
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Remove product from supplier
const removeProductFromSupplier = async (req, res) => {
    try {
        const { supplierId, productId } = req.params;

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        // Remove product from supplier
        supplier.products = supplier.products.filter(p => p.product.toString() !== productId);
        await supplier.save();

        // Remove supplier from product
        await Product.findByIdAndUpdate(
            productId,
            { $pull: { suppliers: { supplier: supplierId } } }
        );

        const updatedSupplier = await Supplier.findById(supplierId)
            .populate('products.product', 'name category');

        res.status(200).json({
            status: 'success',
            data: updatedSupplier
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Add comment to supplier
const addSupplierComment = async (req, res) => {
    try {
        const { text, author } = req.body;
        const supplierId = req.params.id;

        if (!text || !author) {
            return res.status(400).json({
                status: 'error',
                message: 'Text and author are required'
            });
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        const newComment = {
            content: text, // Map 'text' from frontend to 'content' for backend model
            author,
            createdAt: new Date()
        };

        supplier.comments.push(newComment);
        await supplier.save();

        // Return the comment with 'text' field for frontend consistency
        const returnComment = {
            ...newComment,
            text: newComment.content,
            _id: supplier.comments[supplier.comments.length - 1]._id
        };
        delete returnComment.content;

        res.status(201).json({
            status: 'success',
            data: returnComment
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get supplier comments
const getSupplierComments = async (req, res) => {
    try {
        const supplierId = req.params.id;

        const supplier = await Supplier.findById(supplierId).select('comments');
        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        // Map 'content' field to 'text' for frontend consistency
        const commentsWithText = supplier.comments.map(comment => ({
            _id: comment._id,
            text: comment.content,
            author: comment.author,
            createdAt: comment.createdAt
        }));

        res.status(200).json({
            status: 'success',
            data: commentsWithText
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Add rating to supplier
const addSupplierRating = async (req, res) => {
    try {
        const { rating, comment, author } = req.body;
        const supplierId = req.params.id;

        if (!rating || !author) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating and author are required'
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating must be between 1 and 5'
            });
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        const newRating = {
            rating: Number(rating),
            comment: comment || '',
            author,
            createdAt: new Date()
        };

        supplier.ratings.push(newRating);
        await supplier.save(); // This will trigger the pre-save hook to calculate average rating

        res.status(201).json({
            status: 'success',
            data: newRating
        });
    } catch (error) {
        res.status(400).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get supplier ratings
const getSupplierRatings = async (req, res) => {
    try {
        const supplierId = req.params.id;

        const supplier = await Supplier.findById(supplierId).select('ratings averageRating');
        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                ratings: supplier.ratings,
                averageRating: supplier.averageRating
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get orders for a specific supplier
const getSupplierOrders = async (req, res) => {
    try {
        const supplierId = req.params.id;

        // Validate ObjectId
        if (!supplierId || !mongoose.Types.ObjectId.isValid(supplierId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid supplier ID provided'
            });
        }

        // Check if supplier exists
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({
                status: 'error',
                message: 'Supplier not found'
            });
        }

        // Get orders from the Order model - find orders where this supplier is in the suppliers array or is the main supplier
        const Order = require('../models/order');
        
        const orders = await Order.find({
            $or: [
                { 'suppliers._id': supplierId },
                { 'supplierId': supplierId }
            ]
        })
        .populate('productId', 'name category')
        .sort({ orderDate: -1 });

        res.status(200).json({
            status: 'success',
            data: orders,
            count: orders.length
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Bulk upload suppliers
const bulkUploadSuppliers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }

        const results = [];
        const errors = [];
        let created = 0;
        let updated = 0;
        let data = [];

        // Parse file based on type
        const fileName = req.file.originalname.toLowerCase();
        
        if (fileName.endsWith('.csv')) {
            // Parse CSV data from buffer
            const csvData = req.file.buffer.toString();
            const lines = csvData.split('\n').filter(line => line.trim());
            
            if (lines.length <= 1) {
                return res.status(400).json({
                    status: 'error',
                    message: 'CSV file is empty or has no data rows'
                });
            }

            // Parse header
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            // Process each data row
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const rowData = {};

                // Map values to headers
                headers.forEach((header, index) => {
                    if (values[index]) {
                        rowData[header] = values[index];
                    }
                });

                data.push({ row: i + 1, data: rowData });
            }
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            // Parse Excel file
            try {
                const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length <= 1) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Excel file is empty or has no data rows'
                    });
                }

                const headers = jsonData[0].map(h => h ? h.toString().trim() : '');
                
                // Process each data row
                for (let i = 1; i < jsonData.length; i++) {
                    const values = jsonData[i] || [];
                    const rowData = {};

                    // Map values to headers
                    headers.forEach((header, index) => {
                        if (values[index] !== undefined && values[index] !== null && values[index] !== '') {
                            rowData[header] = values[index].toString().trim();
                        }
                    });

                    // Skip empty rows
                    if (Object.keys(rowData).length > 0) {
                        data.push({ row: i + 1, data: rowData });
                    }
                }
            } catch (excelError) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Failed to parse Excel file: ' + excelError.message
                });
            }
        } else {
            return res.status(400).json({
                status: 'error',
                message: 'Unsupported file format. Please use CSV or Excel files.'
            });
        }

        // Process each row
        for (const rowInfo of data) {
            const { row, data: row_data } = rowInfo;
            const rowNumber = row + 1; // Adjust for header row

            try {
                // Map CSV/Excel columns to supplier fields
                const supplierData = {
                    name: row_data['Company Name*'] || row_data['Company Name'] || row_data['name'],
                    contact: row_data['Contact Person*'] || row_data['Contact Person'] || row_data['contact'],
                    email: row_data['Email'] || row_data['email'],
                    phone: row_data['Phone*'] || row_data['Phone'] || row_data['phone'],
                    website: row_data['Website'] || row_data['website'],
                    location: row_data['Location'] || row_data['location'],
                    address: row_data['Address*'] || row_data['Address'] || row_data['address']
                };

                // Validate required fields
                if (!supplierData.name || !supplierData.contact || !supplierData.phone || !supplierData.address) {
                    errors.push({
                        row: rowNumber,
                        message: 'Missing required fields (Company Name, Contact Person, Phone, Address)'
                    });
                    continue;
                }

                // Check if supplier exists (by email if provided, otherwise by name and phone)
                let existingSupplier = null;
                if (supplierData.email) {
                    existingSupplier = await Supplier.findOne({ email: supplierData.email });
                } else {
                    existingSupplier = await Supplier.findOne({ 
                        name: supplierData.name, 
                        phone: supplierData.phone 
                    });
                }

                if (existingSupplier) {
                    // Update existing supplier
                    const updateData = {
                        name: supplierData.name,
                        contact: supplierData.contact,
                        phone: supplierData.phone,
                        address: supplierData.address
                    };

                    // Only update optional fields if provided
                    if (supplierData.email) updateData.email = supplierData.email;
                    if (supplierData.website) updateData.website = supplierData.website;
                    if (supplierData.location) updateData.location = supplierData.location;

                    await Supplier.findByIdAndUpdate(existingSupplier._id, updateData, { 
                        new: true, 
                        runValidators: true 
                    });
                    
                    updated++;
                } else {
                    // Create new supplier
                    const newSupplier = new Supplier({
                        name: supplierData.name,
                        contact: supplierData.contact,
                        email: supplierData.email || undefined,
                        phone: supplierData.phone,
                        website: supplierData.website || undefined,
                        location: supplierData.location || undefined,
                        address: supplierData.address
                    });

                    await newSupplier.save();
                    created++;
                }

            } catch (error) {
                errors.push({
                    row: rowNumber,
                    message: error.message
                });
            }
        }

        // Return results
        const successMessage = `Bulk upload completed. Created: ${created}, Updated: ${updated}`;
        const hasErrors = errors.length > 0;

        res.status(hasErrors ? 207 : 200).json({
            status: hasErrors ? 'partial_success' : 'success',
            message: successMessage,
            details: {
                created,
                updated,
                errors: errors.length,
                errorDetails: errors.slice(0, 10) // Return first 10 errors
            }
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    bulkUploadSuppliers,
    upload,
    addProductToSupplier,
    removeProductFromSupplier,
    addSupplierComment,
    getSupplierComments,
    addSupplierRating,
    getSupplierRatings,
    getSupplierOrders
};
