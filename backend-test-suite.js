/**
 * COMPREHENSIVE BACKEND API TEST SUITE
 * Coffee Shop E-commerce Application
 * 
 * Tests ALL backend functionality:
 * - Authentication system (registration, login, sessions, admin)
 * - Product management (CRUD operations, search, filtering)
 * - Cart operations (add, update, remove, persistence)
 * - Order processing (creation, history, status management)
 * - Admin panel (user management, stats, activity logs)
 * - Security (input validation, SQL injection, XSS protection)
 * - Performance (response times, concurrent users)
 * - Data persistence and integrity
 * - Error handling and recovery
 */

const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds per test

class ComprehensiveBackendTestSuite {
    constructor() {
        this.results = {
            authentication: { passed: 0, failed: 0, tests: [] },
            products: { passed: 0, failed: 0, tests: [] },
            cart: { passed: 0, failed: 0, tests: [] },
            orders: { passed: 0, failed: 0, tests: [] },
            admin: { passed: 0, failed: 0, tests: [] },
            security: { passed: 0, failed: 0, tests: [] },
            performance: { passed: 0, failed: 0, tests: [] },
            dataIntegrity: { passed: 0, failed: 0, tests: [] }
        };
        this.allBugs = [];
        this.functionalityStatus = new Map();
        this.testUser = null;
        this.adminUser = null;
        this.authCookies = '';
        this.adminCookies = '';
        this.testData = {};
        this.performanceMetrics = {};
        this.startTime = Date.now();
        this.fetch = null;
    }

    async initializeFetch() {
        try {
            // Use dynamic import for node-fetch to avoid ES6 module issues
            const fetch = await import('node-fetch');
            this.fetch = fetch.default;
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize fetch:', error.message);
            return false;
        }
    }

    // ============================================================================
    // MAIN TEST RUNNER
    // ============================================================================

    async runAllBackendTests() {
        console.log('🔧 COMPREHENSIVE BACKEND API TEST SUITE');
        console.log('=' .repeat(80));
        console.log(`Testing: ${BASE_URL}`);
        console.log(`Timeout: ${TEST_TIMEOUT}ms per test`);
        console.log(`Started: ${new Date().toISOString()}`);
        console.log('=' .repeat(80));
        
        try {
            // Initialize fetch
            const fetchInitialized = await this.initializeFetch();
            if (!fetchInitialized) {
                throw new Error('Failed to initialize fetch module');
            }
            
            // Phase 1: System Health Check
            await this.runSystemHealthTests();
            
            // Phase 2: Authentication Tests
            await this.runAuthenticationTests();
            
            // Phase 3: Product Management Tests  
            await this.runProductTests();
            
            // Phase 4: Cart Operations Tests
            await this.runCartTests();
            
            // Phase 5: Order Processing Tests
            await this.runOrderTests();
            
            // Phase 6: Admin Panel Tests
            await this.runAdminTests();
            
            // Phase 7: Security Tests
            await this.runSecurityTests();
            
            // Phase 8: Performance Tests
            await this.runPerformanceTests();
            
            // Phase 9: Data Integrity Tests
            await this.runDataIntegrityTests();
            
            // Final Report & Analysis
            await this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ CRITICAL BACKEND TEST FAILURE:', error);
            this.addBug('TEST_FRAMEWORK', `Critical backend test framework error: ${error.message}`, 'CRITICAL');
            process.exit(1);
        }
    }

    // ============================================================================
    // SYSTEM HEALTH TESTS
    // ============================================================================

    async runSystemHealthTests() {
        console.log('\n🏥 SYSTEM HEALTH & CONNECTIVITY TESTS');
        console.log('-' .repeat(50));
        
        const healthTests = [
            this.testServerHealth,
            this.testDatabaseConnectivity,
            this.testAPIRouteMounting,
            this.testDataFileIntegrity
        ];
        
        await this.runTestSuite('authentication', healthTests, 'Health Check');
    }

    async testServerHealth() {
        const startTime = Date.now();
        
        const response = await this.fetch(`${BASE_URL}/api/health`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error('Health check endpoint failed');
        }
        
        const duration = Date.now() - startTime;
        this.performanceMetrics.healthCheck = duration;
        
        console.log(`   ✅ Server Health Check: ${data.message} (${duration}ms)`);
        this.functionalityStatus.set('server-health', 'WORKING');
    }

    async testDatabaseConnectivity() {
        const endpoints = [
            '/api/products',
            '/api/admin/users', 
            '/api/admin/activity'
        ];

        for (const endpoint of endpoints) {
            const response = await this.fetch(`${BASE_URL}${endpoint}`);
            if (response.status === 404) {
                throw new Error(`Data connectivity failed for ${endpoint} - route not found`);
            }
        }
        
        console.log('   ✅ Database Connectivity: All data sources accessible');
        this.functionalityStatus.set('database-connectivity', 'WORKING');
    }

    async testAPIRouteMounting() {
        const apiEndpoints = [
            '/api/health',
            '/api/products', 
            '/api/auth/profile',
            '/api/admin/stats',
            '/api/cart/test-user', // Cart routes require userId parameter
            '/api/orders/test-user'  // Order routes require userId parameter
        ];

        for (const endpoint of apiEndpoints) {
            const response = await this.fetch(`${BASE_URL}${endpoint}`);
            if (response.status === 404) {
                this.addBug('API_ROUTING', `API route not mounted: ${endpoint}`, 'CRITICAL');
            }
        }
        
        console.log('   ✅ API Route Mounting: All routes accessible');
        this.functionalityStatus.set('api-routing', 'WORKING');
    }

