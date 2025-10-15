const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
require('dd-trace').init();


const app = express();

// Import routes (we'll create these next)
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');
const userRoutes = require('./routes/users');

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development, enable in production
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'your-production-domain.com' : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (your HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// MongoDB connection
let mongoConnected = false;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-tracker', {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
})
.then(() => {
    console.log('✅ Connected to MongoDB successfully');
    mongoConnected = true;
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Running without database connection. API endpoints will not work.');
    console.log('💡 To fix: Install and start MongoDB, or use MongoDB Atlas cloud database');
    mongoConnected = false;
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/users', userRoutes);

// API health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'TrackShip India API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Serve your HTML files for different routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/track', (req, res) => {
    res.sendFile(path.join(__dirname, 'track.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'profile.html'));
});

app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'services.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact.html'));
});

app.get('/sign-up', (req, res) => {
    res.sendFile(path.join(__dirname, 'sign-up.html'));
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        message: `The requested endpoint ${req.originalUrl} does not exist`
    });
});

// Handle all other routes by serving index.html (for client-side routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: error.message,
            details: error.errors
        });
    }
    
    if (error.name === 'CastError') {
        return res.status(400).json({
            error: 'Invalid ID format',
            message: 'The provided ID is not valid'
        });
    }
    
    if (error.code === 11000) {
        return res.status(400).json({
            error: 'Duplicate Entry',
            message: 'This record already exists'
        });
    }
    
    res.status(error.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 TrackShip India server is running on port ${PORT}`);
    console.log(`🌐 Access your application at: http://localhost:${PORT}`);
    console.log(`📊 API Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
