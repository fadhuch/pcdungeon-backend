const express = require('express');
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import routes
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const componentRoutes = require('./routes/componentRoutes');
const compatibilityRoutes = require('./routes/compatibilityRoutes');
const userBuildRoutes = require('./routes/userBuildRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes = require('./routes/userRoutes');
const preBuildPcRoutes = require('./routes/preBuildPcRoutes');

const app = express();
const PORT = process.env.PORT || 4567;

// Middleware
// CORS configuration
const corsOptions = {
    origin: '*',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from images directory
app.use('/images', express.static('images'));

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://fahad:Fahad%40123@cluster0.tri5xk7.mongodb.net/alshiraa';
console.log('Connecting to MongoDB...');
console.log('Environment:', process.env.NODE_ENV || 'development');

mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
        // Initialize default settings
        const Settings = require('./models/settings');
        Settings.initializeDefaults();
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        console.error('Connection string:', MONGO_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in logs
        process.exit(1);
    });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/compatibility', compatibilityRoutes);
app.use('/api/builds', userBuildRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prebuild-pcs', preBuildPcRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err.stack);
    console.error('Request URL:', req.url);
    console.error('Request Method:', req.method);
    console.error('Request Headers:', req.headers);
    console.error('Request Body:', req.body);
    
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { error: err.message, stack: err.stack })
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});