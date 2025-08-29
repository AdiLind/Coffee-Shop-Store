# Phase 2: Core Infrastructure - Implementation Prompt

## 🎯 **Project Status: Phase 1 ✅ COMPLETED**
- ✅ Basic Express server running
- ✅ Project folder structure created
- ✅ persist_module.js skeleton implemented
- ✅ Error handling system in place
- ✅ Sample coffee shop data initialized

## 🏗️ **Phase 2 Goal: Build Web Application Infrastructure**

Transform the basic server into a functional web application with routing, HTML templates, and complete data persistence. This phase prepares us for Phase 3 (Authentication).

---

## 📋 **Phase 2 Implementation Tasks**

### **Task 1: Complete Routing Architecture**
Create a comprehensive routing system that will support all future features:

```javascript
// server/routes/api.js - Main API router
const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const productRoutes = require('./products');
const cartRoutes = require('./cart');
const orderRoutes = require('./orders');
const adminRoutes = require('./admin');

// Mount route modules
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);

// API health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Coffee Shop API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router;
```

**Required Route Files to Create:**
- `server/routes/api.js` (main router)
- `server/routes/products.js` (product management)
- `server/routes/auth.js` (authentication - basic structure)
- `server/routes/cart.js` (cart management - basic structure)
- `server/routes/orders.js` (order handling - basic structure)
- `server/routes/admin.js` (admin features - basic structure)

### **Task 2: Expand persist_module.js with Complete CRUD Operations**

Enhance the persistence module with all necessary methods:

```javascript
// server/modules/persist_module.js - Enhanced version
class PersistenceManager {
    // ... existing constructor and basic methods ...

    // Enhanced product management
    async addProduct(product) {
        const products = await this.getProducts();
        const newProduct = {
            id: require('uuid').v4(),
            ...product,
            createdAt: new Date().toISOString(),
            inStock: true
        };
        products.push(newProduct);
        await this.saveProducts(products);
        return newProduct;
    }

    async updateProduct(productId, updates) {
        const products = await this.getProducts();
        const productIndex = products.findIndex(p => p.id === productId);
        if (productIndex === -1) {
            throw new Error('Product not found');
        }
        products[productIndex] = { ...products[productIndex], ...updates };
        await this.saveProducts(products);
        return products[productIndex];
    }

    async deleteProduct(productId) {
        const products = await this.getProducts();
        const filteredProducts = products.filter(p => p.id !== productId);
        if (products.length === filteredProducts.length) {
            throw new Error('Product not found');
        }
        await this.saveProducts(filteredProducts);
        return true;
    }

    async searchProducts(searchTerm) {
        const products = await this.getProducts();
        return products.filter(product => 
            product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Cart management methods
    async getUserCart(userId) {
        const carts = await this.readData('carts');
        return carts.find(cart => cart.userId === userId) || { userId, items: [] };
    }

    async updateUserCart(userId, cartData) {
        const carts = await this.readData('carts');
        const cartIndex = carts.findIndex(cart => cart.userId === userId);
        
        if (cartIndex >= 0) {
            carts[cartIndex] = { ...carts[cartIndex], ...cartData, updatedAt: new Date().toISOString() };
        } else {
            carts.push({ 
                userId, 
                ...cartData, 
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        await this.writeData('carts', carts);
        return carts.find(cart => cart.userId === userId);
    }

    // Order management methods
    async createOrder(orderData) {
        const orders = await this.getOrders();
        const newOrder = {
            id: require('uuid').v4(),
            ...orderData,
            status: 'completed',
            createdAt: new Date().toISOString()
        };
        orders.push(newOrder);
        await this.writeData('orders', orders);
        return newOrder;
    }

    async getUserOrders(userId) {
        const orders = await this.getOrders();
        return orders.filter(order => order.userId === userId);
    }

    // Enhanced sample data creation
    async createSampleData() {
        console.log('🔧 Creating comprehensive coffee shop sample data...');
        
        // Enhanced coffee products
        const sampleProducts = [
            // Coffee Machines
            {
                id: 'espresso-machine-pro',
                title: 'Professional Espresso Machine',
                description: 'Italian-made espresso machine with dual boiler system for perfect coffee extraction',
                price: 299.99,
                category: 'machines',
                image: '/images/products/espresso-machine-pro.jpg',
                inStock: true
            },
            {
                id: 'drip-coffee-maker',
                title: 'Premium Drip Coffee Maker',
                description: 'Programmable coffee maker with thermal carafe, perfect for office or home',
                price: 89.99,
                category: 'machines',
                image: '/images/products/drip-coffee-maker.jpg',
                inStock: true
            },
            {
                id: 'french-press-deluxe',
                title: 'French Press Deluxe',
                description: 'Borosilicate glass French press with steel frame for rich, full-bodied coffee',
                price: 34.99,
                category: 'machines',
                image: '/images/products/french-press.jpg',
                inStock: true
            },
            
            // Coffee Beans
            {
                id: 'arabica-colombian',
                title: 'Colombian Arabica Coffee Beans',
                description: 'Single-origin Colombian coffee beans, medium roast with chocolate notes',
                price: 24.99,
                category: 'beans',
                image: '/images/products/colombian-beans.jpg',
                inStock: true
            },
            {
                id: 'ethiopian-yirgacheffe',
                title: 'Ethiopian Yirgacheffe',
                description: 'Light roast Ethiopian beans with bright acidity and floral aroma',
                price: 28.99,
                category: 'beans',
                image: '/images/products/ethiopian-beans.jpg',
                inStock: true
            },
            {
                id: 'espresso-blend',
                title: 'House Espresso Blend',
                description: 'Dark roast espresso blend perfect for lattes and cappuccinos',
                price: 22.99,
                category: 'beans',
                image: '/images/products/espresso-blend.jpg',
                inStock: true
            },
            
            // Accessories
            {
                id: 'ceramic-coffee-cup',
                title: 'Artisan Ceramic Coffee Cup',
                description: 'Handcrafted ceramic cup with ergonomic handle, perfect for morning coffee',
                price: 15.99,
                category: 'accessories',
                image: '/images/products/ceramic-cup.jpg',
                inStock: true
            },
            {
                id: 'milk-frother',
                title: 'Electric Milk Frother',
                description: 'Stainless steel milk frother for perfect cappuccino and latte foam',
                price: 45.99,
                category: 'accessories',
                image: '/images/products/milk-frother.jpg',
                inStock: true
            },
            {
                id: 'coffee-grinder',
                title: 'Burr Coffee Grinder',
                description: 'Conical burr grinder with 15 grind settings for consistent results',
                price: 79.99,
                category: 'accessories',
                image: '/images/products/coffee-grinder.jpg',
                inStock: true
            }
        ];

        const products = await this.getProducts();
        if (products.length === 0) {
            await this.saveProducts(sampleProducts);
            console.log(`✅ Created ${sampleProducts.length} coffee products`);
        }

        console.log('✅ Sample data initialization complete!');
    }
}
```

### **Task 3: Create Basic HTML Templates**

Build clean, responsive HTML templates for all main pages:

**File: `public/index.html`** (Landing page)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>☕ Coffee Shop - Premium Coffee & Equipment</title>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/components.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>☕ Welcome to Our Coffee Shop</h1>
            <p>Premium coffee machines, beans, and accessories</p>
        </header>
        <main class="main">
            <div class="hero-section">
                <h2>Discover Perfect Coffee</h2>
                <a href="/pages/store.html" class="btn btn-primary">Shop Now</a>
                <a href="/pages/login.html" class="btn btn-secondary">Login</a>
            </div>
        </main>
    </div>
    <script>
        // Auto-redirect to store after 3 seconds
        setTimeout(() => {
            window.location.href = '/pages/store.html';
        }, 3000);
    </script>
</body>
</html>
```

**Files to Create:**
- `public/index.html` (landing page)
- `public/pages/store.html` (main store template - no functionality yet)
- `public/pages/login.html` (login form template - no functionality yet)
- `public/pages/register.html` (registration template - no functionality yet)
- `public/pages/cart.html` (cart template - no functionality yet)
- `public/pages/admin.html` (admin template - no functionality yet)

**Important Note:** These are just **visual templates** in Phase 2. No JavaScript functionality yet - that comes in Phase 3+.

### **Task 4: Set Up Static File Serving & CSS**

Create a responsive CSS framework for the coffee shop:

**File: `public/css/style.css`**
```css
/* Coffee Shop - Main Stylesheet */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --coffee-brown: #4A2C24;
    --coffee-light: #8B6F47;
    --cream: #F5E6D3;
    --dark-roast: #2C1810;
    --espresso: #3C251E;
    --accent: #D4A574;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: var(--dark-roast);
    background-color: var(--cream);
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header Styles */
.header {
    background: var(--coffee-brown);
    color: var(--cream);
    padding: 2rem 0;
    text-align: center;
}

