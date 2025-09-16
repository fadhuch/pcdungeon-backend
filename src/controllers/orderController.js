const Order = require('../models/order');
const Product = require('../models/product');
const Supplier = require('../models/supplier');

// Get all orders with filtering and pagination
const getAllOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      search,
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const orders = await Order.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('productId', 'name category')
      .populate('supplierId', 'name contact')
      .populate('suppliers._id', 'name contact email');

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get single order by ID
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('productId', 'name category description')
      .populate('supplierId', 'name contact email phone address')
      .populate('suppliers._id', 'name contact email phone address');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const { 
      description, 
      productId, 
      productName, 
      quantity, 
      unitPrice, 
      listedPrice, 
      supplierId, 
      supplierName,
      suppliers,
      expectedDeliveryDate, 
      notes 
    } = req.body;

    // Validate product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({
        success: false,
        message: `Product with ID ${productId} not found`
      });
    }

    // Validate main supplier if provided
    let supplier = null;
    if (supplierId) {
      supplier = await Supplier.findById(supplierId);
      if (!supplier) {
        return res.status(400).json({
          success: false,
          message: `Supplier with ID ${supplierId} not found`
        });
      }
    }

    // Validate additional suppliers if provided
    let validatedSuppliers = [];
    if (suppliers && suppliers.length > 0) {
      for (const supplierInfo of suppliers) {
        if (supplierInfo._id) {
          const supplierDoc = await Supplier.findById(supplierInfo._id);
          if (supplierDoc) {
            validatedSuppliers.push({
              _id: supplierDoc._id,
              name: supplierDoc.name,
              contact: supplierDoc.contact,
              email: supplierDoc.email,
              price: supplierInfo.price,
              isBestPrice: supplierInfo.isBestPrice || false
            });
          }
        }
      }
    }

    const orderData = {
      description,
      productId,
      productName: productName || product.name,
      quantity,
      unitPrice: unitPrice || 0,
      listedPrice: listedPrice || 0,
      suppliers: validatedSuppliers,
      expectedDeliveryDate,
      notes
    };

    // Only add supplier fields if supplierId is provided
    if (supplierId) {
      orderData.supplierId = supplierId;
      orderData.supplierName = supplierName || (supplier ? supplier.name : '');
    }

    const order = new Order(orderData);

    // Update best price indicators
    order.updateBestPriceIndicators();

    await order.save();

    // Populate the saved order
    await order.populate('productId', 'name category');
    if (order.supplierId) {
      await order.populate('supplierId', 'name contact');
    }
    
    // Only populate suppliers that exist
    if (order.suppliers && order.suppliers.length > 0) {
      await order.populate('suppliers._id', 'name contact email');
    }

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

// Update order
const updateOrder = async (req, res) => {
  try {
    const { 
      description, 
      productId, 
      productName, 
      quantity, 
      unitPrice, 
      listedPrice, 
      supplierId, 
      supplierName,
      suppliers,
      status, 
      expectedDeliveryDate, 
      notes 
    } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update fields if provided
    if (description !== undefined) order.description = description;
    if (productId !== undefined) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product with ID ${productId} not found`
        });
      }
      order.productId = productId;
      order.productName = productName || product.name;
    }
    if (quantity !== undefined) order.quantity = quantity;
    if (unitPrice !== undefined) order.unitPrice = unitPrice;
    if (listedPrice !== undefined) order.listedPrice = listedPrice;
    if (supplierId !== undefined) {
      if (supplierId) {
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
          return res.status(400).json({
            success: false,
            message: `Supplier with ID ${supplierId} not found`
          });
        }
        order.supplierId = supplierId;
        order.supplierName = supplierName || supplier.name;
      } else {
        order.supplierId = null;
        order.supplierName = supplierName || '';
      }
    }
    if (suppliers !== undefined) {
      // Validate and update suppliers
      let validatedSuppliers = [];
      for (const supplierInfo of suppliers) {
        const supplierDoc = await Supplier.findById(supplierInfo._id);
        if (supplierDoc) {
          validatedSuppliers.push({
            _id: supplierDoc._id,
            name: supplierDoc.name,
            contact: supplierDoc.contact,
            email: supplierDoc.email,
            price: supplierInfo.price,
            isBestPrice: supplierInfo.isBestPrice || false
          });
        }
      }
      order.suppliers = validatedSuppliers;
    }
    if (status !== undefined) order.status = status;
    if (expectedDeliveryDate !== undefined) order.expectedDeliveryDate = expectedDeliveryDate;
    if (notes !== undefined) order.notes = notes;

    // Update best price indicators
    order.updateBestPriceIndicators();

    await order.save();

    // Populate the updated order
    await order.populate('productId', 'name category');
    await order.populate('supplierId', 'name contact');
    await order.populate('suppliers._id', 'name contact email');

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order',
      error: error.message
    });
  }
};

// Update order status only
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['Pending', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.status = status;
    order.updatedAt = new Date();
    await order.save();

    // Populate the updated order
    await order.populate('items.productId', 'name category');
    await order.populate('items.supplierId', 'name contact');

    res.json({
      success: true,
      data: order,
      message: `Order status updated to ${status} successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
};

// Delete order (soft delete by setting status to Cancelled)
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Soft delete by setting status to Cancelled
    order.status = 'Cancelled';
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message
    });
  }
};

// Get order analytics
const getOrderAnalytics = async (req, res) => {
  try {
    const analytics = await Order.getOrderAnalytics();
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order analytics',
      error: error.message
    });
  }
};

// Get available suppliers for a product
const getProductSuppliers = async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findById(productId)
      .populate('suppliers.supplier', 'name contact email phone address');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const suppliers = product.suppliers.map(s => ({
      id: s.supplier._id,
      name: s.supplier.name,
      contact: s.supplier.contact,
      email: s.supplier.email,
      phone: s.supplier.phone,
      address: s.supplier.address,
      price: s.price
    }));

    // Find the best price
    const bestPriceSupplier = suppliers.reduce((min, current) => 
      current.price < min.price ? current : min
    );

    res.json({
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          category: product.category,
          description: product.description
        },
        suppliers,
        bestPriceSupplier
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product suppliers',
      error: error.message
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getOrderAnalytics,
  getProductSuppliers
};