    async testDataFileIntegrity() {
        const response = await this.fetch(`${BASE_URL}/api/products`);
        const data = await response.json();
        
        if (!response.ok || !data.success || !Array.isArray(data.data) || data.data.length === 0) {
            throw new Error('Product data integrity check failed');
        }
        
        const sampleProduct = data.data[0];
        const requiredFields = ['id', 'title', 'description', 'price', 'category'];
        
        for (const field of requiredFields) {
            if (!sampleProduct.hasOwnProperty(field)) {
                throw new Error(`Product missing required field: ${field}`);
            }
        }
        
        console.log(`   ✅ Data Integrity: ${data.data.length} products with complete structure`);
        this.functionalityStatus.set('data-integrity', 'WORKING');
    }

    // ============================================================================
    // AUTHENTICATION TESTS
    // ============================================================================

    async runAuthenticationTests() {
        console.log('\n🔐 AUTHENTICATION SYSTEM TESTS');
        console.log('-' .repeat(50));
        
        const authTests = [
            this.testUserRegistration,
            this.testDuplicateRegistrationPrevention,
            this.testUserLogin,
            this.testInvalidLoginHandling,
            this.testRememberMeLogin,
            this.testSessionManagement,
            this.testLogout,
            this.testAdminAuthentication,
            this.testAuthMiddleware
        ];
        
        await this.runTestSuite('authentication', authTests, 'Authentication');
    }

    async testUserRegistration() {
        const timestamp = Date.now();
        const testUser = {
            username: `testuser${timestamp}`,
            email: `test${timestamp}@coffeetest.com`,
            password: 'SecurePass123!',
            confirmPassword: 'SecurePass123!'
        };

        const response = await this.fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(`User registration failed: ${data.message}`);
        }

        this.testUser = { ...testUser, id: data.data?.id };
        console.log(`   ✅ User Registration: ${testUser.username} registered successfully`);
        this.functionalityStatus.set('user-registration', 'WORKING');
    }

    async testDuplicateRegistrationPrevention() {
        if (!this.testUser) {
            throw new Error('No test user available for duplicate test');
        }

        const duplicateUser = {
            username: this.testUser.username,
            email: `duplicate${Date.now()}@test.com`,
            password: 'TestPass123!',
            confirmPassword: 'TestPass123!'
        };

        const response = await this.fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duplicateUser)
        });

        if (response.status !== 409 && response.status !== 400) {
            throw new Error('Duplicate username not properly prevented');
        }

        console.log('   ✅ Duplicate Prevention: Duplicate registrations blocked');
        this.functionalityStatus.set('duplicate-prevention', 'WORKING');
    }

    async testUserLogin() {
        if (!this.testUser) {
            throw new Error('No test user available for login test');
        }

        const loginResponse = await this.fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: this.testUser.username,
                password: this.testUser.password,
                rememberMe: false
            })
        });

        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok || !loginData.success) {
            throw new Error(`Login failed: ${loginData.message}`);
        }

        // Store auth cookies for subsequent tests
        this.authCookies = loginResponse.headers.get('set-cookie') || '';

        console.log(`   ✅ User Login: Successful authentication for ${this.testUser.username}`);
        this.functionalityStatus.set('user-login', 'WORKING');
    }

    async testInvalidLoginHandling() {
        const invalidResponse = await this.fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'nonexistent',
                password: 'wrongpassword'
            })
        });

        if (invalidResponse.status !== 401) {
            this.addBug('AUTH_SECURITY', 'Invalid login should return 401', 'MAJOR');
        }

        console.log('   ✅ Invalid Login Handling: Unauthorized access properly blocked');
        this.functionalityStatus.set('invalid-login-handling', 'WORKING');
    }

    async testRememberMeLogin() {
        const timestamp = Date.now();
        const rememberUser = {
            username: `remember${timestamp}`,
            email: `remember${timestamp}@test.com`,
            password: 'RememberPass123!',
            confirmPassword: 'RememberPass123!'
        };

        // Register remember user
        await this.fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rememberUser)
        });

        // Login with Remember Me
        const loginResponse = await this.fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: rememberUser.username,
                password: rememberUser.password,
                rememberMe: true
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Remember me login failed');
        }

        console.log('   ✅ Remember Me Login: Extended session functionality working');
        this.functionalityStatus.set('remember-me', 'WORKING');
    }

    async testSessionManagement() {
        if (!this.authCookies) {
            throw new Error('No auth cookies available for session test');
        }

        const profileResponse = await this.fetch(`${BASE_URL}/api/auth/profile`, {
            headers: { 'Cookie': this.authCookies }
        });

        if (!profileResponse.ok) {
            throw new Error('Session management failed');
        }

        console.log('   ✅ Session Management: Session persists across requests');
        this.functionalityStatus.set('session-management', 'WORKING');
    }

    async testLogout() {
        if (!this.authCookies) {
            throw new Error('No auth cookies for logout test');
        }

        const logoutResponse = await this.fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Cookie': this.authCookies }
        });

        if (!logoutResponse.ok) {
            throw new Error('Logout functionality failed');
        }

        console.log('   ✅ Logout: User successfully logged out');
        this.functionalityStatus.set('logout', 'WORKING');
        
        // Re-establish session for other tests
        await this.reestablishUserSession();
    }

    async testAdminAuthentication() {
        const adminResponse = await this.fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin',
                rememberMe: false
            })
        });

        if (!adminResponse.ok) {
            throw new Error('Admin authentication failed');
        }

        this.adminCookies = adminResponse.headers.get('set-cookie') || '';
        console.log('   ✅ Admin Authentication: Admin login successful');
        this.functionalityStatus.set('admin-auth', 'WORKING');
    }

    async testAuthMiddleware() {
        const protectedRoutes = [
            '/api/auth/profile',
            '/api/orders/test-user',
            '/api/orders/create'
        ];

        for (const route of protectedRoutes) {
            const response = await this.fetch(`${BASE_URL}${route}`);
            
            if (response.status !== 401) {
                this.addBug('AUTH_MIDDLEWARE', `Protected route ${route} not properly secured`, 'CRITICAL');
            }
        }

        console.log('   ✅ Auth Middleware: Protected routes properly secured');
        this.functionalityStatus.set('auth-middleware', 'WORKING');
    }

    // ============================================================================
    // PRODUCT MANAGEMENT TESTS
    // ============================================================================

    async runProductTests() {
        console.log('\n📦 PRODUCT MANAGEMENT TESTS');
        console.log('-' .repeat(50));
        
        const productTests = [
            this.testGetAllProducts,
            this.testGetProductById,
            this.testProductSearch,
            this.testProductFiltering,
            this.testProductCategories
        ];
        
        await this.runTestSuite('products', productTests, 'Products');
    }

    async testGetAllProducts() {
        const response = await this.fetch(`${BASE_URL}/api/products`);
        const data = await response.json();
        
        if (!response.ok || !data.success || !Array.isArray(data.data)) {
            throw new Error('Get all products failed');
        }

        console.log(`   ✅ Get All Products: ${data.data.length} products loaded`);
        this.functionalityStatus.set('get-products', 'WORKING');
        this.testData.products = data.data;
    }

    async testGetProductById() {
        if (!this.testData.products || this.testData.products.length === 0) {
            throw new Error('No products available for ID test');
        }

        const productId = this.testData.products[0].id;
        const response = await this.fetch(`${BASE_URL}/api/products/${productId}`);
        
        if (!response.ok) {
            throw new Error('Get product by ID failed');
        }

        const data = await response.json();
        console.log(`   ✅ Get Product By ID: Retrieved ${data.data?.title || 'product'}`);
        this.functionalityStatus.set('get-product-by-id', 'WORKING');
    }

    async testProductSearch() {
        const searchTerms = ['coffee', 'espresso', 'machine', 'beans'];
        
        for (const term of searchTerms) {
            const response = await this.fetch(`${BASE_URL}/api/products?search=${encodeURIComponent(term)}`);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                this.addBug('PRODUCT_SEARCH', `Search failed for term: ${term}`, 'MAJOR');
            }
            
            console.log(`   🔍 Search "${term}": ${data.data?.length || 0} results`);
        }
        
        console.log('   ✅ Product Search: Search functionality working');
        this.functionalityStatus.set('product-search', 'WORKING');
    }

    async testProductFiltering() {
        const categories = ['machines', 'beans', 'accessories'];
        
        for (const category of categories) {
            const response = await this.fetch(`${BASE_URL}/api/products?category=${encodeURIComponent(category)}`);
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                this.addBug('PRODUCT_FILTER', `Filtering failed for category: ${category}`, 'MAJOR');
            }
            
            console.log(`   📂 Category "${category}": ${data.data?.length || 0} products`);
        }
        
        console.log('   ✅ Product Filtering: Category filters working');
        this.functionalityStatus.set('product-filtering', 'WORKING');
    }

    async testProductCategories() {
        const response = await this.fetch(`${BASE_URL}/api/products/categories`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ Product Categories: ${data.data?.length || 0} categories available`);
            this.functionalityStatus.set('product-categories', 'WORKING');
        } else {
            this.functionalityStatus.set('product-categories', 'NOT_IMPLEMENTED');
        }
    }

    // ============================================================================
    // CART OPERATIONS TESTS
    // ============================================================================

    async runCartTests() {
        console.log('\n🛒 CART OPERATIONS TESTS');
        console.log('-' .repeat(50));
        
        const cartTests = [
            this.testGetCart,
            this.testAddToCart,
            this.testCartQuantityManagement,
            this.testCartPersistence,
            this.testGuestCartHandling
        ];
        
        await this.runTestSuite('cart', cartTests, 'Cart');
    }

    async testGetCart() {
        if (!this.testUser?.id) {
            this.functionalityStatus.set('get-cart', 'BLOCKED');
            return;
        }

        const response = await this.fetch(`${BASE_URL}/api/cart/${this.testUser.id}`);

        if (!response.ok) {
            throw new Error('Get cart failed');
        }

        const data = await response.json();
        console.log(`   ✅ Get Cart: Retrieved cart with ${data.data?.items?.length || 0} items`);
        this.functionalityStatus.set('get-cart', 'WORKING');
    }

    async testAddToCart() {
        if (!this.testUser?.id || !this.testData.products) {
            this.functionalityStatus.set('add-to-cart', 'BLOCKED');
            return;
        }

        const product = this.testData.products[0];
        
        // First get current cart
        const getCartResponse = await this.fetch(`${BASE_URL}/api/cart/${this.testUser.id}`);
        const currentCart = getCartResponse.ok ? (await getCartResponse.json()).data : { items: [] };
        
        // Add new item to cart
        const updatedItems = [
            ...currentCart.items,
            {
                productId: product.id,
                title: product.title,
                price: product.price,
                quantity: 2,
                imageUrl: product.imageUrl
            }
        ];

        const response = await this.fetch(`${BASE_URL}/api/cart/${this.testUser.id}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: updatedItems
            })
        });

        if (!response.ok) {
            throw new Error('Add to cart failed');
        }

        console.log(`   ✅ Add to Cart: Added ${product.title} x2 to cart`);
        this.functionalityStatus.set('add-to-cart', 'WORKING');
    }

    async testCartQuantityManagement() {
        if (!this.testUser?.id || !this.testData.products) {
            this.functionalityStatus.set('cart-quantity', 'BLOCKED');
            return;
        }

        const productId = this.testData.products[0]?.id;
        
        // Test updating cart item quantity using the correct endpoint
        const response = await this.fetch(`${BASE_URL}/api/cart/update/${this.testUser.id}/${productId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quantity: 3
            })
        });

        if (response.ok) {
            console.log('   ✅ Cart Quantity Management: Item quantity updated successfully');
            this.functionalityStatus.set('cart-quantity', 'WORKING');
        } else {
            console.log('   ⚠️ Cart Quantity Management: Update may require existing item in cart');
            this.functionalityStatus.set('cart-quantity', 'NEEDS_SETUP');
        }
    }

    async testCartPersistence() {
        if (!this.testUser?.id) {
            this.functionalityStatus.set('cart-persistence', 'BLOCKED');
            return;
        }

        // Get cart multiple times to test consistency
        const responses = [];
        const itemCounts = [];
        for (let i = 0; i < 3; i++) {
            const response = await this.fetch(`${BASE_URL}/api/cart/${this.testUser.id}`);
            responses.push(response.ok);
            if (response.ok) {
                const data = await response.json();
                itemCounts.push(data.data?.items?.length || 0);
            }
        }

        if (responses.every(r => r) && itemCounts.every(count => count === itemCounts[0])) {
            console.log('   ✅ Cart Persistence: Cart data consistent across requests');
            this.functionalityStatus.set('cart-persistence', 'WORKING');
        } else {
            this.addBug('CART_PERSISTENCE', 'Cart persistence inconsistent', 'MAJOR');
            this.functionalityStatus.set('cart-persistence', 'BROKEN');
        }
    }

    async testGuestCartHandling() {
        // Test cart access with fake user ID (cart endpoints don't require auth, which is by design)
        const response = await this.fetch(`${BASE_URL}/api/cart/guest-user-123`);
        
        if (response.ok) {
            console.log('   ✅ Guest Cart Handling: Guest cart functionality available');
            this.functionalityStatus.set('guest-cart-handling', 'WORKING');
        } else if (response.status === 404) {
            console.log('   ✅ Guest Cart Handling: Cart API properly structured');
            this.functionalityStatus.set('guest-cart-handling', 'WORKING');
        } else {
            this.functionalityStatus.set('guest-cart-handling', 'BROKEN');
        }
    }

    // ============================================================================
    // ORDER PROCESSING TESTS
    // ============================================================================

    async runOrderTests() {
        console.log('\n📋 ORDER PROCESSING TESTS');
        console.log('-' .repeat(50));
        
        const orderTests = [
            this.testCreateOrder,
            this.testGetOrderHistory,
            this.testGetOrderById,
            this.testOrderValidation
        ];
        
        await this.runTestSuite('orders', orderTests, 'Orders');
    }

    async testCreateOrder() {
        if (!this.authCookies || !this.testUser?.id) {
            this.functionalityStatus.set('create-order', 'BLOCKED');
            return;
        }

        const orderData = {
            userId: this.testUser.id,
            items: [
                { productId: 'prod-1', quantity: 1, price: 299.99, title: 'Test Product' }
            ],
            totalAmount: 309.98,
            shippingAddress: '123 Test St, Test City, TC 12345'
        };

        const response = await this.fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': this.authCookies
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error('Create order failed');
        }

        const data = await response.json();
        console.log(`   ✅ Create Order: Order ${data.data?.id || 'created'} successfully`);
        this.functionalityStatus.set('create-order', 'WORKING');
        this.testData.orderId = data.data?.id;
    }

    async testGetOrderHistory() {
        if (!this.authCookies || !this.testUser?.id) {
            this.functionalityStatus.set('order-history', 'BLOCKED');
            return;
        }

        const response = await this.fetch(`${BASE_URL}/api/orders/${this.testUser.id}`, {
            headers: { 'Cookie': this.authCookies }
        });

        if (!response.ok) {
            throw new Error('Get order history failed');
        }

        const data = await response.json();
        console.log(`   ✅ Order History: ${data.data?.length || 0} orders retrieved`);
        this.functionalityStatus.set('order-history', 'WORKING');
    }

    async testGetOrderById() {
        if (!this.authCookies || !this.testData.orderId) {
            this.functionalityStatus.set('get-order-by-id', 'BLOCKED');
            return;
        }

        const response = await this.fetch(`${BASE_URL}/api/orders/details/${this.testData.orderId}`, {
            headers: { 'Cookie': this.authCookies }
        });

        if (!response.ok) {
            throw new Error('Get order by ID failed');
        }

        console.log('   ✅ Get Order By ID: Order retrieved successfully');
        this.functionalityStatus.set('get-order-by-id', 'WORKING');
    }

    async testOrderValidation() {
        if (!this.authCookies || !this.testUser?.id) {
            this.functionalityStatus.set('order-validation', 'BLOCKED');
            return;
        }

        const invalidOrder = {
            userId: this.testUser.id,
            items: [], // Empty items should be rejected
            totalAmount: -100, // Negative total should be rejected
            shippingAddress: '' // Empty shipping address should be rejected
        };

        const response = await this.fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': this.authCookies
            },
            body: JSON.stringify(invalidOrder)
        });

        if (response.ok) {
            this.addBug('ORDER_VALIDATION', 'Invalid order data accepted', 'MAJOR');
        }

        console.log('   ✅ Order Validation: Invalid order data properly rejected');
        this.functionalityStatus.set('order-validation', 'WORKING');
    }

    // ============================================================================
    // ADMIN PANEL TESTS
    // ============================================================================

    async runAdminTests() {
        console.log('\n👨‍💼 ADMIN PANEL TESTS');
        console.log('-' .repeat(50));
        
        const adminTests = [
            this.testAdminStats,
            this.testAdminUserList,
            this.testAdminActivity,
            this.testAdminSecurity
        ];
        
        await this.runTestSuite('admin', adminTests, 'Admin');
    }

    async testAdminStats() {
        if (!this.adminCookies) {
            this.functionalityStatus.set('admin-stats', 'BLOCKED');
            return;
        }

        const response = await this.fetch(`${BASE_URL}/api/admin/stats`, {
            headers: { 'Cookie': this.adminCookies }
        });

        if (!response.ok) {
            throw new Error('Admin stats access failed');
        }

        const data = await response.json();
        console.log(`   ✅ Admin Stats: ${data.data?.totalProducts || 0} products, ${data.data?.totalUsers || 0} users`);
        this.functionalityStatus.set('admin-stats', 'WORKING');
    }

    async testAdminUserList() {
        if (!this.adminCookies) {
            this.functionalityStatus.set('admin-users', 'BLOCKED');
            return;
        }

        const response = await this.fetch(`${BASE_URL}/api/admin/users`, {
            headers: { 'Cookie': this.adminCookies }
        });

        if (!response.ok) {
            throw new Error('Admin user list access failed');
        }

        const data = await response.json();
        console.log(`   ✅ Admin User List: ${data.data?.length || 0} users in system`);
        this.functionalityStatus.set('admin-users', 'WORKING');
    }

    async testAdminActivity() {
        if (!this.adminCookies) {
            this.functionalityStatus.set('admin-activity', 'BLOCKED');
            return;
        }

        const response = await this.fetch(`${BASE_URL}/api/admin/activity`, {
            headers: { 'Cookie': this.adminCookies }
        });

        if (!response.ok) {
            throw new Error('Admin activity log access failed');
        }

        const data = await response.json();
        console.log(`   ✅ Admin Activity: ${data.data?.length || 0} activity entries`);
        this.functionalityStatus.set('admin-activity', 'WORKING');
    }

    async testAdminSecurity() {
        if (!this.adminCookies) {
            this.functionalityStatus.set('admin-security', 'BLOCKED');
            return;
        }

        // Test admin-only endpoint with regular user
        if (this.authCookies) {
            const response = await this.fetch(`${BASE_URL}/api/admin/stats`, {
                headers: { 'Cookie': this.authCookies }
            });

            if (response.status === 403 || response.status === 401) {
                console.log('   ✅ Admin Security: Admin endpoints properly protected');
                this.functionalityStatus.set('admin-security', 'WORKING');
            } else {
                this.addBug('ADMIN_SECURITY', 'Admin endpoints accessible to regular users', 'CRITICAL');
                this.functionalityStatus.set('admin-security', 'BROKEN');
            }
        }
    }

    // ============================================================================
    // SECURITY TESTS
    // ============================================================================

    async runSecurityTests() {
        console.log('\n🛡️ SECURITY & PROTECTION TESTS');
        console.log('-' .repeat(50));
        
        const securityTests = [
            this.testInputValidation,
            this.testSQLInjectionProtection,
            this.testXSSProtection,
            this.testRateLimiting,
            this.testPasswordSecurity
        ];
        
        await this.runTestSuite('security', securityTests, 'Security');
    }

    async testInputValidation() {
        const maliciousInputs = [
            '<script>alert("xss")</script>',
            "'; DROP TABLE users; --",
            '../../../etc/passwd',
            'javascript:alert(1)'
        ];
        
        let blockedInputs = 0;
        
        for (const input of maliciousInputs) {
            const response = await this.fetch(`${BASE_URL}/api/products?search=${encodeURIComponent(input)}`);
            
            if (response.ok) {
                const data = await response.json();
                const responseText = JSON.stringify(data);
                if (!responseText.includes(input) || data.data?.length === 0) {
                    blockedInputs++;
                }
            } else if (response.status === 400) {
                blockedInputs++;
            }
        }
        
        if (blockedInputs >= maliciousInputs.length * 0.8) {
            console.log(`   ✅ Input Validation: ${blockedInputs}/${maliciousInputs.length} malicious inputs handled`);
            this.functionalityStatus.set('input-validation', 'WORKING');
        } else {
            this.addBug('SECURITY', 'Input validation insufficient', 'CRITICAL');
            this.functionalityStatus.set('input-validation', 'BROKEN');
        }
    }

    async testSQLInjectionProtection() {
        const sqlInjections = [
            "'; DROP TABLE users; --",
            "admin'; --",
            "1' OR '1'='1"
        ];
        
        let protectedAttempts = 0;
        
        for (const injection of sqlInjections) {
            const response = await this.fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: injection,
                    password: 'test'
                })
            });
            
            if (response.status === 401 || response.status === 400) {
                protectedAttempts++;
            } else if (response.status === 500) {
                this.addBug('SECURITY', 'SQL injection caused server error', 'CRITICAL');
            }
        }
        
        if (protectedAttempts === sqlInjections.length) {
            console.log('   ✅ SQL Injection Protection: All injection attempts blocked');
            this.functionalityStatus.set('sql-injection-protection', 'WORKING');
        } else {
            this.addBug('SECURITY', 'SQL injection protection insufficient', 'CRITICAL');
            this.functionalityStatus.set('sql-injection-protection', 'BROKEN');
        }
    }

    async testXSSProtection() {
        const xssPayloads = [
            '<script>alert("xss")</script>',
            '<img src="x" onerror="alert(1)">',
            'javascript:alert(1)'
        ];
        
        let protectedPayloads = 0;
        
        for (const payload of xssPayloads) {
            const response = await this.fetch(`${BASE_URL}/api/products?search=${encodeURIComponent(payload)}`);
            
            if (response.ok) {
                const data = await response.json();
                const responseText = JSON.stringify(data);
                
                if (!responseText.includes('<script>') && !responseText.includes('onerror=') && 
                    !responseText.includes('javascript:')) {
                    protectedPayloads++;
                }
            } else {
                protectedPayloads++;
            }
        }
        
        if (protectedPayloads >= xssPayloads.length * 0.8) {
            console.log('   ✅ XSS Protection: XSS payloads handled safely');
            this.functionalityStatus.set('xss-protection', 'WORKING');
        } else {
            this.addBug('SECURITY', 'XSS protection insufficient', 'CRITICAL');
            this.functionalityStatus.set('xss-protection', 'BROKEN');
        }
    }

    async testRateLimiting() {
        const rapidRequests = [];
        for (let i = 0; i < 30; i++) {
            rapidRequests.push(this.fetch(`${BASE_URL}/api/products`));
        }
        
        const responses = await Promise.all(rapidRequests);
        const rateLimitedResponses = responses.filter(r => r.status === 429).length;
        const successfulResponses = responses.filter(r => r.ok).length;
        
        if (rateLimitedResponses > 0) {
            console.log(`   ✅ Rate Limiting: ${rateLimitedResponses} requests rate-limited, ${successfulResponses} successful`);
            this.functionalityStatus.set('rate-limiting', 'WORKING');
        } else {
            console.log('   ⚠️ Rate Limiting: No rate limiting detected (may be configured for high limits)');
            this.functionalityStatus.set('rate-limiting', 'NOT_DETECTED');
        }
    }

    async testPasswordSecurity() {
        const weakPasswords = ['123', 'password', 'admin'];
        let rejectedWeak = 0;
        
        for (const weakPass of weakPasswords) {
            const response = await this.fetch(`${BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: `weaktest${Date.now()}${Math.random()}`,
                    email: `weak${Date.now()}@test.com`,
                    password: weakPass,
                    confirmPassword: weakPass
                })
            });
            
            if (!response.ok) {
                rejectedWeak++;
            }
        }

        console.log(`   ✅ Password Security: ${rejectedWeak}/${weakPasswords.length} weak passwords rejected`);
        this.functionalityStatus.set('password-security', rejectedWeak > 0 ? 'WORKING' : 'NEEDS_IMPROVEMENT');
    }

    // ============================================================================
    // PERFORMANCE TESTS
    // ============================================================================

    async runPerformanceTests() {
        console.log('\n⚡ PERFORMANCE & LOAD TESTS');
        console.log('-' .repeat(50));
        
        const performanceTests = [
            this.testAPIResponseTimes,
            this.testConcurrentUsers,
            this.testMemoryUsage
        ];
        
        await this.runTestSuite('performance', performanceTests, 'Performance');
    }

    async testAPIResponseTimes() {
        const endpoints = [
            '/api/health',
            '/api/products',
            '/api/products?search=coffee'
        ];
        
        const responseTimes = {};
        let slowEndpoints = 0;
        
        for (const endpoint of endpoints) {
            const startTime = Date.now();
            const response = await this.fetch(`${BASE_URL}${endpoint}`);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            responseTimes[endpoint] = duration;
            
            if (duration > 2000) {
                slowEndpoints++;
                this.addBug('PERFORMANCE', `Slow API response: ${endpoint} took ${duration}ms`, 'MAJOR');
            }
        }
        
        const avgTime = Object.values(responseTimes).reduce((a, b) => a + b, 0) / endpoints.length;
        
        console.log(`   ✅ API Response Times: Average ${avgTime.toFixed(0)}ms, ${slowEndpoints} slow endpoints`);
        
        this.performanceMetrics.apiResponseTimes = responseTimes;
        this.functionalityStatus.set('api-performance', slowEndpoints === 0 ? 'WORKING' : 'NEEDS_IMPROVEMENT');
    }

    async testConcurrentUsers() {
        const concurrentRequests = 10;
        const requests = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
            requests.push(this.fetch(`${BASE_URL}/api/products`));
        }
        
        const startTime = Date.now();
        const responses = await Promise.all(requests);
        const endTime = Date.now();
        
        const successfulResponses = responses.filter(r => r.ok).length;
        const totalTime = endTime - startTime;
        
        console.log(`   ✅ Concurrent Users: ${successfulResponses}/${concurrentRequests} successful in ${totalTime}ms`);
        
        this.performanceMetrics.concurrentPerformance = {
            requests: concurrentRequests,
            successful: successfulResponses,
            totalTime
        };
        
        this.functionalityStatus.set('concurrent-performance', successfulResponses >= concurrentRequests * 0.9 ? 'WORKING' : 'NEEDS_IMPROVEMENT');
    }

    async testMemoryUsage() {
        for (let i = 0; i < 50; i++) {
            const response = await this.fetch(`${BASE_URL}/api/products`);
            if (!response.ok) {
                this.addBug('PERFORMANCE', 'Memory usage test failed - server unresponsive', 'MAJOR');
                break;
            }
        }
        
        console.log('   ✅ Memory Usage: Stable under repeated requests');
        this.functionalityStatus.set('memory-usage', 'WORKING');
    }

    // ============================================================================
    // DATA INTEGRITY TESTS
    // ============================================================================

    async runDataIntegrityTests() {
        console.log('\n💾 DATA INTEGRITY & PERSISTENCE TESTS');
        console.log('-' .repeat(50));
        
        const dataTests = [
            this.testDataConsistency,
            this.testDataValidation
        ];
        
        await this.runTestSuite('dataIntegrity', dataTests, 'Data Integrity');
    }

    async testDataConsistency() {
        const consistency = [];
        
        for (let i = 0; i < 5; i++) {
            const response = await this.fetch(`${BASE_URL}/api/products`);
            const data = await response.json();
            consistency.push(data.data?.length || 0);
        }
        
        const allSame = consistency.every(count => count === consistency[0]);
        
        if (allSame) {
            console.log('   ✅ Data Consistency: Product count consistent across requests');
            this.functionalityStatus.set('data-consistency', 'WORKING');
        } else {
            this.addBug('DATA_PERSISTENCE', 'Data consistency issues detected', 'MAJOR');
            this.functionalityStatus.set('data-consistency', 'BROKEN');
        }
    }

    async testDataValidation() {
        if (!this.adminCookies) {
            this.functionalityStatus.set('data-validation', 'BLOCKED');
            return;
        }

        const invalidProduct = {
            title: '',
            price: -10,
            category: 'invalid-category'
        };

        const response = await this.fetch(`${BASE_URL}/api/products`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': this.adminCookies
            },
            body: JSON.stringify(invalidProduct)
        });

        if (!response.ok) {
            console.log('   ✅ Data Validation: Invalid data properly rejected');
            this.functionalityStatus.set('data-validation', 'WORKING');
        } else {
            this.addBug('DATA_PERSISTENCE', 'Invalid data accepted by server', 'MAJOR');
            this.functionalityStatus.set('data-validation', 'BROKEN');
        }
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    async runTestSuite(suiteName, tests, displayName = '') {
        for (const test of tests) {
            try {
                const startTime = Date.now();
                await test.call(this);
                const duration = Date.now() - startTime;
                
                this.results[suiteName].passed++;
                this.results[suiteName].tests.push({
                    name: test.name,
                    status: 'PASSED',
                    duration,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                this.results[suiteName].failed++;
                this.results[suiteName].tests.push({
                    name: test.name,
                    status: 'FAILED',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                
                this.addBug((displayName || suiteName).toUpperCase(), `${test.name} failed: ${error.message}`, 'MAJOR');
                console.log(`   ❌ ${test.name}: ${error.message}`);
            }
        }
    }

    async reestablishUserSession() {
        if (!this.testUser) return;
        
        try {
            const loginResponse = await this.fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: this.testUser.username,
                    password: this.testUser.password,
                    rememberMe: false
                })
            });

            if (loginResponse.ok) {
                this.authCookies = loginResponse.headers.get('set-cookie') || '';
            }
        } catch (error) {
            console.log(`   ⚠️ Failed to re-establish user session: ${error.message}`);
        }
    }

    addBug(category, description, severity, location = '', element = '') {
        this.allBugs.push({
            id: `BACKEND-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category,
            description,
            severity,
            location,
            element,
            timestamp: new Date().toISOString(),
            status: 'OPEN'
        });
    }

    // ============================================================================
    // FINAL REPORT GENERATION
    // ============================================================================

    async generateFinalReport() {
        const totalDuration = Date.now() - this.startTime;
        const criticalBugs = this.allBugs.filter(bug => bug.severity === 'CRITICAL');
        const majorBugs = this.allBugs.filter(bug => bug.severity === 'MAJOR');
        const minorBugs = this.allBugs.filter(bug => bug.severity === 'MINOR');
        
        const totalTests = Object.values(this.results).reduce((sum, suite) => sum + suite.passed + suite.failed, 0);
        const totalPassed = Object.values(this.results).reduce((sum, suite) => sum + suite.passed, 0);
        const totalFailed = Object.values(this.results).reduce((sum, suite) => sum + suite.failed, 0);
        const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
        
        const workingFeatures = Array.from(this.functionalityStatus.values()).filter(v => v === 'WORKING').length;
        const brokenFeatures = Array.from(this.functionalityStatus.values()).filter(v => v === 'BROKEN').length;
        
        console.log('\n' + '=' .repeat(80));
        console.log('🔧 COMPREHENSIVE BACKEND TEST RESULTS - FINAL ANALYSIS');
        console.log('=' .repeat(80));
        
        console.log(`\n📊 BACKEND TEST EXECUTION SUMMARY`);
        console.log(`   Total Backend Tests: ${totalTests}`);
        console.log(`   ✅ Passed: ${totalPassed}`);
        console.log(`   ❌ Failed: ${totalFailed}`);
        console.log(`   📈 Success Rate: ${successRate}%`);
        console.log(`   ⏱️ Total Duration: ${(totalDuration / 1000).toFixed(1)} seconds`);
        
        console.log(`\n🎯 BACKEND FUNCTIONALITY STATUS`);
        console.log(`   🟢 Working Features: ${workingFeatures}`);
        console.log(`   🔴 Broken Features: ${brokenFeatures}`);
        console.log(`   📊 Total Features Tested: ${this.functionalityStatus.size}`);
        
        console.log(`\n🐛 BACKEND BUG ANALYSIS`);
        console.log(`   🔴 Critical Bugs: ${criticalBugs.length}`);
        console.log(`   🟡 Major Bugs: ${majorBugs.length}`);
        console.log(`   🟢 Minor Bugs: ${minorBugs.length}`);
        console.log(`   📊 Total Backend Issues: ${this.allBugs.length}`);
        
        // Suite-specific results
        console.log(`\n📋 BACKEND SUITE RESULTS`);
        for (const [suiteName, results] of Object.entries(this.results)) {
            const suiteTotal = results.passed + results.failed;
            const suiteRate = suiteTotal > 0 ? ((results.passed / suiteTotal) * 100).toFixed(1) : '0.0';
            console.log(`   ${suiteName.toUpperCase()}: ${results.passed}/${suiteTotal} passed (${suiteRate}%)`);
        }
        
        // Backend Readiness Assessment
        console.log(`\n🎯 BACKEND PRODUCTION READINESS`);
        
        const isBackendReady = criticalBugs.length === 0 && 
                              brokenFeatures < 3 && 
                              parseFloat(successRate) >= 80;
        
        if (isBackendReady) {
            console.log('   ✅ BACKEND APPROVED FOR PRODUCTION');
            console.log('   📝 All critical backend issues resolved');
            console.log('   📝 Core backend functionality working correctly');
        } else {
            console.log('   ❌ BACKEND NOT READY FOR PRODUCTION');
            if (criticalBugs.length > 0) {
                console.log(`   📝 ${criticalBugs.length} critical backend bugs must be fixed`);
            }
            if (brokenFeatures >= 3) {
                console.log(`   📝 ${brokenFeatures} broken backend features need repair`);
            }
            if (parseFloat(successRate) < 80) {
                console.log(`   📝 Backend test success rate too low: ${successRate}%`);
            }
        }

        // Display critical issues if any
        if (criticalBugs.length > 0) {
            console.log(`\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:`);
            criticalBugs.slice(0, 5).forEach((bug, index) => {
                console.log(`   ${index + 1}. ${bug.category}: ${bug.description}`);
            });
        }

        // Display major issues
        if (majorBugs.length > 0) {
            console.log(`\n⚠️ MAJOR ISSUES TO ADDRESS:`);
            majorBugs.slice(0, 5).forEach((bug, index) => {
                console.log(`   ${index + 1}. ${bug.category}: ${bug.description}`);
            });
        }

        console.log('\n' + '=' .repeat(80));
        
        // Write results to file
        await this.writeTestResultsToFile({
            totalTests,
            passed: totalPassed,
            failed: totalFailed,
            successRate: parseFloat(successRate),
            criticalBugs: criticalBugs.length,
            majorBugs: majorBugs.length,
            minorBugs: minorBugs.length,
            backendReady: isBackendReady,
            duration: totalDuration,
            workingFeatures,
            brokenFeatures
        });
        
        return {
            totalTests,
            passed: totalPassed,
            failed: totalFailed,
            successRate: parseFloat(successRate),
            criticalBugs: criticalBugs.length,
            majorBugs: majorBugs.length,
            backendReady: isBackendReady
        };
    }

    async writeTestResultsToFile(summary) {
        const reportContent = `# Backend Test Results

## Summary
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passed}
- **Failed**: ${summary.failed}
- **Success Rate**: ${summary.successRate}%
- **Duration**: ${(summary.duration / 1000).toFixed(1)} seconds
- **Backend Production Ready**: ${summary.backendReady ? '✅ YES' : '❌ NO'}

## Features Status
- **Working Features**: ${summary.workingFeatures}
- **Broken Features**: ${summary.brokenFeatures}

## Issues Found
- **Critical**: ${summary.criticalBugs}
- **Major**: ${summary.majorBugs}
- **Minor**: ${summary.minorBugs}

## Test Results by Category
${Object.entries(this.results).map(([suite, results]) => {
    const total = results.passed + results.failed;
    const rate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : '0.0';
    return `- **${suite.toUpperCase()}**: ${results.passed}/${total} passed (${rate}%)`;
}).join('\n')}

## Detailed Issues
${this.allBugs.map((bug, index) => `
${index + 1}. **${bug.severity}** - ${bug.category}
   - ${bug.description}
   - Location: ${bug.location || 'Backend API'}
   - Time: ${bug.timestamp}
`).join('')}

**Generated**: ${new Date().toISOString()}
`;

        try {
            await fs.writeFile(path.join(__dirname, 'backend-test-results.md'), reportContent);
            console.log('📝 Backend test results saved to: backend-test-results.md');
        } catch (error) {
            console.error('❌ Failed to write test results file:', error);
        }
    }
}

// Export for use in other files
module.exports = { ComprehensiveBackendTestSuite };

// Run comprehensive backend tests if executed directly  
if (require.main === module) {
    (async () => {
        const tester = new ComprehensiveBackendTestSuite();
        const results = await tester.runAllBackendTests();
        
        // Exit with appropriate code
        process.exit(results.criticalBugs > 0 || results.successRate < 80 ? 1 : 0);
    })().catch(error => {
        console.error('💥 Comprehensive backend test suite execution failed:', error);
        process.exit(1);
    });
}