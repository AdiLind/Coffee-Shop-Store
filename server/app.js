const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { handleError, handleNotFound } = require('./modules/error-handler');
const { persistenceManager } = require('./modules/persist_module');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
        statusCode: 429
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow inline scripts for development
}));
app.use(cors());
app.use(limiter);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static file serving
app.use(express.static(path.join(__dirname, '../public')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

// API routes
app.use('/api', apiRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.redirect('/pages/store.html');
});

// Initialize data on startup
async function initializeServer() {
    try {
        await persistenceManager.initializeData();
        await persistenceManager.createSampleData();
        console.log('✅ Coffee shop data initialized');
    } catch (error) {
        console.error('❌ Failed to initialize data:', error);
    }
}

// Error handling middleware
app.use(handleError);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Route ${req.path} not found`,
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'GET /api/products',
            'GET /api/products/:id',
            'POST /api/products'
        ]
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`☕ Coffee Shop Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, '../public')}`);
    console.log(`🌐 API available at: http://localhost:${PORT}/api`);
    console.log(`🏪 Visit the store: http://localhost:${PORT}/pages/store.html`);
    
    // Initialize data
    await initializeServer();
    
    console.log('\n🚀 Server ready! Available endpoints:');
    console.log('   GET  /api/health');
    console.log('   GET  /api/products');
    console.log('   GET  /api/products/:id');
    console.log('   POST /api/products');
    console.log('   GET  /api/cart/:userId');
    console.log('   POST /api/cart/:userId');
    console.log('   GET  /api/orders/:userId');
    console.log('   POST /api/orders');
    console.log('   GET  /api/admin/stats');
});

module.exports = app;