.header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
}

/* Navigation */
.navbar {
    background: var(--espresso);
    padding: 1rem 0;
}

.nav-menu {
    display: flex;
    justify-content: space-between;
    align-items: center;
    list-style: none;
}

.nav-item a {
    color: var(--cream);
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.3s;
}

.nav-item a:hover {
    background-color: var(--coffee-light);
}

/* Button Styles */
.btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    text-decoration: none;
    border-radius: 5px;
    font-weight: bold;
    transition: all 0.3s;
    cursor: pointer;
    border: none;
    font-size: 1rem;
    margin: 0.5rem;
}

.btn-primary {
    background-color: var(--coffee-brown);
    color: var(--cream);
}

.btn-primary:hover {
    background-color: var(--espresso);
}

.btn-secondary {
    background-color: var(--accent);
    color: var(--dark-roast);
}

.btn-secondary:hover {
    background-color: var(--coffee-light);
    color: var(--cream);
}

/* Form Styles */
.form-container {
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
    color: var(--dark-roast);
}

.form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 5px;
    font-size: 1rem;
}

.form-group input:focus {
    outline: none;
    border-color: var(--coffee-brown);
}

/* Responsive Design */
@media (max-width: 768px) {
    .container {
        padding: 0 15px;
    }
    
    .header h1 {
        font-size: 2rem;
    }
    
    .nav-menu {
        flex-direction: column;
        gap: 0.5rem;
    }
}
```

### **Task 5: Create Product API Endpoints**

Implement the products route with full CRUD operations:

**File: `server/routes/products.js`**
```javascript
const express = require('express');
const router = express.Router();
const persistenceManager = require('../modules/persist_module');
const ErrorHandler = require('../modules/error-handler');

// GET /api/products - Get all products (with optional search)
router.get('/', ErrorHandler.asyncWrapper(async (req, res) => {
    const { search, category } = req.query;
    
    let products = await persistenceManager.getProducts();
    
    if (search) {
        products = await persistenceManager.searchProducts(search);
    }
    
    if (category) {
        products = products.filter(product => product.category === category);
    }
    
    res.json({
        success: true,
        data: products,
        message: `Found ${products.length} products`
    });
}));

// GET /api/products/:id - Get single product
router.get('/:id', ErrorHandler.asyncWrapper(async (req, res) => {
    const products = await persistenceManager.getProducts();
    const product = products.find(p => p.id === req.params.id);
    
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }
    
    res.json({
        success: true,
        data: product
    });
}));

// POST /api/products - Add new product (admin only - for now just basic)
router.post('/', ErrorHandler.asyncWrapper(async (req, res) => {
    const { title, description, price, category, image } = req.body;
    
    if (!title || !description || !price || !category) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: title, description, price, category'
        });
    }
    
    const newProduct = await persistenceManager.addProduct({
        title,
        description,
        price: parseFloat(price),
        category,
        image: image || '/images/products/default.jpg'
    });
    
    res.status(201).json({
        success: true,
        data: newProduct,
        message: 'Product created successfully'
    });
}));

module.exports = router;
```

### **Task 6: Update Main App.js**

Integrate all the routing and static file serving:

```javascript
// server/app.js - Updated version
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

// Import modules
const ErrorHandler = require('./modules/error-handler');
const persistenceManager = require('./modules/persist_module');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow inline scripts for development
}));
app.use(cors());

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static file serving
app.use(express.static(path.join(__dirname, '../public')));

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
app.use(ErrorHandler.handle);

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
});

module.exports = app;
```

### **Task 7: Create Basic Testing**

Build comprehensive API testing:

**File: `test.js`** (Updated)
```javascript
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

