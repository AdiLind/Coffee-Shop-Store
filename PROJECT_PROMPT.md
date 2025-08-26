# Claude Code Prompt: Coffee Shop Online Store - Phase 1 Implementation

## 🎯 Project Overview
Create a **full-stack coffee shop online store** using Node.js/Express backend and vanilla HTML/CSS/JavaScript frontend. This is a RUNI 2025 academic project that must demonstrate modern web development practices with proper separation of concerns.

---

## 📁 1. Complete Project File Structure & TODO List

Create the following **exact** file structure and implement each file step by step:

```
coffee-shop-store/
├── 📂 server/
│   ├── app.js                          ✅ Main Express server
│   ├── 📂 modules/
│   │   ├── persist_module.js           ✅ Data persistence (JSON files)
│   │   ├── auth-server.js              🔄 Authentication logic
│   │   ├── store-server.js             🔄 Store/products logic  
│   │   ├── cart-server.js              🔄 Shopping cart logic
│   │   ├── admin-server.js             🔄 Admin panel logic
│   │   ├── checkout-server.js          🔄 Payment processing
│   │   └── error-handler.js            ✅ Centralized error handling
│   ├── 📂 routes/
│   │   ├── api.js                      🔄 Main API router
│   │   ├── auth.js                     🔄 Auth routes (/api/auth/*)
│   │   ├── products.js                 🔄 Product routes (/api/products/*)
│   │   ├── cart.js                     🔄 Cart routes (/api/cart/*)
│   │   ├── orders.js                   🔄 Order routes (/api/orders/*)
│   │   └── admin.js                    🔄 Admin routes (/api/admin/*)
│   ├── 📂 middleware/
│   │   ├── auth-middleware.js          🔄 JWT/Session validation
│   │   ├── rate-limiter.js             🔄 DOS protection
│   │   └── validation.js               🔄 Input validation
│   └── 📂 data/ (JSON file storage)
│       ├── users.json                  ✅ User accounts & profiles
│       ├── products.json               ✅ Coffee shop inventory
│       ├── orders.json                 🔄 Purchase history
│       ├── carts.json                  🔄 User shopping carts
│       └── activity.json               🔄 User activity logs
├── 📂 public/
│   ├── index.html                      🔄 Landing page (redirect to store)
│   ├── 📂 pages/
│   │   ├── login.html                  🔄 User authentication
│   │   ├── register.html               🔄 User registration
│   │   ├── store.html                  🔄 Main product catalog
│   │   ├── cart.html                   🔄 Shopping cart management
│   │   ├── checkout.html               🔄 Payment processing
│   │   ├── my-orders.html              🔄 Order history
│   │   ├── admin.html                  🔄 Admin dashboard
│   │   ├── readme.html                 🔄 Project documentation
│   │   └── llm.html                    🔄 AI-generated code disclosure
│   ├── 📂 css/
│   │   ├── style.css                   🔄 Main stylesheet
│   │   ├── components.css              🔄 Reusable components
│   │   └── themes.css                  🔄 Dark/light mode support
│   ├── 📂 js/
│   │   ├── main.js                     🔄 Core frontend logic
│   │   ├── api.js                      🔄 API communication layer
│   │   ├── auth.js                     🔄 Frontend authentication
│   │   ├── store.js                    🔄 Product catalog logic
│   │   ├── cart.js                     🔄 Cart management
│   │   └── utils.js                    🔄 Helper functions
│   └── 📂 images/
│       ├── 📂 products/                🔄 Product images
│       └── 📂 icons/                   🔄 UI icons
├── 📂 tests/
│   ├── test.js                         🔄 Main server testing
│   ├── api-tests.js                    🔄 API endpoint testing
│   └── test-utils.js                   🔄 Testing utilities
├── package.json                        ✅ Dependencies & scripts
├── .gitignore                          ✅ Git ignore rules
├── README.md                           🔄 Project documentation  
└── API_DOCUMENTATION.md                🔄 REST API documentation

Legend: ✅ = Phase 1, 🔄 = Future phases
```

---

## 🚀 2. Main Project Implementation Guidelines

