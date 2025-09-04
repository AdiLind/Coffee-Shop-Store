/**
 * RUNI 2025 Final Project - Comprehensive Frontend Test Suite
 * Coffee Shop E-commerce Application
 * 
 * Focus on Frontend Testing:
 * - All frontend pages and interactions
 * - JavaScript functionality and manager classes
 * - Theme system and localStorage
 * - Form validation and user workflows
 * - Responsive design and accessibility
 * - Cross-component communication
 * - Integration with backend APIs
 */

const fs = require('fs').promises;
const path = require('path');

// Dynamic fetch import for Node.js compatibility
let fetch;
const initFetch = async () => {
    if (!fetch) {
        const nodeFetch = await import('node-fetch');
        fetch = nodeFetch.default;
    }
};

const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000;

class ComprehensiveFrontendTester {
    constructor() {
        this.results = {
            pageLoading: { passed: 0, failed: 0, tests: [] },
            javascript: { passed: 0, failed: 0, tests: [] },
            interactions: { passed: 0, failed: 0, tests: [] },
            themes: { passed: 0, failed: 0, tests: [] },
            accessibility: { passed: 0, failed: 0, tests: [] },
            responsive: { passed: 0, failed: 0, tests: [] },
            integration: { passed: 0, failed: 0, tests: [] }
        };
        this.bugs = [];
        this.testUser = null;
        this.userSession = null;
        this.adminSession = null;
        this.startTime = Date.now();
        this.testData = {};
    }

    // ============================================================================
    // MAIN TEST RUNNER
    // ============================================================================

    async runAllTests() {
        await initFetch();
        
        console.log('🎨 RUNI 2025 Coffee Shop - COMPREHENSIVE FRONTEND TEST SUITE');
        console.log('=' .repeat(80));
        console.log(`Testing: ${BASE_URL}`);
        console.log(`Focus: Frontend Pages, JavaScript, UI/UX, Interactions`);
        console.log(`Started: ${new Date().toISOString()}`);
        console.log('=' .repeat(80));
        
        try {
            // Setup Phase
            await this.setupTestEnvironment();
            
            // Frontend Testing Phases
            await this.runPageLoadingTests();
            await this.runJavaScriptFunctionalityTests();
            await this.runUserInteractionTests();
            await this.runThemeSystemTests();
            await this.runAccessibilityTests();
            await this.runResponsiveDesignTests();
            await this.runFrontendIntegrationTests();
            
            // Generate comprehensive report
            await this.generateComprehensiveReport();
            this.printFinalResults();
            
        } catch (error) {
            console.error('❌ CRITICAL FRONTEND TEST FAILURE:', error);
            this.addBug('TEST_FRAMEWORK', `Frontend test framework failure: ${error.message}`, 'CRITICAL');
        }

        return this.results;
    }
    // ============================================================================
    // SETUP & ENVIRONMENT
    // ============================================================================

    async setupTestEnvironment() {
        console.log('\n🔧 PHASE 1: FRONTEND TEST ENVIRONMENT SETUP');
        console.log('Setting up authentication and test data...');
        
        // Test server connectivity
        await this.testServerConnectivity();
        
        // Create test user for authenticated frontend features
        await this.createTestUser();
        
        // Setup admin session for admin pages
        await this.setupAdminSession();
        
        // Load test data
        await this.loadTestData();
        
        console.log('✅ Frontend test environment ready');
    }

    async testServerConnectivity() {
        try {
            const response = await fetch(`${BASE_URL}/api/health`);
            if (!response.ok) throw new Error('Server health check failed');
            console.log('   ✅ Server connectivity verified');
        } catch (error) {
            throw new Error(`Server not accessible for frontend testing: ${error.message}`);
        }
    }

    async createTestUser() {
        const timestamp = Date.now();
        const userData = {
            username: `frontendtest${timestamp}`,
            email: `frontend${timestamp}@test.com`,
            password: 'FrontendTest123!',
            confirmPassword: 'FrontendTest123!'
        };

        try {
            // Register test user
            const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            if (registerResponse.ok) {
                const data = await registerResponse.json();
                this.testUser = data.data;

                // Login to get session cookies
                const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: userData.username,
                        password: userData.password,
                        rememberMe: true
                    })
                });

                if (loginResponse.ok) {
                    this.userSession = {
                        cookies: loginResponse.headers.get('set-cookie'),
                        data: await loginResponse.json()
                    };
                    console.log('   ✅ Test user created and authenticated');
                } else {
                    this.addBug('SETUP', 'Test user login failed after registration', 'CRITICAL');
                }
            } else {
                this.addBug('SETUP', 'Test user registration failed', 'CRITICAL');
            }
        } catch (error) {
            this.addBug('SETUP', `Test user creation error: ${error.message}`, 'CRITICAL');
        }
    }

    async setupAdminSession() {
        try {
            const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin',
                    rememberMe: false
                })
            });

            if (loginResponse.ok) {
                this.adminSession = {
                    cookies: loginResponse.headers.get('set-cookie'),
                    data: await loginResponse.json()
                };
                console.log('   ✅ Admin session established');
            } else {
                this.addBug('SETUP', 'Admin authentication failed', 'MAJOR');
            }
        } catch (error) {
            this.addBug('SETUP', `Admin session error: ${error.message}`, 'MAJOR');
        }
    }

    async loadTestData() {
        try {
            const response = await fetch(`${BASE_URL}/api/products`);
            if (response.ok) {
                const data = await response.json();
                this.testData.products = data.data;
                console.log(`   ✅ Loaded ${data.data.length} products for frontend testing`);
            }
        } catch (error) {
            this.addBug('SETUP', `Test data loading failed: ${error.message}`, 'MAJOR');
        }
    }

    // ============================================================================
    // PAGE LOADING TESTS
    // ============================================================================

    async runPageLoadingTests() {
        console.log('\n📄 PHASE 2: PAGE LOADING TESTS');
        
        const pageTests = [
            { name: 'Homepage Loading', fn: () => this.testHomePage() },
            { name: 'Store Page Loading', fn: () => this.testStorePage() },
            { name: 'Login Page Loading', fn: () => this.testLoginPage() },
            { name: 'Register Page Loading', fn: () => this.testRegisterPage() },
            { name: 'Cart Page Loading', fn: () => this.testCartPage() },
            { name: 'Checkout Page Loading', fn: () => this.testCheckoutPage() },
            { name: 'My Orders Page Loading', fn: () => this.testMyOrdersPage() },
            { name: 'Reviews Page Loading', fn: () => this.testReviewsPage() },
            { name: 'Wishlist Page Loading', fn: () => this.testWishlistPage() },
            { name: 'Admin Page Loading', fn: () => this.testAdminPage() },
            { name: 'CSS Files Loading', fn: () => this.testCSSFiles() },
            { name: 'JavaScript Files Loading', fn: () => this.testJavaScriptFiles() }
        ];

        await this.runTestSuite('pageLoading', pageTests);
    }

    async testHomePage() {
        const response = await fetch(`${BASE_URL}/`);
        if (!response.ok) throw new Error(`Homepage returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'homepage');
    }

    async testStorePage() {
        const response = await fetch(`${BASE_URL}/pages/store.html`);
        if (!response.ok) throw new Error(`Store page returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'store');
        
        // Validate store-specific elements
        const requiredElements = [
            'products-container',
            'search', 
            'filter',
            'category',
            'add-to-cart'
        ];
        
        for (const element of requiredElements) {
            if (!html.toLowerCase().includes(element.toLowerCase())) {
                this.addBug('PAGE_STRUCTURE', `Store page missing ${element} functionality`, 'MAJOR');
            }
        }
    }

    async testLoginPage() {
        const response = await fetch(`${BASE_URL}/pages/login.html`);
        if (!response.ok) throw new Error(`Login page returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'login');
        this.validateFormStructure(html, ['username', 'password'], 'login');
    }

    async testRegisterPage() {
        const response = await fetch(`${BASE_URL}/pages/register.html`);
        if (!response.ok) throw new Error(`Register page returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'register');
        this.validateFormStructure(html, ['username', 'email', 'password', 'confirm'], 'register');
    }

    async testCartPage() {
        const response = await fetch(`${BASE_URL}/pages/cart.html`);
        if (!response.ok) throw new Error(`Cart page returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'cart');
        
        // Cart-specific validations
        const cartElements = ['cart-items', 'quantity', 'remove', 'total', 'checkout'];
        for (const element of cartElements) {
            if (!html.toLowerCase().includes(element.toLowerCase())) {
                this.addBug('PAGE_STRUCTURE', `Cart page missing ${element} functionality`, 'CRITICAL');
            }
        }
    }

    async testCheckoutPage() {
        const response = await fetch(`${BASE_URL}/pages/checkout.html`);
        if (!response.ok) throw new Error(`Checkout page returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'checkout');
        this.validateFormStructure(html, ['address', 'payment'], 'checkout');
    }

    async testMyOrdersPage() {
        const response = await fetch(`${BASE_URL}/pages/my-orders.html`);
        if (!response.ok) throw new Error(`My Orders page returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'my-orders');
    }

    async testReviewsPage() {
        const response = await fetch(`${BASE_URL}/pages/reviews.html`);
        if (!response.ok) throw new Error(`Reviews page returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'reviews');
    }

    async testWishlistPage() {
        const response = await fetch(`${BASE_URL}/pages/wishlist.html`);
        if (!response.ok) throw new Error(`Wishlist page returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'wishlist');
    }

    async testAdminPage() {
        const response = await fetch(`${BASE_URL}/pages/admin.html`);
        if (!response.ok) throw new Error(`Admin page returned ${response.status}`);
        
        const html = await response.text();
        this.validatePageStructure(html, 'admin');
    }

    async testCSSFiles() {
        const cssFiles = ['/css/style.css', '/css/themes.css'];

        for (const cssFile of cssFiles) {
            const response = await fetch(`${BASE_URL}${cssFile}`);
            if (!response.ok) {
                throw new Error(`CSS file ${cssFile} returned ${response.status}`);
            }

            const css = await response.text();
            if (css.length < 100) {
                this.addBug('CSS_LOADING', `CSS file ${cssFile} suspiciously small`, 'MAJOR');
            }
        }
    }

    async testJavaScriptFiles() {
        const jsFiles = [
            '/js/api.js',
            '/js/auth.js',
            '/js/cart.js',
            '/js/store.js',
            '/js/theme.js',
            '/js/utils.js'
        ];

        for (const jsFile of jsFiles) {
            const response = await fetch(`${BASE_URL}${jsFile}`);
            if (!response.ok) {
                throw new Error(`JavaScript file ${jsFile} returned ${response.status}`);
            }

            const js = await response.text();
            if (js.length < 50) {
                this.addBug('JS_LOADING', `JavaScript file ${jsFile} suspiciously small`, 'MAJOR');
            }
        }
    }

    validatePageStructure(html, pageName) {
        // Basic HTML structure validation
        if (!html.includes('<html') && !html.includes('<!DOCTYPE')) {
            throw new Error(`Invalid HTML structure for ${pageName}`);
        }

        // Check for essential elements
        const essentialElements = ['<head>', '<body>', '<title>'];
        for (const element of essentialElements) {
            if (!html.includes(element)) {
                this.addBug('PAGE_STRUCTURE', `${pageName} missing ${element}`, 'CRITICAL');
            }
        }

        // Check for JavaScript includes
        if (!html.includes('.js')) {
            this.addBug('PAGE_STRUCTURE', `${pageName} has no JavaScript files linked`, 'MAJOR');
        }

        // Check for CSS includes
        if (!html.includes('.css')) {
            this.addBug('PAGE_STRUCTURE', `${pageName} has no CSS files linked`, 'MAJOR');
        }
    }

    validateFormStructure(html, requiredFields, pageName) {
        if (!html.includes('<form')) {
            this.addBug('FORM_STRUCTURE', `${pageName} missing form element`, 'CRITICAL');
            return;
        }

        for (const field of requiredFields) {
            if (!html.toLowerCase().includes(field.toLowerCase())) {
                this.addBug('FORM_STRUCTURE', `${pageName} form missing ${field} field`, 'CRITICAL');
            }
        }

        // Check for submit button
        if (!html.includes('type="submit"') && !html.includes('button')) {
            this.addBug('FORM_STRUCTURE', `${pageName} form missing submit button`, 'CRITICAL');
        }
    }

    // ============================================================================
    // JAVASCRIPT FUNCTIONALITY TESTS
    // ============================================================================

    async runJavaScriptFunctionalityTests() {
        console.log('\n⚡ PHASE 3: JAVASCRIPT FUNCTIONALITY TESTS');

        const jsTests = [
            { name: 'Manager Class Structures', fn: () => this.testManagerClasses() },
            { name: 'API Client Functionality', fn: () => this.testAPIClient() },
            { name: 'Authentication Manager', fn: () => this.testAuthManager() },
            { name: 'Cart Manager', fn: () => this.testCartManager() },
            { name: 'Store Manager', fn: () => this.testStoreManager() },
            { name: 'Theme Manager Structure', fn: () => this.testThemeManagerStructure() },
            { name: 'Event Listeners Setup', fn: () => this.testEventListeners() },
            { name: 'Component Dependencies', fn: () => this.testComponentDependencies() }
        ];

        await this.runTestSuite('javascript', jsTests);
    }

    async testManagerClasses() {
        const managers = [
            { file: '/js/auth.js', className: 'AuthManager', globalName: 'authManager' },
            { file: '/js/cart.js', className: 'CartManager', globalName: 'cartManager' },
            { file: '/js/store.js', className: 'StoreManager', globalName: 'storeManager' },
            { file: '/js/theme.js', className: 'ThemeManager', globalName: 'themeManager' }
        ];

        for (const manager of managers) {
            try {
                const response = await fetch(`${BASE_URL}${manager.file}`);
                if (!response.ok) continue;

                const js = await response.text();

                // Check class definition
                if (!js.includes(`class ${manager.className}`)) {
                    this.addBug('JS_STRUCTURE', `${manager.file} missing ${manager.className} class definition`, 'CRITICAL');
                }

                // Check global assignment
                if (!js.includes(`window.${manager.globalName}`)) {
                    this.addBug('JS_STRUCTURE', `${manager.file} not properly assigned to window.${manager.globalName}`, 'MAJOR');
                }

                // Check for modern event listeners
                const hasModernEvents = js.includes('addEventListener');
                if (!hasModernEvents && js.includes('onclick')) {
                    this.addBug('JS_MODERNIZATION', `${manager.className} uses onclick instead of addEventListener`, 'MINOR');
                }

            } catch (error) {
                this.addBug('JS_STRUCTURE', `Error testing ${manager.className}: ${error.message}`, 'MAJOR');
            }
        }
    }

    async testAPIClient() {
        const response = await fetch(`${BASE_URL}/js/api.js`);
        if (!response.ok) throw new Error('API client file not accessible');

        const js = await response.text();

        // Check for essential API methods
        const requiredMethods = [
            'getProducts',
            'getCart',
            'createOrder',
            'login',
            'register'
        ];

        for (const method of requiredMethods) {
            if (!js.includes(method)) {
                this.addBug('API_CLIENT', `API client missing ${method} method`, 'CRITICAL');
            }
        }

        // Check for proper fetch usage
        if (!js.includes('fetch(')) {
            this.addBug('API_CLIENT', 'API client not using fetch for HTTP requests', 'MAJOR');
        }
    }

    async testAuthManager() {
        const response = await fetch(`${BASE_URL}/js/auth.js`);
        if (!response.ok) throw new Error('Auth manager file not accessible');

        const js = await response.text();

        const authMethods = [
            'login',
            'logout',
            'isAuthenticated',
            'getCurrentUser'
        ];

        for (const method of authMethods) {
            if (!js.includes(method)) {
                this.addBug('AUTH_MANAGER', `AuthManager missing ${method} method`, 'CRITICAL');
            }
        }
    }

    async testCartManager() {
        const response = await fetch(`${BASE_URL}/js/cart.js`);
        if (!response.ok) throw new Error('Cart manager file not accessible');

        const js = await response.text();

        const cartMethods = [
            'addToCart',
            'removeFromCart',
            'updateQuantity',
            'clearCart',
            'loadCart'
        ];

        for (const method of cartMethods) {
            if (!js.includes(method)) {
                this.addBug('CART_MANAGER', `CartManager missing ${method} method`, 'CRITICAL');
            }
        }
    }

    async testStoreManager() {
        const response = await fetch(`${BASE_URL}/js/store.js`);
        if (!response.ok) throw new Error('Store manager file not accessible');

        const js = await response.text();

        const storeMethods = [
            'loadProducts',
            'filterProducts',
            'searchProducts'
        ];

        for (const method of storeMethods) {
            if (!js.includes(method)) {
                this.addBug('STORE_MANAGER', `StoreManager missing ${method} method`, 'MAJOR');
            }
        }
    }

    async testThemeManagerStructure() {
        const response = await fetch(`${BASE_URL}/js/theme.js`);
        if (!response.ok) throw new Error('Theme manager file not accessible');

        const js = await response.text();

        const themeMethods = [
            'setTheme',
            'getTheme',
            'toggleTheme'
        ];

        for (const method of themeMethods) {
            if (!js.includes(method)) {
                this.addBug('THEME_MANAGER', `ThemeManager missing ${method} method`, 'MAJOR');
            }
        }

        // Check for localStorage usage
        if (!js.includes('localStorage')) {
            this.addBug('THEME_MANAGER', 'ThemeManager not using localStorage for persistence', 'MAJOR');
        }
    }

    async testEventListeners() {
        const jsFiles = ['/js/auth.js', '/js/cart.js', '/js/store.js', '/js/theme.js'];

        for (const file of jsFiles) {
            try {
                const response = await fetch(`${BASE_URL}${file}`);
                if (!response.ok) continue;

                const js = await response.text();

                // Check for modern event handling
                if (!js.includes('addEventListener')) {
                    this.addBug('EVENT_HANDLING', `${file} not using addEventListener`, 'MINOR');
                }

                // Check for DOMContentLoaded
                if (!js.includes('DOMContentLoaded')) {
                    this.addBug('EVENT_HANDLING', `${file} not waiting for DOMContentLoaded`, 'MAJOR');
                }

            } catch (error) {
                this.addBug('EVENT_HANDLING', `Error testing event listeners in ${file}: ${error.message}`, 'MAJOR');
            }
        }
    }

    async testComponentDependencies() {
        // Test that components wait for each other properly
        const authJs = await fetch(`${BASE_URL}/js/auth.js`).then(r => r.text()).catch(() => '');
        const cartJs = await fetch(`${BASE_URL}/js/cart.js`).then(r => r.text()).catch(() => '');

        // Cart should wait for auth manager
        if (cartJs.includes('window.authManager') && !cartJs.includes('waitFor')) {
            this.addBug('COMPONENT_DEPS', 'Cart manager may not properly wait for auth manager', 'MAJOR');
        }

        // Check for race condition protection
        if (!cartJs.includes('async') && cartJs.includes('window.authManager')) {
            this.addBug('COMPONENT_DEPS', 'Cart manager may have race condition with auth manager', 'MAJOR');
        }
    }

    // ============================================================================
    // USER INTERACTION TESTS
    // ============================================================================

    async runUserInteractionTests() {
        console.log('\n👆 PHASE 4: USER INTERACTION TESTS');

        const interactionTests = [
            { name: 'Store Page Product Interactions', fn: () => this.testStoreInteractions() },
            { name: 'Authentication Form Interactions', fn: () => this.testAuthFormInteractions() },
            { name: 'Cart Page Interactions', fn: () => this.testCartInteractions() },
            { name: 'Search Functionality', fn: () => this.testSearchFunctionality() },
            { name: 'Form Validation', fn: () => this.testFormValidation() },
            { name: 'Navigation Flow', fn: () => this.testNavigationFlow() }
        ];

        await this.runTestSuite('interactions', interactionTests);
    }

    async testStoreInteractions() {
        const response = await fetch(`${BASE_URL}/pages/store.html`);
        if (!response.ok) throw new Error('Store page not accessible');

        const html = await response.text();

        // Check for product interaction elements
        const interactionElements = [
            'add-to-cart',
            'product-card',
            'view-details',
            'price'
        ];

        for (const element of interactionElements) {
            if (!html.toLowerCase().includes(element.toLowerCase())) {
                this.addBug('STORE_INTERACTIONS', `Store page missing ${element} interaction`, 'MAJOR');
            }
        }
    }

    async testAuthFormInteractions() {
        const pages = [
            { url: '/pages/login.html', name: 'login' },
            { url: '/pages/register.html', name: 'register' }
        ];

        for (const page of pages) {
            const response = await fetch(`${BASE_URL}${page.url}`);
            if (!response.ok) continue;

            const html = await response.text();

            // Check for form submission handling
            if (!html.includes('onsubmit') && !html.includes('addEventListener') && !html.includes('submit')) {
                this.addBug('FORM_INTERACTIONS', `${page.name} form may not handle submission`, 'CRITICAL');
            }
        }
    }

    async testCartInteractions() {
        const response = await fetch(`${BASE_URL}/pages/cart.html`);
        if (!response.ok) throw new Error('Cart page not accessible');

        const html = await response.text();

        // Check for cart-specific interactions
        const cartInteractions = [
            'quantity',
            'remove',
            'update',
            'checkout',
            'total'
        ];

        for (const interaction of cartInteractions) {
            if (!html.toLowerCase().includes(interaction.toLowerCase())) {
                this.addBug('CART_INTERACTIONS', `Cart page missing ${interaction} interaction`, 'CRITICAL');
            }
        }
    }

    async testSearchFunctionality() {
        const response = await fetch(`${BASE_URL}/pages/store.html`);
        if (!response.ok) throw new Error('Store page not accessible for search test');

        const html = await response.text();

        // Check for search elements
        if (!html.includes('search') && !html.includes('input')) {
            this.addBug('SEARCH_FUNCTIONALITY', 'No search functionality found on store page', 'MAJOR');
        }

        // Test search API endpoint
        try {
            const searchResponse = await fetch(`${BASE_URL}/api/products?search=coffee`);
            if (!searchResponse.ok) {
                this.addBug('SEARCH_FUNCTIONALITY', 'Search API endpoint not working', 'CRITICAL');
            }
        } catch (error) {
            this.addBug('SEARCH_FUNCTIONALITY', `Search API test failed: ${error.message}`, 'CRITICAL');
        }
    }

    async testFormValidation() {
        const pages = [
            { url: '/pages/login.html', name: 'login', requiredFields: ['username', 'password'] },
            { url: '/pages/register.html', name: 'register', requiredFields: ['username', 'email', 'password'] },
            { url: '/pages/checkout.html', name: 'checkout', requiredFields: ['address', 'payment'] }
        ];

        for (const page of pages) {
            try {
                const response = await fetch(`${BASE_URL}${page.url}`);
                if (!response.ok) continue;

                const html = await response.text();

                // Check for HTML5 validation attributes
                const hasValidation = html.includes('required') || 
                                    html.includes('pattern') || 
                                    html.includes('minlength') ||
                                    html.includes('maxlength');

                if (!hasValidation) {
                    this.addBug('FORM_VALIDATION', `${page.name} form lacks HTML5 validation attributes`, 'MAJOR');
                }

            } catch (error) {
                this.addBug('FORM_VALIDATION', `Form validation test failed for ${page.name}: ${error.message}`, 'MAJOR');
            }
        }
    }

    async testNavigationFlow() {
        const mainPages = [
            '/',
            '/pages/store.html',
            '/pages/login.html',
            '/pages/cart.html'
        ];

        for (const page of mainPages) {
            try {
                const response = await fetch(`${BASE_URL}${page}`);
                if (!response.ok) {
                    this.addBug('NAVIGATION', `Navigation target ${page} not accessible`, 'CRITICAL');
                    continue;
                }

                const html = await response.text();

                // Check for navigation menu
                if (!html.includes('<nav') && !html.includes('navigation')) {
                    this.addBug('NAVIGATION', `Page ${page} missing navigation structure`, 'MAJOR');
                }

            } catch (error) {
                this.addBug('NAVIGATION', `Navigation test failed for ${page}: ${error.message}`, 'MAJOR');
            }
        }
    }

    // ============================================================================
    // THEME SYSTEM TESTS
    // ============================================================================

    async runThemeSystemTests() {
        console.log('\n🎨 PHASE 5: THEME SYSTEM TESTS');

        const themeTests = [
            { name: 'Theme Manager Functionality', fn: () => this.testThemeManager() },
            { name: 'Theme CSS Loading', fn: () => this.testThemeCSS() },
            { name: 'Theme Persistence', fn: () => this.testThemePersistence() },
            { name: 'CSS Variables Usage', fn: () => this.testCSSVariables() }
        ];

        await this.runTestSuite('themes', themeTests);
    }

    async testThemeManager() {
        const response = await fetch(`${BASE_URL}/js/theme.js`);
        if (!response.ok) throw new Error('Theme manager not accessible');

        const js = await response.text();

        // Check for theme manager class
        if (!js.includes('class ThemeManager')) {
            throw new Error('ThemeManager class not found');
        }

        // Check for essential theme methods
        const requiredMethods = [
            'setTheme',
            'getCurrentTheme',
            'toggleTheme'
        ];

        for (const method of requiredMethods) {
            if (!js.includes(method)) {
                this.addBug('THEME_MANAGER', `ThemeManager missing ${method} method`, 'MAJOR');
            }
        }

        // Check for proper global assignment
        if (!js.includes('window.themeManager')) {
            this.addBug('THEME_MANAGER', 'ThemeManager not assigned to window.themeManager', 'CRITICAL');
        }
    }

    async testThemeCSS() {
        const response = await fetch(`${BASE_URL}/css/themes.css`);
        if (!response.ok) throw new Error('Theme CSS file not accessible');

        const css = await response.text();

        // Check for required themes
        const requiredThemes = ['light', 'dark', 'coffee', 'sepia'];

        for (const theme of requiredThemes) {
            if (!css.toLowerCase().includes(theme.toLowerCase())) {
                this.addBug('THEME_CSS', `Theme CSS missing ${theme} theme`, 'MAJOR');
            }
        }

        // Check for CSS custom properties (variables)
        if (!css.includes('--')) {
            this.addBug('THEME_CSS', 'Theme CSS not using CSS custom properties', 'MAJOR');
        }
    }

    async testThemePersistence() {
        const response = await fetch(`${BASE_URL}/js/theme.js`);
        if (!response.ok) throw new Error('Theme manager not accessible');

        const js = await response.text();

        // Check for localStorage usage
        if (!js.includes('localStorage')) {
            this.addBug('THEME_PERSISTENCE', 'Theme manager not using localStorage for persistence', 'CRITICAL');
        }

        // Check for theme restoration on page load
        if (!js.includes('getItem') || !js.includes('setItem')) {
            this.addBug('THEME_PERSISTENCE', 'Theme manager missing localStorage read/write operations', 'MAJOR');
        }
    }

    async testCSSVariables() {
        const response = await fetch(`${BASE_URL}/css/themes.css`);
        if (!response.ok) throw new Error('Theme CSS not accessible');

        const css = await response.text();

        // Check for CSS custom properties usage
        if (!css.includes('--')) {
            this.addBug('CSS_VARIABLES', 'Theme system not using CSS custom properties', 'MAJOR');
        }

        // Check for root-level variable definitions
        if (!css.includes(':root')) {
            this.addBug('CSS_VARIABLES', 'Theme CSS missing root-level variable definitions', 'MAJOR');
        }
    }

    // ============================================================================
    // ACCESSIBILITY TESTS
    // ============================================================================

    async runAccessibilityTests() {
        console.log('\n♿ PHASE 6: ACCESSIBILITY TESTS');

        const accessibilityTests = [
            { name: 'ARIA Labels and Roles', fn: () => this.testARIALabels() },
            { name: 'Alt Text for Images', fn: () => this.testImageAltText() },
            { name: 'Form Label Associations', fn: () => this.testFormLabels() },
            { name: 'Heading Structure', fn: () => this.testHeadingStructure() },
            { name: 'Keyboard Navigation Support', fn: () => this.testKeyboardSupport() }
        ];

        await this.runTestSuite('accessibility', accessibilityTests);
    }

    async testARIALabels() {
        const pages = ['/pages/store.html', '/pages/cart.html', '/pages/admin.html'];

        let foundARIA = false;
        for (const page of pages) {
            try {
                const response = await fetch(`${BASE_URL}${page}`);
                if (!response.ok) continue;

                const html = await response.text();

                if (html.includes('aria-label') || html.includes('aria-') || html.includes('role=')) {
                    foundARIA = true;
                    break;
                }
            } catch (error) {
                this.addBug('ARIA_LABELS', `ARIA test failed for ${page}: ${error.message}`, 'MINOR');
            }
        }

        if (!foundARIA) {
            this.addBug('ARIA_LABELS', 'No ARIA labels or roles found across main pages', 'MAJOR');
        }
    }

    async testImageAltText() {
        const pages = ['/pages/store.html', '/pages/cart.html'];

        for (const page of pages) {
            try {
                const response = await fetch(`${BASE_URL}${page}`);
                if (!response.ok) continue;

                const html = await response.text();

                // Check for images
                const imageRegex = /<img[^>]*>/gi;
                const images = html.match(imageRegex) || [];

                let imagesWithoutAlt = 0;
                for (const img of images) {
                    if (!img.includes('alt=') || img.includes('alt=""')) {
                        imagesWithoutAlt++;
                    }
                }

                if (imagesWithoutAlt > 0) {
                    this.addBug('IMAGE_ALT', `${page} has ${imagesWithoutAlt} images without alt text`, 'MAJOR');
                }

            } catch (error) {
                this.addBug('IMAGE_ALT', `Image alt text test failed for ${page}: ${error.message}`, 'MINOR');
            }
        }
    }

    async testFormLabels() {
        const formPages = ['/pages/login.html', '/pages/register.html', '/pages/checkout.html'];

        for (const page of formPages) {
            try {
                const response = await fetch(`${BASE_URL}${page}`);
                if (!response.ok) continue;

                const html = await response.text();

                // Check for form inputs
                const inputRegex = /<input[^>]*>/gi;
                const inputs = html.match(inputRegex) || [];

                let inputsWithoutLabels = 0;
                for (const input of inputs) {
                    // Check if input has associated label
                    const hasLabel = html.includes('for=') || 
                                   input.includes('aria-label') ||
                                   input.includes('placeholder') ||
                                   html.includes('<label');

                    if (!hasLabel) {
                        inputsWithoutLabels++;
                    }
                }

                if (inputsWithoutLabels > 0) {
                    this.addBug('FORM_LABELS', `${page} has ${inputsWithoutLabels} inputs without proper labels`, 'MAJOR');
                }

            } catch (error) {
                this.addBug('FORM_LABELS', `Form label test failed for ${page}: ${error.message}`, 'MINOR');
            }
        }
    }

    async testHeadingStructure() {
        const pages = ['/', '/pages/store.html', '/pages/admin.html'];

        for (const page of pages) {
            try {
                const response = await fetch(`${BASE_URL}${page}`);
                if (!response.ok) continue;

                const html = await response.text();

                // Check for heading hierarchy
                const hasH1 = html.includes('<h1');
                if (!hasH1 && !html.includes('<h2')) {
                    this.addBug('HEADING_STRUCTURE', `${page} lacks proper heading structure`, 'MAJOR');
                }

                // Check for multiple h1 tags (should only have one per page)
                const h1Count = (html.match(/<h1/g) || []).length;
                if (h1Count > 1) {
                    this.addBug('HEADING_STRUCTURE', `${page} has ${h1Count} h1 tags (should have only one)`, 'MINOR');
                }

            } catch (error) {
                this.addBug('HEADING_STRUCTURE', `Heading structure test failed for ${page}: ${error.message}`, 'MINOR');
            }
        }
    }

    async testKeyboardSupport() {
        const pages = ['/pages/store.html', '/pages/login.html', '/pages/cart.html'];

        for (const page of pages) {
            try {
                const response = await fetch(`${BASE_URL}${page}`);
                if (!response.ok) continue;

                const html = await response.text();

                // Check for keyboard-accessible elements
                const hasKeyboardElements = html.includes('<button') || 
                                          html.includes('<input') ||
                                          html.includes('tabindex') ||
                                          html.includes('<a ');

                if (!hasKeyboardElements) {
                    this.addBug('KEYBOARD_SUPPORT', `${page} lacks keyboard-accessible elements`, 'MAJOR');
                }

            } catch (error) {
                this.addBug('KEYBOARD_SUPPORT', `Keyboard support test failed for ${page}: ${error.message}`, 'MINOR');
            }
        }
    }

    // ============================================================================
    // RESPONSIVE DESIGN TESTS
    // ============================================================================

    async runResponsiveDesignTests() {
        console.log('\n📱 PHASE 7: RESPONSIVE DESIGN TESTS');

        const responsiveTests = [
            { name: 'CSS Media Queries', fn: () => this.testMediaQueries() },
            { name: 'Viewport Meta Tag', fn: () => this.testViewportMeta() },
            { name: 'Flexible Grid System', fn: () => this.testFlexibleGrid() },
            { name: 'Mobile-First Design', fn: () => this.testMobileFirst() }
        ];

        await this.runTestSuite('responsive', responsiveTests);
    }

    async testMediaQueries() {
        const cssFiles = ['/css/style.css', '/css/themes.css'];

        let foundMediaQueries = false;
        for (const cssFile of cssFiles) {
            try {
                const response = await fetch(`${BASE_URL}${cssFile}`);
                if (!response.ok) continue;

                const css = await response.text();

                if (css.includes('@media')) {
                    foundMediaQueries = true;
                    
                    // Check for common breakpoints
                    const commonBreakpoints = ['768px', '1024px', '480px', 'max-width', 'min-width'];
                    let foundBreakpoints = 0;

                    for (const breakpoint of commonBreakpoints) {
                        if (css.includes(breakpoint)) {
                            foundBreakpoints++;
                        }
                    }

                    if (foundBreakpoints < 3) {
                        this.addBug('MEDIA_QUERIES', `${cssFile} has limited responsive breakpoints`, 'MAJOR');
                    }
                }
            } catch (error) {
                this.addBug('MEDIA_QUERIES', `Media query test failed for ${cssFile}: ${error.message}`, 'MINOR');
            }
        }

        if (!foundMediaQueries) {
            this.addBug('MEDIA_QUERIES', 'No media queries found in CSS files', 'CRITICAL');
        }
    }

    async testViewportMeta() {
        const pages = ['/', '/pages/store.html', '/pages/cart.html'];

        for (const page of pages) {
            try {
                const response = await fetch(`${BASE_URL}${page}`);
                if (!response.ok) continue;

                const html = await response.text();

                if (!html.includes('viewport') || !html.includes('width=device-width')) {
                    this.addBug('VIEWPORT_META', `${page} lacks proper viewport meta tag`, 'CRITICAL');
                }

            } catch (error) {
                this.addBug('VIEWPORT_META', `Viewport meta test failed for ${page}: ${error.message}`, 'MINOR');
            }
        }
    }

    async testFlexibleGrid() {
        const response = await fetch(`${BASE_URL}/css/style.css`);
        if (!response.ok) {
            this.addBug('FLEXIBLE_GRID', 'Cannot test grid system - main CSS not accessible', 'MAJOR');
            return;
        }

        const css = await response.text();

        // Check for flexible layout systems
        const layoutSystems = ['flexbox', 'flex', 'grid', 'display: flex', 'display: grid'];
        let foundLayoutSystem = false;

        for (const system of layoutSystems) {
            if (css.includes(system)) {
                foundLayoutSystem = true;
                break;
            }
        }

        if (!foundLayoutSystem) {
            this.addBug('FLEXIBLE_GRID', 'CSS lacks modern flexible layout systems', 'MAJOR');
        }
    }

    async testMobileFirst() {
        const response = await fetch(`${BASE_URL}/css/style.css`);
        if (!response.ok) {
            this.addBug('MOBILE_FIRST', 'Cannot test mobile-first approach - main CSS not accessible', 'MINOR');
            return;
        }

        const css = await response.text();

        // Check for mobile-first approach (min-width queries)
        const minWidthQueries = (css.match(/min-width/g) || []).length;
        const maxWidthQueries = (css.match(/max-width/g) || []).length;

        if (maxWidthQueries > minWidthQueries && minWidthQueries === 0) {
            this.addBug('MOBILE_FIRST', 'CSS appears to use desktop-first approach instead of mobile-first', 'MINOR');
        }
    }

    // ============================================================================
    // FRONTEND INTEGRATION TESTS
    // ============================================================================

    async runFrontendIntegrationTests() {
        console.log('\n🔄 PHASE 8: FRONTEND INTEGRATION TESTS');

        const integrationTests = [
            { name: 'Frontend-Backend API Integration', fn: () => this.testFrontendAPIIntegration() },
            { name: 'User Authentication Flow', fn: () => this.testAuthenticationIntegration() },
            { name: 'Shopping Cart Integration', fn: () => this.testCartIntegration() },
            { name: 'Real User Workflow Simulation', fn: () => this.testRealUserWorkflow() }
        ];

        await this.runTestSuite('integration', integrationTests);
    }

    async testFrontendAPIIntegration() {
        // Test that all frontend pages have access to required APIs
        const criticalAPIs = [
            { path: '/api/health', description: 'Health check' },
            { path: '/api/products', description: 'Product catalog' },
            { path: '/api/loyalty/rewards', description: 'Loyalty rewards' },
            { path: '/api/support/faq', description: 'Support FAQ' }
        ];

        for (const api of criticalAPIs) {
            try {
                const response = await fetch(`${BASE_URL}${api.path}`);
                if (!response.ok) {
                    this.addBug('FRONTEND_API', `Frontend requires ${api.description} API but it returns ${response.status}`, 'CRITICAL');
                }
            } catch (error) {
                this.addBug('FRONTEND_API', `Frontend API integration failed for ${api.description}: ${error.message}`, 'CRITICAL');
            }
        }
    }

    async testAuthenticationIntegration() {
        if (!this.testUser || !this.userSession) {
            this.addBug('AUTH_INTEGRATION', 'Cannot test authentication integration - no test user session', 'MAJOR');
            return;
        }

        // Test protected API access with user session
        const protectedEndpoints = [
            `/api/cart/${this.testUser.id}`,
            `/api/orders/${this.testUser.id}`,
            `/api/wishlist/${this.testUser.id}`
        ];

        for (const endpoint of protectedEndpoints) {
            try {
                const response = await fetch(`${BASE_URL}${endpoint}`, {
                    headers: { 'Cookie': this.userSession.cookies }
                });

                if (!response.ok && response.status !== 404) {
                    this.addBug('AUTH_INTEGRATION', `Protected endpoint ${endpoint} not working with user session: ${response.status}`, 'CRITICAL');
                }
            } catch (error) {
                this.addBug('AUTH_INTEGRATION', `Authentication integration test failed for ${endpoint}: ${error.message}`, 'CRITICAL');
            }
        }
    }

    async testCartIntegration() {
        if (!this.testUser || !this.userSession || !this.testData.products) {
            this.addBug('CART_INTEGRATION', 'Cannot test cart integration - missing prerequisites', 'MAJOR');
            return;
        }

        try {
            // Test add to cart
            const product = this.testData.products[0];
            const addResponse = await fetch(`${BASE_URL}/api/cart/${this.testUser.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this.userSession.cookies
                },
                body: JSON.stringify({
                    items: [{
                        productId: product.id,
                        quantity: 1,
                        price: product.price,
                        title: product.title
                    }]
                })
            });

            if (!addResponse.ok) {
                this.addBug('CART_INTEGRATION', `Cart add operation failed: ${addResponse.status}`, 'CRITICAL');
                return;
            }

            // Test get cart
            const getResponse = await fetch(`${BASE_URL}/api/cart/${this.testUser.id}`, {
                headers: { 'Cookie': this.userSession.cookies }
            });

            if (!getResponse.ok) {
                this.addBug('CART_INTEGRATION', `Cart retrieval failed: ${getResponse.status}`, 'CRITICAL');
            }

        } catch (error) {
            this.addBug('CART_INTEGRATION', `Cart integration test failed: ${error.message}`, 'CRITICAL');
        }
    }

    async testRealUserWorkflow() {
        if (!this.testUser || !this.userSession || !this.testData.products) {
            this.addBug('USER_WORKFLOW', 'Cannot test real user workflow - missing prerequisites', 'MAJOR');
            return;
        }

        try {
            console.log('   Simulating user workflow...');

            // Step 2: Add product to cart
            const product = this.testData.products[0];
            const cartResponse = await fetch(`${BASE_URL}/api/cart/${this.testUser.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this.userSession.cookies
                },
                body: JSON.stringify({
                    items: [{
                        productId: product.id,
                        quantity: 1,
                        price: product.price,
                        title: product.title
                    }]
                })
            });

            if (!cartResponse.ok) {
                throw new Error(`Add to cart failed: ${cartResponse.status}`);
            }

            // Step 3: View cart
            const viewCartResponse = await fetch(`${BASE_URL}/api/cart/${this.testUser.id}`, {
                headers: { 'Cookie': this.userSession.cookies }
            });

            if (!viewCartResponse.ok) {
                throw new Error(`View cart failed: ${viewCartResponse.status}`);
            }

            const cartData = await viewCartResponse.json();
            if (!cartData.success || !cartData.data.items || cartData.data.items.length === 0) {
                throw new Error('Cart data inconsistent after add operation');
            }

            console.log('   ✅ Real user workflow simulation completed successfully');

        } catch (error) {
            this.addBug('USER_WORKFLOW', `Real user workflow simulation failed: ${error.message}`, 'CRITICAL');
        }
    }

    // ============================================================================
    // TEST EXECUTION FRAMEWORK
    // ============================================================================

    async runTestSuite(category, tests) {
        console.log(`Running ${tests.length} ${category} tests...`);

        for (const test of tests) {
            try {
                console.log(`   Testing: ${test.name}...`);
                const startTime = Date.now();
                
                await Promise.race([
                    test.fn(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), TEST_TIMEOUT)
                    )
                ]);

                const duration = Date.now() - startTime;
                console.log(`   ✅ PASSED (${duration}ms): ${test.name}`);
                
                this.results[category].passed++;
                this.results[category].tests.push({
                    name: test.name,
                    status: 'PASSED',
                    duration,
                    error: null
                });

            } catch (error) {
                const duration = Date.now() - startTime;
                console.log(`   ❌ FAILED: ${test.name} - ${error.message}`);
                
                this.results[category].failed++;
                this.results[category].tests.push({
                    name: test.name,
                    status: 'FAILED',
                    duration,
                    error: error.message
                });

                this.addBug(category.toUpperCase(), `${test.name}: ${error.message}`, 
                    error.message.includes('timeout') ? 'MAJOR' : 
                    error.message.includes('not accessible') ? 'CRITICAL' : 'MAJOR');
            }
        }
    }

    // ============================================================================
    // BUG TRACKING & REPORTING
    // ============================================================================

    addBug(category, description, severity, location = '', element = '') {
        this.bugs.push({
            id: `FRONTEND-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
    // COMPREHENSIVE REPORTING
    // ============================================================================

    async generateComprehensiveReport() {
        const totalTests = Object.values(this.results).reduce((sum, cat) => sum + cat.passed + cat.failed, 0);
        const totalPassed = Object.values(this.results).reduce((sum, cat) => sum + cat.passed, 0);
        const totalFailed = Object.values(this.results).reduce((sum, cat) => sum + cat.failed, 0);
        const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
        
        const duration = Date.now() - this.startTime;
        const durationMinutes = Math.floor(duration / 60000);
        const durationSeconds = Math.floor((duration % 60000) / 1000);

        const criticalBugs = this.bugs.filter(bug => bug.severity === 'CRITICAL');
        const majorBugs = this.bugs.filter(bug => bug.severity === 'MAJOR');
        const minorBugs = this.bugs.filter(bug => bug.severity === 'MINOR');

        const reportContent = `# 🎨 RUNI 2025 Coffee Shop - COMPREHENSIVE FRONTEND TEST REPORT

**Generated:** ${new Date().toISOString()}
**Test Duration:** ${durationMinutes}m ${durationSeconds}s
**Test Focus:** Frontend Pages, JavaScript, UI/UX, Interactions
**Total Tests:** ${totalTests}
**Success Rate:** ${successRate}%

---

## 📊 **OVERALL FRONTEND TEST RESULTS**

### **Summary Statistics**
- ✅ **Tests Passed**: ${totalPassed}
- ❌ **Tests Failed**: ${totalFailed}  
- 🐛 **Frontend Bugs Found**: ${this.bugs.length}
- ⏱️ **Duration**: ${durationMinutes}m ${durationSeconds}s

### **Category Breakdown**
| Category | Passed | Failed | Success Rate | Focus Area |
|----------|--------|--------|--------------|------------|
| Page Loading | ${this.results.pageLoading.passed} | ${this.results.pageLoading.failed} | ${this.results.pageLoading.passed + this.results.pageLoading.failed > 0 ? ((this.results.pageLoading.passed / (this.results.pageLoading.passed + this.results.pageLoading.failed)) * 100).toFixed(1) : 0}% | HTML structure, assets, performance |
| JavaScript | ${this.results.javascript.passed} | ${this.results.javascript.failed} | ${this.results.javascript.passed + this.results.javascript.failed > 0 ? ((this.results.javascript.passed / (this.results.javascript.passed + this.results.javascript.failed)) * 100).toFixed(1) : 0}% | Managers, API client, event handling |
| Interactions | ${this.results.interactions.passed} | ${this.results.interactions.failed} | ${this.results.interactions.passed + this.results.interactions.failed > 0 ? ((this.results.interactions.passed / (this.results.interactions.passed + this.results.interactions.failed)) * 100).toFixed(1) : 0}% | User flows, forms, navigation |
| Theme System | ${this.results.themes.passed} | ${this.results.themes.failed} | ${this.results.themes.passed + this.results.themes.failed > 0 ? ((this.results.themes.passed / (this.results.themes.passed + this.results.themes.failed)) * 100).toFixed(1) : 0}% | Themes, localStorage, CSS variables |
| Accessibility | ${this.results.accessibility.passed} | ${this.results.accessibility.failed} | ${this.results.accessibility.passed + this.results.accessibility.failed > 0 ? ((this.results.accessibility.passed / (this.results.accessibility.passed + this.results.accessibility.failed)) * 100).toFixed(1) : 0}% | ARIA, keyboard nav, screen readers |
| Responsive | ${this.results.responsive.passed} | ${this.results.responsive.failed} | ${this.results.responsive.passed + this.results.responsive.failed > 0 ? ((this.results.responsive.passed / (this.results.responsive.passed + this.results.responsive.failed)) * 100).toFixed(1) : 0}% | Media queries, mobile-first, touch |
| Integration | ${this.results.integration.passed} | ${this.results.integration.failed} | ${this.results.integration.passed + this.results.integration.failed > 0 ? ((this.results.integration.passed / (this.results.integration.passed + this.results.integration.failed)) * 100).toFixed(1) : 0}% | Frontend-backend, workflows |

---

## 🎯 **FRONTEND PRODUCTION READINESS ASSESSMENT**

### **Critical Frontend Systems Status**
- **Page Loading & Structure**: ${this.results.pageLoading.tests.every(t => t.status === 'PASSED') ? '🟢 WORKING' : '🔴 ISSUES FOUND'}
- **JavaScript Functionality**: ${this.results.javascript.tests.filter(t => t.name.includes('Manager')).every(t => t.status === 'PASSED') ? '🟢 WORKING' : '🔴 ISSUES FOUND'}
- **User Interactions**: ${this.results.interactions.tests.filter(t => t.name.includes('Form') || t.name.includes('Navigation')).every(t => t.status === 'PASSED') ? '🟢 WORKING' : '🔴 ISSUES FOUND'}
- **Theme System**: ${this.results.themes.tests.filter(t => t.name.includes('Theme Manager')).every(t => t.status === 'PASSED') ? '🟢 WORKING' : '🔴 ISSUES FOUND'}
- **Frontend-Backend Integration**: ${this.results.integration.tests.filter(t => t.name.includes('API')).every(t => t.status === 'PASSED') ? '🟢 WORKING' : '🔴 ISSUES FOUND'}

### **Overall Frontend Verdict**
${criticalBugs.length === 0 && majorBugs.length < 5 && successRate >= 85 ? 
  '🎉 **FRONTEND PRODUCTION READY** - All critical frontend systems working properly' : 
  '⚠️ **FRONTEND NOT PRODUCTION READY** - Critical frontend issues require resolution'}

---

## 🚨 **CRITICAL FRONTEND ISSUES** (${criticalBugs.length})

${criticalBugs.length > 0 ? criticalBugs.map((bug, index) => `
### ${index + 1}. [${bug.id}] ${bug.category}
**Description:** ${bug.description}
**Location:** ${bug.location || 'Frontend System'}
**Impact:** Breaks essential frontend functionality
**Priority:** IMMEDIATE FIX REQUIRED
**Found:** ${bug.timestamp}
`).join('') : '✅ **NO CRITICAL FRONTEND ISSUES FOUND**'}

---

## 📋 **DETAILED FRONTEND TEST RESULTS**

### **Page Loading Tests** (${this.results.pageLoading.passed + this.results.pageLoading.failed} tests)
${this.results.pageLoading.tests.map(test => 
  `- ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name} (${test.duration}ms)${test.error ? ` - ${test.error}` : ''}`
).join('\\n')}

### **JavaScript Functionality Tests** (${this.results.javascript.passed + this.results.javascript.failed} tests)
${this.results.javascript.tests.map(test => 
  `- ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name} (${test.duration}ms)${test.error ? ` - ${test.error}` : ''}`
).join('\\n')}

### **Integration Tests** (${this.results.integration.passed + this.results.integration.failed} tests)
${this.results.integration.tests.map(test => 
  `- ${test.status === 'PASSED' ? '✅' : '❌'} ${test.name} (${test.duration}ms)${test.error ? ` - ${test.error}` : ''}`
).join('\\n')}

---

**Test Report Generated By:** RUNI 2025 Comprehensive Frontend Test Suite v1.0
**For:** Coffee Shop E-commerce Application - Frontend Components
**Date:** ${new Date().toISOString()}
**Status:** ${criticalBugs.length === 0 ? 'READY FOR FRONTEND DEPLOYMENT' : 'REQUIRES IMMEDIATE FRONTEND FIXES'}
`;

        try {
            await fs.writeFile('/home/adilind/coffee-shop-store/COMPREHENSIVE_FRONTEND_TEST_REPORT.md', reportContent);
            console.log('\\n📝 Comprehensive Frontend Test Report Generated: COMPREHENSIVE_FRONTEND_TEST_REPORT.md');
        } catch (error) {
            console.log('❌ Failed to generate comprehensive frontend report:', error.message);
        }
    }

    printFinalResults() {
        const totalTests = Object.values(this.results).reduce((sum, cat) => sum + cat.passed + cat.failed, 0);
        const totalPassed = Object.values(this.results).reduce((sum, cat) => sum + cat.passed, 0);
        const totalFailed = Object.values(this.results).reduce((sum, cat) => sum + cat.failed, 0);
        const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
        
        const duration = Date.now() - this.startTime;
        const durationMinutes = Math.floor(duration / 60000);
        const durationSeconds = Math.floor((duration % 60000) / 1000);

        const criticalBugs = this.bugs.filter(bug => bug.severity === 'CRITICAL');
        const majorBugs = this.bugs.filter(bug => bug.severity === 'MAJOR');

        console.log('\\n' + '=' .repeat(80));
        console.log('🏁 RUNI 2025 COFFEE SHOP - FINAL FRONTEND TEST RESULTS');
        console.log('=' .repeat(80));
        
        console.log(`\\n📊 FRONTEND SUMMARY:`);
        console.log(`   Total Frontend Tests: ${totalTests}`);
        console.log(`   Passed: ${totalPassed}`);
        console.log(`   Failed: ${totalFailed}`);
        console.log(`   Success Rate: ${successRate}%`);
        console.log(`   Duration: ${durationMinutes}m ${durationSeconds}s`);
        
        console.log(`\\n🐛 FRONTEND ISSUES FOUND:`);
        console.log(`   Critical: ${criticalBugs.length}`);
        console.log(`   Major: ${majorBugs.length}`);
        console.log(`   Total Frontend Bugs: ${this.bugs.length}`);
        
        console.log(`\\n📈 FRONTEND CATEGORY RESULTS:`);
        Object.entries(this.results).forEach(([category, result]) => {
            const categorySuccessRate = result.passed + result.failed > 0 ? 
                ((result.passed / (result.passed + result.failed)) * 100).toFixed(1) : '0';
            console.log(`   ${category.charAt(0).toUpperCase() + category.slice(1)}: ${result.passed}/${result.passed + result.failed} (${categorySuccessRate}%)`);
        });

        console.log(`\\n🎯 FRONTEND PRODUCTION READINESS:`);
        if (criticalBugs.length === 0 && majorBugs.length < 5 && successRate >= 85) {
            console.log('   🎉 FRONTEND PRODUCTION READY - Excellent quality standards met!');
        } else if (criticalBugs.length === 0 && successRate >= 75) {
            console.log('   🟡 FRONTEND NEARLY READY - Minor improvements recommended');
        } else {
            console.log('   ⚠️  FRONTEND NOT PRODUCTION READY - Critical issues require fixing');
        }

        console.log('\\n' + '=' .repeat(80));
        console.log(`🚀 RUNI 2025 Coffee Shop Frontend Testing Complete! (${successRate}% success rate)`);
        console.log('=' .repeat(80));
    }
}

// ============================================================================
// QUICK FRONTEND TEST RUNNER (For Development)
// ============================================================================

class QuickFrontendTestRunner extends ComprehensiveFrontendTester {
    async runQuickTests() {
        await initFetch();
        
        console.log('⚡ RUNI 2025 Coffee Shop - QUICK FRONTEND TEST SUITE');
        console.log('=' .repeat(60));
        
        await this.setupTestEnvironment();
        
        const quickTests = [
            { name: 'Homepage Loading', fn: () => this.testHomePage() },
            { name: 'Store Page Loading', fn: () => this.testStorePage() },
            { name: 'JavaScript Files', fn: () => this.testJavaScriptFiles() },
            { name: 'Manager Classes', fn: () => this.testManagerClasses() },
            { name: 'Theme System', fn: () => this.testThemeManager() },
            { name: 'CSS Files', fn: () => this.testCSSFiles() },
            { name: 'Frontend API Integration', fn: () => this.testFrontendAPIIntegration() },
            { name: 'Authentication Integration', fn: () => this.testAuthenticationIntegration() },
            { name: 'Responsive Meta Tags', fn: () => this.testViewportMeta() }
        ];

        console.log('\\n🧪 Running Essential Frontend Tests...');
        let passed = 0, failed = 0;
        
        for (const test of quickTests) {
            try {
                console.log(`Testing: ${test.name}...`);
                await test.fn();
                console.log(`✅ PASSED: ${test.name}`);
                passed++;
            } catch (error) {
                console.log(`❌ FAILED: ${test.name} - ${error.message}`);
                failed++;
            }
        }

        const total = passed + failed;
        const successRate = ((passed / total) * 100).toFixed(1);

        console.log('\\n' + '=' .repeat(60));
        console.log(`⚡ Quick Frontend Test Results: ${passed}/${total} (${successRate}%)`);
        console.log(successRate >= 80 ? '🎉 Frontend appears stable!' : '⚠️ Frontend issues detected, run full test suite');
        console.log('=' .repeat(60));

        return { passed, failed, successRate };
    }
}

// ============================================================================
// MODULE EXPORTS & EXECUTION
// ============================================================================

module.exports = { ComprehensiveFrontendTester, QuickFrontendTestRunner };

// Run tests if executed directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--quick')) {
        // Quick frontend test mode
        (async () => {
            const runner = new QuickFrontendTestRunner();
            const results = await runner.runQuickTests();
            process.exit(results.failed > 0 ? 1 : 0);
        })().catch(error => {
            console.error('💥 Quick frontend test execution failed:', error);
            process.exit(1);
        });
    } else {
        // Full comprehensive frontend test mode
        (async () => {
            const tester = new ComprehensiveFrontendTester();
            const results = await tester.runAllTests();
            const totalFailed = Object.values(results).reduce((sum, cat) => sum + cat.failed, 0);
            process.exit(totalFailed > 0 ? 1 : 0);
        })().catch(error => {
            console.error('💥 Comprehensive frontend test execution failed:', error);
            process.exit(1);
        });
    }
}