class APITester {
    async runTests() {
        console.log('🧪 Starting Coffee Shop API Tests...\n');
        
        const tests = [
            this.testServerHealth,
            this.testGetProducts,
            this.testSearchProducts,
            this.testGetSingleProduct,
            this.testAddProduct,
            this.testStaticFileServing
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            try {
                await test.call(this);
                console.log('✅ PASSED');
                passed++;
            } catch (error) {
                console.log('❌ FAILED:', error.message);
                failed++;
            }
            console.log(''); // Empty line between tests
        }
        
        console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
        return { passed, failed };
    }
    
    async testServerHealth() {
        console.log('Testing API health endpoint...');
        const response = await fetch(`${BASE_URL}/api/health`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error('Health check failed');
        }
    }
    
    async testGetProducts() {
        console.log('Testing get all products...');
        const response = await fetch(`${BASE_URL}/api/products`);
        const data = await response.json();
        
        if (!response.ok || !data.success || !Array.isArray(data.data)) {
            throw new Error('Products endpoint failed');
        }
        
        console.log(`   Found ${data.data.length} products`);
    }
    
    async testSearchProducts() {
        console.log('Testing product search...');
        const response = await fetch(`${BASE_URL}/api/products?search=coffee`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error('Search endpoint failed');
        }
        
        console.log(`   Search returned ${data.data.length} results`);
    }
    
    async testGetSingleProduct() {
        console.log('Testing get single product...');
        
        // First get all products to find a valid ID
        const productsResponse = await fetch(`${BASE_URL}/api/products`);
        const productsData = await productsResponse.json();
        
        if (productsData.data.length === 0) {
            throw new Error('No products found for single product test');
        }
        
        const productId = productsData.data[0].id;
        const response = await fetch(`${BASE_URL}/api/products/${productId}`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error('Single product endpoint failed');
        }
        
        console.log(`   Retrieved product: ${data.data.title}`);
    }
    
    async testAddProduct() {
        console.log('Testing add new product...');
        const newProduct = {
            title: 'Test Coffee Mug',
            description: 'A test mug for automated testing',
            price: 9.99,
            category: 'accessories'
        };
        
        const response = await fetch(`${BASE_URL}/api/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newProduct)
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error('Add product endpoint failed');
        }
        
        console.log(`   Created product: ${data.data.title}`);
    }
    
    async testStaticFileServing() {
        console.log('Testing static file serving...');
        const response = await fetch(`${BASE_URL}/`);
        
        if (!response.ok) {
            throw new Error('Static file serving failed');
        }
        
        console.log('   Static files serving correctly');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new APITester();
    tester.runTests().then(results => {
        process.exit(results.failed > 0 ? 1 : 0);
    });
}

module.exports = APITester;
```

---

## 🎯 **Phase 2 Success Criteria**

After Phase 2 completion, you should have:

- ✅ **Complete routing system** with all API endpoints structured
- ✅ **Enhanced persistence module** with full CRUD operations
- ✅ **Basic HTML templates** for all main pages (visual only)
- ✅ **Responsive CSS framework** with coffee shop theme
- ✅ **Working API endpoints** for products management
- ✅ **Comprehensive testing** covering all new functionality
- ✅ **Static file serving** for CSS, images, and HTML pages
- ✅ **Enhanced sample data** with 9+ coffee products

---

## 🚀 **Implementation Command for Claude Code**

**"I've completed Phase 1 successfully. Now implement Phase 2: Core Infrastructure exactly as specified above.**

**Focus on:**
1. Setting up the complete routing architecture with all route files
2. Enhancing the persist_module.js with full CRUD operations and sample data
3. Creating all basic HTML templates (visual only, no JavaScript functionality yet)
4. Building the responsive CSS framework with coffee shop theming
5. Implementing the products API endpoints with full functionality
6. Updating app.js to integrate everything properly
7. Creating comprehensive API testing

**After each major component, test it to ensure everything works. The server should serve both API endpoints and static HTML pages successfully.**

**Priority: Build a solid foundation that's ready for Phase 3 (Authentication) implementation."**

---

## 🔄 **Next Phase Preview**

After Phase 2, you'll be ready for **Phase 3: Authentication System** which will add:
- User registration and login functionality
- Cookie-based session management
- Protected routes and middleware
- Frontend JavaScript for authentication

**Ready to implement Phase 2?** 🚀