### **Code Style & Standards:**
```javascript
// Use ES6+ features consistently
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Async/await for ALL async operations (required!)
async function getAllProducts() {
    try {
        const products = await persistenceManager.getProducts();
        return products.filter(p => p.inStock);
    } catch (error) {
        throw new Error(`Failed to fetch products: ${error.message}`);
    }
}

// Consistent error handling
const asyncWrapper = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Modular design - each feature in separate module
module.exports = {
    getAllProducts,
    getProductById,
    searchProducts
};
```

### **Required NPM Dependencies:**
```json
{
    "dependencies": {
        "express": "^4.18.2",
        "cookie-parser": "^1.4.6",
        "cors": "^2.8.5",
        "helmet": "^7.1.0",
        "express-rate-limit": "^7.1.5",
        "bcrypt": "^5.1.1",
        "uuid": "^9.0.1",
        "node-fetch": "^3.3.2",
        "multer": "^1.4.5",
        "joi": "^17.11.0"
    },
    "devDependencies": {
        "nodemon": "^3.0.1"
    }
}
```

### **Project Architecture Principles:**
1. **Separation of Concerns**: Routes → Controllers → Services → Data Layer
2. **Error-First Approach**: Handle all errors gracefully with proper HTTP status codes
3. **RESTful Design**: Follow REST conventions for all API endpoints
4. **Security First**: Implement rate limiting, input validation, and secure headers
5. **Async-First**: Use async/await for all I/O operations

---

## 🔄 3. Frontend-Backend Separation & API Design

### **REST API Structure:**
```javascript
// Authentication Endpoints
POST   /api/auth/register          // User registration
POST   /api/auth/login             // User login  
POST   /api/auth/logout            // User logout
GET    /api/auth/profile           // Get current user profile

// Product Endpoints
GET    /api/products               // Get all products (with search)
GET    /api/products/:id           // Get single product
POST   /api/products               // Create product (admin only)
PUT    /api/products/:id           // Update product (admin only)
DELETE /api/products/:id           // Delete product (admin only)

// Shopping Cart Endpoints  
GET    /api/cart                   // Get user's cart
POST   /api/cart/add              // Add item to cart
PUT    /api/cart/update           // Update cart item quantity
DELETE /api/cart/remove/:id       // Remove item from cart
DELETE /api/cart/clear            // Clear entire cart

// Order Endpoints
GET    /api/orders                 // Get user's orders
POST   /api/orders                 // Create new order (checkout)
GET    /api/orders/:id             // Get specific order

// Admin Endpoints
GET    /api/admin/users            // Get all users
GET    /api/admin/activity         // Get user activity logs
POST   /api/admin/activity/filter  // Filter activity by username
GET    /api/admin/stats            // Get store statistics
```

### **API Response Format:**
```javascript
// Success Response
{
    "success": true,
    "data": { /* response data */ },
    "message": "Operation completed successfully"
}

// Error Response  
{
    "success": false,
    "error": "Error type",
    "message": "Human readable error message",
    "statusCode": 400
}
```

### **Frontend API Communication:**
```javascript
// Frontend API utility (public/js/api.js)
class APIClient {
    constructor(baseURL = '/api') {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            return await response.json();
        } catch (error) {
            throw new Error(`API request failed: ${error.message}`);
        }
    }

    // Specific methods for each endpoint
    async getProducts(search = '') {
        return this.request(`/products?search=${search}`);
    }
    
    async addToCart(productId, quantity = 1) {
        return this.request('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity })
        });
    }
}
```

### **No Need for Swagger/FastAPI** (Keep It Simple):
- Create `API_DOCUMENTATION.md` with clear endpoint documentation
- Use consistent REST patterns
- Include example requests/responses in documentation
- Focus on functionality over complex API documentation tools

---

## 💾 4. Data Storage Strategy (File-Based JSON)

### **Why JSON Files (Not Database):**
- **Project Requirement**: "Data must be kept in file in the file system"
- **Educational Focus**: Learn file I/O and data management fundamentals
- **Simplicity**: No database setup complexity
- **Portability**: Easy to inspect and debug data

