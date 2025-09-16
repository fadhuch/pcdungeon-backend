const mongoose = require('mongoose');
const Product = require('./models/product');
const Supplier = require('./models/supplier');

const MONGO_URI = 'mongodb+srv://fahad:Fahad%40123@cluster0.tri5xk7.mongodb.net/alshiraa?retryWrites=true&w=majority';

const sampleSuppliers = [
    {
        name: 'Tech Supplies Inc',
        contact: 'John Smith',
        email: 'john@techsupplies.com',
        phone: '+1 234-567-8901',
        address: '123 Tech Street, Silicon Valley, CA 94000'
    },
    {
        name: 'Electronics World',
        contact: 'Sarah Johnson',
        email: 'sarah@electronicsworld.com',
        phone: '+1 234-567-8902',
        address: '456 Electronics Ave, New York, NY 10001'
    },
    {
        name: 'Furniture Plus',
        contact: 'Mike Brown',
        email: 'mike@furnitureplus.com',
        phone: '+1 234-567-8903',
        address: '789 Furniture Blvd, Chicago, IL 60601'
    },
    {
        name: 'Fashion Hub',
        contact: 'Lisa Davis',
        email: 'lisa@fashionhub.com',
        phone: '+1 234-567-8904',
        address: '321 Fashion Street, Los Angeles, CA 90210'
    }
];

const sampleProducts = [
    {
        name: 'Laptop Dell XPS 13',
        category: 'Electronics',
        description: 'High-performance ultrabook with Intel Core i7 processor',
        status: 'Available'
    },
    {
        name: 'Office Chair Ergonomic',
        category: 'Furniture',
        description: 'Comfortable ergonomic office chair with lumbar support',
        status: 'Available'
    },
    {
        name: 'Business Shirt',
        category: 'Clothing',
        description: 'Professional cotton business shirt',
        status: 'Available'
    },
    {
        name: 'iPhone 14 Pro',
        category: 'Electronics',
        description: 'Latest iPhone with advanced camera system',
        status: 'Available'
    },
    {
        name: 'Standing Desk',
        category: 'Furniture',
        description: 'Adjustable height standing desk for better ergonomics',
        status: 'Available'
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI, { 
            useNewUrlParser: true, 
            useUnifiedTopology: true 
        });
        console.log('Connected to MongoDB');

        // Clear existing data
        await Product.deleteMany({});
        await Supplier.deleteMany({});
        console.log('Cleared existing data');

        // Create suppliers
        const suppliers = await Supplier.insertMany(sampleSuppliers);
        console.log('Created suppliers:', suppliers.length);

        // Create products
        const products = await Product.insertMany(sampleProducts);
        console.log('Created products:', products.length);

        // Create relationships with prices
        const relationships = [
            // Laptop Dell XPS 13
            { productIndex: 0, supplierIndex: 0, price: 1299.99 },
            { productIndex: 0, supplierIndex: 1, price: 1350.00 },
            
            // Office Chair Ergonomic
            { productIndex: 1, supplierIndex: 2, price: 199.99 },
            
            // Business Shirt
            { productIndex: 2, supplierIndex: 3, price: 49.99 },
            
            // iPhone 14 Pro
            { productIndex: 3, supplierIndex: 0, price: 999.99 },
            { productIndex: 3, supplierIndex: 1, price: 1020.00 },
            
            // Standing Desk
            { productIndex: 4, supplierIndex: 2, price: 399.99 }
        ];

        // Add relationships
        for (const rel of relationships) {
            const product = products[rel.productIndex];
            const supplier = suppliers[rel.supplierIndex];

            // Add supplier to product
            product.suppliers.push({
                supplier: supplier._id,
                price: rel.price
            });

            // Add product to supplier
            supplier.products.push({
                product: product._id,
                price: rel.price
            });

            await product.save();
            await supplier.save();
        }

        console.log('Created product-supplier relationships');
        console.log('Database seeded successfully!');

    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the seeding function if called directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
