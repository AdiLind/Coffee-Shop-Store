const BASE_URL = 'http://localhost:3000';
let fetch;

class APITester {
    constructor() {
        this.initializeFetch();
    }
    
    async initializeFetch() {
        if (!fetch) {
            const nodeFetch = await import('node-fetch');
            fetch = nodeFetch.default;
        }
    }
    async runTests() {
        await this.initializeFetch(); // Ensure fetch is loaded
        console.log('🧪 Starting Coffee Shop API Tests...\n');
        
        const tests = [
            this.testServerHealth,
            this.testGetProducts,
            this.testSearchProducts,
            this.testGetSingleProduct,
            this.testAddProduct,
            this.testStaticFileServing,
            this.testCartOperations,
            this.testOrderOperations,
            this.testAdminEndpoints,
            this.testUserRegistration,
            this.testUserLogin,
            this.testUserLogout,
            this.testUserProfile,
            this.testAuthenticationFlow,
            this.testRateLimiting
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
        
        console.log(`   Status: ${data.message}`);
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
    
    async testCartOperations() {
        console.log('Testing cart operations...');
        const userId = 'test-user-1';
        
        // Test get cart
        const getCartResponse = await fetch(`${BASE_URL}/api/cart/${userId}`);
        const getCartData = await getCartResponse.json();
        
        if (!getCartResponse.ok || !getCartData.success) {
            throw new Error('Get cart endpoint failed');
        }
        
        // Test update cart
        const cartItems = [
            { productId: 'prod-1', quantity: 2, price: 299.99 }
        ];
        
        const updateCartResponse = await fetch(`${BASE_URL}/api/cart/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: cartItems })
        });
        
        const updateCartData = await updateCartResponse.json();
        
        if (!updateCartResponse.ok || !updateCartData.success) {
            throw new Error('Update cart endpoint failed');
        }
        
        console.log(`   Cart operations successful for user: ${userId}`);
    }
    
    async testOrderOperations() {
        console.log('Testing order operations...');
        const userId = 'test-user-1';
        
        // Test get user orders
        const getOrdersResponse = await fetch(`${BASE_URL}/api/orders/${userId}`);
        const getOrdersData = await getOrdersResponse.json();
        
        if (!getOrdersResponse.ok || !getOrdersData.success) {
            throw new Error('Get orders endpoint failed');
        }
        
        // Test create order
        const newOrder = {
            userId: userId,
            items: [
                { productId: 'prod-1', quantity: 1, price: 299.99, title: 'Test Product' }
            ],
            totalAmount: 309.98,
            shippingAddress: '123 Test St, Test City, TC 12345'
        };
        
        const createOrderResponse = await fetch(`${BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newOrder)
        });
        
        const createOrderData = await createOrderResponse.json();
        
        if (!createOrderResponse.ok || !createOrderData.success) {
            throw new Error('Create order endpoint failed');
        }
        
        console.log(`   Order operations successful - Order ID: ${createOrderData.data.id}`);
    }
    
    async testAdminEndpoints() {
        console.log('Testing admin endpoints...');
        
        // Test get stats
        const statsResponse = await fetch(`${BASE_URL}/api/admin/stats`);
        const statsData = await statsResponse.json();
        
        if (!statsResponse.ok || !statsData.success) {
            throw new Error('Admin stats endpoint failed');
        }
        
        // Test get users
        const usersResponse = await fetch(`${BASE_URL}/api/admin/users`);
        const usersData = await usersResponse.json();
        
        if (!usersResponse.ok || !usersData.success) {
            throw new Error('Admin users endpoint failed');
        }
        
        // Test get activity
        const activityResponse = await fetch(`${BASE_URL}/api/admin/activity`);
        const activityData = await activityResponse.json();
        
        if (!activityResponse.ok || !activityData.success) {
            throw new Error('Admin activity endpoint failed');
        }
        
        console.log(`   Admin endpoints successful - ${statsData.data.totalProducts} products, ${statsData.data.totalUsers} users`);
    }
    
    async testUserRegistration() {
        console.log('Testing user registration...');
        const testUser = {
            username: 'testuser' + Date.now(),
            email: 'test' + Date.now() + '@example.com',
            password: 'password123',
            confirmPassword: 'password123'
        };
        
        const response = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testUser)
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success || !data.data.id) {
            throw new Error('User registration failed');
        }
        
        console.log(`   User registered successfully: ${data.data.username}`);
        
        // Store for later tests
        this.testUserData = testUser;
        this.testUserId = data.data.id;
    }
    
    async testUserLogin() {
        console.log('Testing user login...');
        
        if (!this.testUserData) {
            throw new Error('No test user available for login test');
        }
        
        const loginData = {
            username: this.testUserData.username,
            password: this.testUserData.password,
            rememberMe: true
        };
        
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData),
            credentials: 'include' // Include cookies
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success || !data.sessionExpiresAt) {
            throw new Error('User login failed');
        }
        
        console.log(`   Login successful for user: ${data.data.username}`);
        console.log(`   Session expires: ${new Date(data.sessionExpiresAt).toLocaleString()}`);
        
        // Store cookies for authenticated requests
        const cookies = response.headers.get('set-cookie');
        if (cookies) {
            this.authCookies = cookies;
        }
    }
    
    async testUserProfile() {
        console.log('Testing authenticated user profile...');
        
        if (!this.authCookies) {
            throw new Error('No authentication cookies available');
        }
        
        const response = await fetch(`${BASE_URL}/api/auth/profile`, {
            headers: {
                'Cookie': this.authCookies
            }
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success || !data.data.id) {
            throw new Error('Profile retrieval failed');
        }
        
        console.log(`   Profile retrieved for user: ${data.data.username}`);
    }
    
    async testUserLogout() {
        console.log('Testing user logout...');
        
        if (!this.authCookies) {
            throw new Error('No authentication cookies available');
        }
        
        const response = await fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Cookie': this.authCookies
            }
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error('Logout failed');
        }
        
        console.log(`   Logout successful`);
        this.authCookies = null; // Clear stored cookies
    }
    
    async testAuthenticationFlow() {
        console.log('Testing complete authentication flow...');
        
        // Test admin login
        const adminLogin = {
            username: 'admin',
            password: 'admin',
            rememberMe: false
        };
        
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(adminLogin)
        });
        
        const loginData = await loginResponse.json();
        
        if (!loginResponse.ok || !loginData.success) {
            throw new Error('Admin login failed');
        }
        
        console.log(`   Admin login successful`);
        
        // Test accessing protected route
        const adminCookies = loginResponse.headers.get('set-cookie');
        const profileResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
            headers: {
                'Cookie': adminCookies
            }
        });
        
        const profileData = await profileResponse.json();
        
        if (!profileResponse.ok || !profileData.success || profileData.data.role !== 'admin') {
            throw new Error('Admin profile access failed');
        }
        
        console.log(`   Admin profile verified - Role: ${profileData.data.role}`);
        
        // Test logout
        const logoutResponse = await fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Cookie': adminCookies
            }
        });
        
        if (!logoutResponse.ok) {
            throw new Error('Admin logout failed');
        }
        
        console.log(`   Complete authentication flow verified`);
    }
    
    async testRateLimiting() {
        console.log('Testing rate limiting...');
        
        // Test that we can make multiple requests without hitting limits in normal usage
        const requests = [];
        for (let i = 0; i < 5; i++) {
            requests.push(fetch(`${BASE_URL}/api/health`));
        }
        
        const responses = await Promise.all(requests);
        const allSuccessful = responses.every(res => res.ok);
        
        if (!allSuccessful) {
            throw new Error('Rate limiting too aggressive - normal usage blocked');
        }
        
        console.log(`   Rate limiting configured correctly - normal usage allowed`);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    (async () => {
        const tester = new APITester();
        const results = await tester.runTests();
        process.exit(results.failed > 0 ? 1 : 0);
    })().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = APITester;