### **Data Storage Architecture:**
```javascript
// server/modules/persist_module.js
class PersistenceManager {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.files = {
            users: 'users.json',           // User accounts & preferences
            products: 'products.json',     // Coffee shop inventory  
            carts: 'carts.json',          // Active shopping carts
            orders: 'orders.json',        // Completed purchases
            activity: 'activity.json'     // User activity logging
        };
    }

    // Generic CRUD operations
    async readData(filename) { /* Implementation */ }
    async writeData(filename, data) { /* Implementation */ }
    async appendData(filename, newItem) { /* Implementation */ }
    
    // Atomic operations for data consistency
    async updateUserCart(userId, cartData) {
        const carts = await this.readData('carts');
        const cartIndex = carts.findIndex(cart => cart.userId === userId);
        
        if (cartIndex >= 0) {
            carts[cartIndex] = { ...carts[cartIndex], ...cartData };
        } else {
            carts.push({ userId, ...cartData, createdAt: new Date().toISOString() });
        }
        
        return await this.writeData('carts', carts);
    }
}
```

### **Data Models:**
```javascript
// User Model
{
    "id": "uuid-v4",
    "username": "string",
    "email": "string", 
    "password": "bcrypt-hashed",
    "role": "user|admin",
    "preferences": {
        "theme": "light|dark",
        "language": "en"
    },
    "createdAt": "ISO-date",
    "lastLogin": "ISO-date"
}

// Product Model
{
    "id": "uuid-v4", 
    "title": "string",
    "description": "string",
    "price": "number",
    "category": "machines|beans|accessories",
    "image": "string (URL or path)",
    "inStock": "boolean",
    "createdAt": "ISO-date"
}

// Cart Model
{
    "userId": "uuid-v4",
    "items": [
        {
            "productId": "uuid-v4",
            "quantity": "number",
            "price": "number",
            "addedAt": "ISO-date"
        }
    ],
    "updatedAt": "ISO-date"
}

// Order Model
{
    "id": "uuid-v4",
    "userId": "uuid-v4", 
    "items": [/* cart items structure */],
    "totalAmount": "number",
    "status": "pending|completed|cancelled",
    "paymentDetails": {
        "method": "fake-payment",
        "transactionId": "uuid-v4"
    },
    "createdAt": "ISO-date"
}
```

---

## 🎯 Phase 1 Implementation Order

### **Step 1: Basic Server Setup**
```bash
# Initialize project and install dependencies
npm init -y
npm install express cookie-parser cors helmet express-rate-limit bcrypt uuid multer joi
npm install --save-dev nodemon
```

### **Step 2: Core Files (Implement in this order)**
1. `server/modules/error-handler.js` - Centralized error handling
2. `server/modules/persist_module.js` - Data persistence layer
3. `server/app.js` - Main Express server
4. `server/routes/api.js` - Basic API routing
5. `package.json` - Proper scripts and metadata

### **Step 3: Data Initialization**
```javascript
// Create sample data files
const sampleProducts = [
    {
        id: uuidv4(),
        title: "Professional Espresso Machine",
        description: "Italian-made espresso machine for perfect coffee brewing",
        price: 299.99,
        category: "machines", 
        image: "/images/products/espresso-machine.jpg",
        inStock: true,
        createdAt: new Date().toISOString()
    },
    // ... more coffee products
];
```

### **Step 4: Basic Testing**
```javascript
// test.js - Basic server testing
const fetch = require('node-fetch');

async function testServer() {
    try {
        const response = await fetch('http://localhost:3000/api/products');
        const data = await response.json();
        console.log('✅ Products API working:', data.success);
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}
```

---

## 🔒 Security & Requirements Checklist

- [ ] **Rate limiting** for DOS protection
- [ ] **Input validation** using Joi
- [ ] **Secure headers** using Helmet
- [ ] **Password hashing** using bcrypt  
- [ ] **Error handling** for all async operations
- [ ] **Cookie management** for sessions
- [ ] **File system persistence** as required
- [ ] **Modular architecture** as specified
- [ ] **Async/await** for all I/O operations
- [ ] **Proper HTTP methods** for each endpoint

---

## 🚀 Implementation Command

**Claude Code, implement Phase 1 with these exact requirements:**

1. Create the folder structure exactly as specified above
2. Implement the core files (app.js, persist_module.js, error-handler.js)
3. Set up the REST API foundation with proper error handling
4. Initialize sample coffee shop data (machines, beans, accessories)
5. Create basic testing infrastructure
6. Follow the coding standards and async/await patterns shown
7. Focus on file-based JSON storage as required by project specs
8. Ensure the server starts successfully and responds to basic API calls

**Priority**: Get a working foundation that other team members can build upon. Focus on reliability over features in Phase 1.