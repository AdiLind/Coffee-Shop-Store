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
            this.testAdminEndpoints
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