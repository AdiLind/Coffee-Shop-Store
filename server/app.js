const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { handleError, handleNotFound, asyncWrapper, createError } = require('./modules/error-handler');
const { persistenceManager } = require('./modules/persist_module');

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
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

app.use(limiter);

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        ['https://yourdomain.com'] : 
        ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Coffee Shop Store API - Phase 1',
        version: '1.0.0',
        endpoints: {
            products: '/api/products',
            health: '/api/health'
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.get('/api/products', asyncWrapper(async (req, res) => {
    try {
        const { search, category } = req.query;
        let products;

        if (search) {
            products = await persistenceManager.searchProducts(search);
        } else if (category) {
            products = await persistenceManager.getProductsByCategory(category);
        } else {
            products = await persistenceManager.getAllProducts();
        }

        const inStockProducts = products.filter(product => product.inStock);

        res.json({
            success: true,
            data: {
                products: inStockProducts,
                total: inStockProducts.length,
                categories: ['machines', 'beans', 'accessories']
            },
            message: 'Products retrieved successfully'
        });
    } catch (error) {
        throw error;
    }
}));

app.get('/api/products/:id', asyncWrapper(async (req, res) => {
    try {
        const { id } = req.params;
        const product = await persistenceManager.getProductById(id);

        if (!product.inStock) {
            throw createError('Product is currently out of stock', 404, 'PRODUCT_OUT_OF_STOCK');
        }

        res.json({
            success: true,
            data: { product },
            message: 'Product retrieved successfully'
        });
    } catch (error) {
        throw error;
    }
}));

app.get('/api/categories', (req, res) => {
    res.json({
        success: true,
        data: {
            categories: [
                { id: 'machines', name: 'Coffee Machines', description: 'Professional and home coffee machines' },
                { id: 'beans', name: 'Coffee Beans', description: 'Premium coffee beans from around the world' },
                { id: 'accessories', name: 'Accessories', description: 'Coffee brewing accessories and tools' }
            ]
        },
        message: 'Categories retrieved successfully'
    });
});

app.post('/api/test-persistence', asyncWrapper(async (req, res) => {
    try {
        const products = await persistenceManager.getAllProducts();
        const users = await persistenceManager.getAllUsers();

        res.json({
            success: true,
            data: {
                productCount: products.length,
                userCount: users.length,
                sampleProduct: products[0] || null,
                sampleUser: users[0] ? { id: users[0].id, username: users[0].username, role: users[0].role } : null
            },
            message: 'Persistence layer test completed successfully'
        });
    } catch (error) {
        throw error;
    }
}));

app.get('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'ENDPOINT_NOT_FOUND',
        message: `API endpoint ${req.originalUrl} not found`,
        availableEndpoints: [
            'GET /api/health',
            'GET /api/products',
            'GET /api/products/:id',
            'GET /api/categories',
            'POST /api/test-persistence'
        ],
        statusCode: 404
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use(handleNotFound);
app.use(handleError);

async function startServer() {
    try {
        await persistenceManager.initializeDataFiles();
        console.log('✅ Data files initialized successfully');

        app.listen(PORT, () => {
            console.log('\n🚀 Coffee Shop Store Server Started!');
            console.log(`📍 Server running on: http://localhost:${PORT}`);
            console.log(`📁 Serving static files from: ${path.join(__dirname, '../public')}`);
            console.log(`📊 API endpoints available at: http://localhost:${PORT}/api`);
            console.log(`🛡️  Security middleware active (Helmet, CORS, Rate Limiting)`);
            console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
            
            console.log('Available API Endpoints:');
            console.log('  GET  /                     - API Info');
            console.log('  GET  /api/health           - Health Check');
            console.log('  GET  /api/products         - Get all products');
            console.log('  GET  /api/products/:id     - Get product by ID');
            console.log('  GET  /api/categories       - Get all categories');
            console.log('  POST /api/test-persistence - Test data layer');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

process.on('SIGTERM', () => {
    console.log('\n📴 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n📴 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };