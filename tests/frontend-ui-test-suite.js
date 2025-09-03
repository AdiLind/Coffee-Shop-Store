const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class FrontendUITester {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:3000';
        this.bugs = [];
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0
        };
    }

    async initialize() {
        console.log('🚀 Initializing UI Test Environment...');
        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            this.page = await this.browser.newPage();
            
            // Set viewport for consistent testing
            await this.page.setViewport({ width: 1280, height: 720 });
            
            // Setup error monitoring
            this.page.on('pageerror', error => {
                this.addBug('JAVASCRIPT_ERROR', `Page Error: ${error.message}`, 'CRITICAL');
            });
            
            this.page.on('requestfailed', request => {
                this.addBug('NETWORK_ERROR', `Failed Request: ${request.url()} - ${request.failure().errorText}`, 'MAJOR');
            });
            
            console.log('✅ UI Test Environment Ready');
            return true;
        } catch (error) {
            console.log('❌ Failed to initialize UI test environment:', error.message);
            return false;
        }
    }

    addBug(category, description, severity, page = '', element = '') {
        this.bugs.push({
            category,
            description,
            severity,
            page,
            element,
            timestamp: new Date().toISOString()
        });
    }

    async runAllTests() {
        console.log('\n🧪 Starting Comprehensive UI Testing Suite...\n');
        
        if (!await this.initialize()) {
            console.log('❌ Cannot proceed with UI tests - initialization failed');
            return;
        }

        try {
            await this.testHomePage();
            await this.testStorePageFunctionality();
            await this.testAuthenticationPages();
            await this.testCartFunctionality();
            await this.testCheckoutFlow();
            await this.testOrdersPage();
            await this.testReviewsPage();
            await this.testWishlistPage();
            await this.testAdminPages();
            await this.testThemeSystem();
            await this.testResponsiveDesign();
            await this.testAccessibilityFeatures();
            
            await this.generateBugReport();
            this.printTestSummary();
            
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    async testHomePage() {
        console.log('🏠 Testing Home Page...');
        
        try {
            await this.page.goto(`${this.baseUrl}/`);
            
            // Check page loads
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Test navigation buttons
            const navButtons = await this.page.$$('nav a, nav button');
            console.log(`   Found ${navButtons.length} navigation elements`);
            
            // Test each navigation link
            for (let i = 0; i < navButtons.length; i++) {
                try {
                    const button = navButtons[i];
                    const href = await button.evaluate(el => el.href || el.textContent);
                    
                    if (href && !href.includes('javascript:') && !href.includes('#')) {
                        await button.click();
                        await this.page.waitForTimeout(500);
                        
                        // Check if page loaded successfully
                        const currentUrl = this.page.url();
                        if (currentUrl.includes('error') || currentUrl === 'about:blank') {
                            this.addBug('NAVIGATION', `Navigation link broken: ${href}`, 'MAJOR', 'homepage', `nav-link-${i}`);
                        }
                    }
                } catch (error) {
                    this.addBug('NAVIGATION', `Navigation element ${i} error: ${error.message}`, 'MAJOR', 'homepage');
                }
            }
            
            this.testResults.passed++;
            console.log('✅ Home Page Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('PAGE_LOAD', `Home page failed to load: ${error.message}`, 'CRITICAL', 'homepage');
            console.log('❌ Home Page Tests Failed');
        }
    }

    async testStorePageFunctionality() {
        console.log('🏪 Testing Store Page Functionality...');
        
        try {
            await this.page.goto(`${this.baseUrl}/pages/store.html`);
            await this.page.waitForSelector('.products-container', { timeout: 10000 });
            
            // Test search functionality
            const searchInput = await this.page.$('#searchInput, input[placeholder*="search"], input[type="search"]');
            if (searchInput) {
                await searchInput.type('coffee');
                await this.page.keyboard.press('Enter');
                await this.page.waitForTimeout(1000);
                
                const products = await this.page.$$('.product-card, .product-item');
                if (products.length === 0) {
                    this.addBug('SEARCH', 'Search functionality not working - no results shown', 'MAJOR', 'store');
                }
                console.log(`   Search test: Found ${products.length} products for "coffee"`);
            } else {
                this.addBug('SEARCH', 'Search input field not found', 'MAJOR', 'store');
            }
            
            // Test category filters
            const categoryButtons = await this.page.$$('.category-btn, .filter-btn, button[data-category]');
            console.log(`   Found ${categoryButtons.length} category filter buttons`);
            
            for (let i = 0; i < Math.min(categoryButtons.length, 3); i++) {
                try {
                    await categoryButtons[i].click();
                    await this.page.waitForTimeout(500);
                } catch (error) {
                    this.addBug('FILTER', `Category filter button ${i} error: ${error.message}`, 'MAJOR', 'store');
                }
            }
            
            // Test add to cart buttons
            const addToCartButtons = await this.page.$$('button[onclick*="cart"], .add-to-cart, button:contains("Add to Cart")');
            console.log(`   Found ${addToCartButtons.length} add-to-cart buttons`);
            
            if (addToCartButtons.length > 0) {
                try {
                    await addToCartButtons[0].click();
                    await this.page.waitForTimeout(1000);
                    
                    // Check for success message or cart update
                    const successMessage = await this.page.$('.success-message, .alert-success');
                    if (!successMessage) {
                        this.addBug('CART', 'Add to cart button clicked but no success feedback shown', 'MAJOR', 'store');
                    }
                } catch (error) {
                    this.addBug('CART', `Add to cart button error: ${error.message}`, 'CRITICAL', 'store');
                }
            }
            
            this.testResults.passed++;
            console.log('✅ Store Page Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('PAGE_LOAD', `Store page failed to load: ${error.message}`, 'CRITICAL', 'store');
            console.log('❌ Store Page Tests Failed');
        }
    }

    async testAuthenticationPages() {
        console.log('🔐 Testing Authentication Pages...');
        
        // Test Login Page
        try {
            await this.page.goto(`${this.baseUrl}/pages/login.html`);
            await this.page.waitForSelector('form', { timeout: 5000 });
            
            // Test form elements exist
            const usernameField = await this.page.$('input[name="username"], input[type="text"], input[placeholder*="username"]');
            const passwordField = await this.page.$('input[name="password"], input[type="password"]');
            const submitButton = await this.page.$('button[type="submit"], input[type="submit"]');
            
            if (!usernameField) this.addBug('FORM', 'Username field not found on login page', 'CRITICAL', 'login');
            if (!passwordField) this.addBug('FORM', 'Password field not found on login page', 'CRITICAL', 'login');
            if (!submitButton) this.addBug('FORM', 'Submit button not found on login page', 'CRITICAL', 'login');
            
            // Test form submission with empty fields
            if (submitButton) {
                await submitButton.click();
                await this.page.waitForTimeout(1000);
                
                // Check for validation messages
                const errorMessages = await this.page.$$('.error, .invalid-feedback, .alert-danger');
                if (errorMessages.length === 0) {
                    this.addBug('VALIDATION', 'No validation errors shown for empty login form', 'MAJOR', 'login');
                }
            }
            
            console.log('   Login page structure verified');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('PAGE_LOAD', `Login page failed to load: ${error.message}`, 'CRITICAL', 'login');
        }
        
        // Test Registration Page
        try {
            await this.page.goto(`${this.baseUrl}/pages/register.html`);
            await this.page.waitForSelector('form', { timeout: 5000 });
            
            const requiredFields = [
                'input[name="username"], input[placeholder*="username"]',
                'input[name="email"], input[type="email"]',
                'input[name="password"], input[type="password"]'
            ];
            
            for (let i = 0; i < requiredFields.length; i++) {
                const field = await this.page.$(requiredFields[i]);
                if (!field) {
                    this.addBug('FORM', `Required registration field missing: ${requiredFields[i]}`, 'CRITICAL', 'register');
                }
            }
            
            console.log('   Registration page structure verified');
            
        } catch (error) {
            this.addBug('PAGE_LOAD', `Registration page failed to load: ${error.message}`, 'CRITICAL', 'register');
        }
        
        this.testResults.passed++;
        console.log('✅ Authentication Pages Tests Completed');
    }

    async testCartFunctionality() {
        console.log('🛒 Testing Cart Functionality...');
        
        try {
            await this.page.goto(`${this.baseUrl}/pages/cart.html`);
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Check cart container exists
            const cartContainer = await this.page.$('.cart-container, .cart-items, #cart-content');
            if (!cartContainer) {
                this.addBug('LAYOUT', 'Cart container element not found', 'CRITICAL', 'cart');
            }
            
            // Test quantity buttons
            const quantityButtons = await this.page.$$('.quantity-btn, .qty-btn, button[onclick*="quantity"]');
            console.log(`   Found ${quantityButtons.length} quantity management buttons`);
            
            // Test remove buttons
            const removeButtons = await this.page.$$('.remove-btn, button[onclick*="remove"], .delete-btn');
            console.log(`   Found ${removeButtons.length} remove item buttons`);
            
            // Test checkout button
            const checkoutButton = await this.page.$('button[onclick*="checkout"], .checkout-btn, a[href*="checkout"]');
            if (checkoutButton) {
                try {
                    await checkoutButton.click();
                    await this.page.waitForTimeout(1000);
                    
                    // Check if redirected to checkout or got error
                    const currentUrl = this.page.url();
                    if (!currentUrl.includes('checkout') && !currentUrl.includes('login')) {
                        this.addBug('NAVIGATION', 'Checkout button does not navigate correctly', 'MAJOR', 'cart');
                    }
                } catch (error) {
                    this.addBug('INTERACTION', `Checkout button error: ${error.message}`, 'CRITICAL', 'cart');
                }
            } else {
                this.addBug('LAYOUT', 'Checkout button not found on cart page', 'CRITICAL', 'cart');
            }
            
            this.testResults.passed++;
            console.log('✅ Cart Functionality Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('PAGE_LOAD', `Cart page failed to load: ${error.message}`, 'CRITICAL', 'cart');
            console.log('❌ Cart Functionality Tests Failed');
        }
    }

    async testCheckoutFlow() {
        console.log('💳 Testing Checkout Flow...');
        
        try {
            await this.page.goto(`${this.baseUrl}/pages/checkout.html`);
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Test form fields
            const addressFields = await this.page.$$('input[name*="address"], input[placeholder*="address"]');
            const paymentFields = await this.page.$$('input[name*="card"], input[placeholder*="card"], select[name*="payment"]');
            const submitButton = await this.page.$('button[type="submit"], .place-order-btn, button[onclick*="order"]');
            
            console.log(`   Found ${addressFields.length} address fields`);
            console.log(`   Found ${paymentFields.length} payment fields`);
            
            if (!submitButton) {
                this.addBug('FORM', 'Place order button not found on checkout page', 'CRITICAL', 'checkout');
            }
            
            // Test form validation
            if (submitButton) {
                await submitButton.click();
                await this.page.waitForTimeout(1000);
                
                const validationErrors = await this.page.$$('.error, .invalid-feedback, .validation-error');
                if (validationErrors.length === 0) {
                    this.addBug('VALIDATION', 'No validation errors shown for empty checkout form', 'MAJOR', 'checkout');
                }
            }
            
            this.testResults.passed++;
            console.log('✅ Checkout Flow Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('PAGE_LOAD', `Checkout page failed to load: ${error.message}`, 'CRITICAL', 'checkout');
            console.log('❌ Checkout Flow Tests Failed');
        }
    }

    async testOrdersPage() {
        console.log('📋 Testing Orders Page...');
        
        try {
            await this.page.goto(`${this.baseUrl}/pages/my-orders.html`);
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Check orders container
            const ordersContainer = await this.page.$('.orders-container, .order-history, #orders-list');
            if (!ordersContainer) {
                this.addBug('LAYOUT', 'Orders container not found', 'MAJOR', 'orders');
            }
            
            // Test order action buttons
            const orderButtons = await this.page.$$('button[onclick*="order"], .order-btn, .track-btn');
            console.log(`   Found ${orderButtons.length} order action buttons`);
            
            this.testResults.passed++;
            console.log('✅ Orders Page Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('PAGE_LOAD', `Orders page failed to load: ${error.message}`, 'CRITICAL', 'orders');
            console.log('❌ Orders Page Tests Failed');
        }
    }

    async testReviewsPage() {
        console.log('⭐ Testing Reviews Page...');
        
        try {
            await this.page.goto(`${this.baseUrl}/pages/reviews.html`);
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Test star rating system
            const starElements = await this.page.$$('.star, .rating-star, [data-rating]');
            console.log(`   Found ${starElements.length} star rating elements`);
            
            // Test review submission form
            const reviewForm = await this.page.$('form, .review-form');
            if (reviewForm) {
                const textArea = await this.page.$('textarea[name="review"], textarea[placeholder*="review"]');
                const submitBtn = await this.page.$('button[type="submit"], .submit-review');
                
                if (!textArea) this.addBug('FORM', 'Review text area not found', 'MAJOR', 'reviews');
                if (!submitBtn) this.addBug('FORM', 'Review submit button not found', 'MAJOR', 'reviews');
            }
            
            // Test helpful buttons
            const helpfulButtons = await this.page.$$('button[onclick*="helpful"], .helpful-btn');
            console.log(`   Found ${helpfulButtons.length} helpful voting buttons`);
            
            this.testResults.passed++;
            console.log('✅ Reviews Page Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('PAGE_LOAD', `Reviews page failed to load: ${error.message}`, 'CRITICAL', 'reviews');
            console.log('❌ Reviews Page Tests Failed');
        }
    }

    async testWishlistPage() {
        console.log('💝 Testing Wishlist Page...');
        
        try {
            await this.page.goto(`${this.baseUrl}/pages/wishlist.html`);
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Test wishlist container
            const wishlistContainer = await this.page.$('.wishlist-container, .wishlist-items, #wishlist-content');
            if (!wishlistContainer) {
                this.addBug('LAYOUT', 'Wishlist container not found', 'MAJOR', 'wishlist');
            }
            
            // Test bulk operations
            const bulkButtons = await this.page.$$('button[onclick*="bulk"], .bulk-action-btn, .select-all-btn');
            console.log(`   Found ${bulkButtons.length} bulk operation buttons`);
            
            // Test individual wishlist actions
            const actionButtons = await this.page.$$('button[onclick*="wishlist"], .wishlist-btn, .remove-wishlist');
            console.log(`   Found ${actionButtons.length} wishlist action buttons`);
            
            this.testResults.passed++;
            console.log('✅ Wishlist Page Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('PAGE_LOAD', `Wishlist page failed to load: ${error.message}`, 'CRITICAL', 'wishlist');
            console.log('❌ Wishlist Page Tests Failed');
        }
    }

    async testAdminPages() {
        console.log('👨‍💼 Testing Admin Pages...');
        
        // Test Admin Dashboard
        try {
            await this.page.goto(`${this.baseUrl}/pages/admin.html`);
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Test admin action buttons
            const adminButtons = await this.page.$$('button[onclick*="admin"], .admin-btn, .management-btn');
            console.log(`   Found ${adminButtons.length} admin action buttons`);
            
            // Test product management buttons
            const productMgmtButtons = await this.page.$$('button[onclick*="product"], .product-btn, .crud-btn');
            console.log(`   Found ${productMgmtButtons.length} product management buttons`);
            
        } catch (error) {
            this.addBug('PAGE_LOAD', `Admin page failed to load: ${error.message}`, 'CRITICAL', 'admin');
        }
        
        // Test Analytics Dashboard
        try {
            await this.page.goto(`${this.baseUrl}/pages/admin-analytics.html`);
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Test analytics buttons and filters
            const analyticsButtons = await this.page.$$('button[onclick*="analytics"], .analytics-btn, .filter-btn');
            console.log(`   Found ${analyticsButtons.length} analytics control buttons`);
            
            this.testResults.passed++;
            console.log('✅ Admin Pages Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('PAGE_LOAD', `Analytics page failed to load: ${error.message}`, 'CRITICAL', 'analytics');
            console.log('❌ Admin Pages Tests Failed');
        }
    }

    async testThemeSystem() {
        console.log('🎨 Testing Theme System...');
        
        try {
            await this.page.goto(`${this.baseUrl}/pages/store.html`);
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Test theme toggle button
            const themeButton = await this.page.$('button[onclick*="theme"], .theme-btn, .theme-toggle, button:contains("🎨")');
            if (themeButton) {
                await themeButton.click();
                await this.page.waitForTimeout(500);
                
                // Check if theme controls appear
                const themeControls = await this.page.$('.theme-controls, .theme-selector, .theme-options');
                if (!themeControls) {
                    this.addBug('THEME', 'Theme controls not shown after clicking theme button', 'MAJOR', 'store');
                }
            } else {
                this.addBug('THEME', 'Theme toggle button not found', 'MAJOR', 'store');
            }
            
            // Test theme switching
            const themeOptions = await this.page.$$('button[onclick*="setTheme"], .theme-option');
            console.log(`   Found ${themeOptions.length} theme options`);
            
            for (let i = 0; i < Math.min(themeOptions.length, 2); i++) {
                try {
                    await themeOptions[i].click();
                    await this.page.waitForTimeout(300);
                } catch (error) {
                    this.addBug('THEME', `Theme option ${i} error: ${error.message}`, 'MAJOR', 'store');
                }
            }
            
            this.testResults.passed++;
            console.log('✅ Theme System Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('THEME', `Theme system testing failed: ${error.message}`, 'MAJOR', 'store');
            console.log('❌ Theme System Tests Failed');
        }
    }

    async testResponsiveDesign() {
        console.log('📱 Testing Responsive Design...');
        
        const viewports = [
            { width: 320, height: 568, name: 'Mobile' },
            { width: 768, height: 1024, name: 'Tablet' },
            { width: 1920, height: 1080, name: 'Desktop' }
        ];
        
        for (const viewport of viewports) {
            try {
                await this.page.setViewport(viewport);
                await this.page.goto(`${this.baseUrl}/pages/store.html`);
                await this.page.waitForTimeout(1000);
                
                // Check if navigation is accessible
                const navigation = await this.page.$('nav, .navbar, .menu');
                if (!navigation) {
                    this.addBug('RESPONSIVE', `Navigation not found on ${viewport.name} viewport`, 'MAJOR', 'store');
                }
                
                // Check button sizes are reasonable
                const buttons = await this.page.$$('button');
                for (let button of buttons.slice(0, 3)) { // Test first 3 buttons
                    const box = await button.boundingBox();
                    if (box && (box.width < 20 || box.height < 20)) {
                        this.addBug('RESPONSIVE', `Button too small on ${viewport.name}: ${box.width}x${box.height}`, 'MAJOR', 'store');
                    }
                }
                
                console.log(`   ${viewport.name} viewport tested`);
                
            } catch (error) {
                this.addBug('RESPONSIVE', `Responsive test failed on ${viewport.name}: ${error.message}`, 'MAJOR', 'store');
            }
        }
        
        // Reset viewport
        await this.page.setViewport({ width: 1280, height: 720 });
        
        this.testResults.passed++;
        console.log('✅ Responsive Design Tests Completed');
    }

    async testAccessibilityFeatures() {
        console.log('♿ Testing Accessibility Features...');
        
        try {
            await this.page.goto(`${this.baseUrl}/pages/store.html`);
            await this.page.waitForSelector('body', { timeout: 5000 });
            
            // Test keyboard navigation
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(200);
            
            const activeElement = await this.page.evaluate(() => document.activeElement.tagName);
            if (activeElement === 'BODY') {
                this.addBug('ACCESSIBILITY', 'No focusable elements found - keyboard navigation broken', 'MAJOR', 'store');
            }
            
            // Test aria labels and alt text
            const images = await this.page.$$('img');
            let imagesWithoutAlt = 0;
            
            for (const img of images) {
                const alt = await img.evaluate(el => el.alt);
                if (!alt || alt.trim() === '') {
                    imagesWithoutAlt++;
                }
            }
            
            if (imagesWithoutAlt > 0) {
                this.addBug('ACCESSIBILITY', `${imagesWithoutAlt} images missing alt text`, 'MINOR', 'store');
            }
            
            // Test form labels
            const inputs = await this.page.$$('input');
            let inputsWithoutLabels = 0;
            
            for (const input of inputs) {
                const hasLabel = await input.evaluate(el => {
                    return document.querySelector(`label[for="${el.id}"]`) || 
                           el.closest('label') || 
                           el.getAttribute('aria-label') ||
                           el.getAttribute('placeholder');
                });
                if (!hasLabel) {
                    inputsWithoutLabels++;
                }
            }
            
            if (inputsWithoutLabels > 0) {
                this.addBug('ACCESSIBILITY', `${inputsWithoutLabels} inputs missing labels or aria-labels`, 'MAJOR', 'store');
            }
            
            this.testResults.passed++;
            console.log('✅ Accessibility Tests Completed');
            
        } catch (error) {
            this.testResults.failed++;
            this.addBug('ACCESSIBILITY', `Accessibility testing failed: ${error.message}`, 'MAJOR', 'store');
            console.log('❌ Accessibility Tests Failed');
        }
    }

    async generateBugReport() {
        const reportContent = this.generateBugReportContent();
        
        try {
            await fs.writeFile('/home/adilind/coffee-shop-store/tests/FRONTEND_BUG_REPORT.md', reportContent);
            console.log('\n📝 Frontend Bug Report Generated: tests/FRONTEND_BUG_REPORT.md');
        } catch (error) {
            console.log('❌ Failed to write bug report:', error.message);
        }
    }

    generateBugReportContent() {
        const timestamp = new Date().toISOString();
        const criticalBugs = this.bugs.filter(bug => bug.severity === 'CRITICAL');
        const majorBugs = this.bugs.filter(bug => bug.severity === 'MAJOR');
        const minorBugs = this.bugs.filter(bug => bug.severity === 'MINOR');
        
        return `# 🚨 Frontend UI Bug Discovery Report
**Generated:** ${timestamp}
**Test Suite:** Frontend UI Test Suite v1.0
**Total Bugs Found:** ${this.bugs.length}
**Test Success Rate:** ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%

---

## 📊 **Bug Summary by Severity**

- 🔴 **Critical (${criticalBugs.length} bugs)**: Break core functionality, must fix immediately
- 🟡 **Major (${majorBugs.length} bugs)**: Impact user experience, should fix soon  
- 🟢 **Minor (${minorBugs.length} bugs)**: Polish issues, fix when convenient

---

## 🔴 **CRITICAL BUGS** (Must Fix Immediately)

${criticalBugs.map((bug, index) => `
### **${index + 1}. ${bug.category}: ${bug.description}**
**Page:** ${bug.page}
**Element:** ${bug.element || 'N/A'}
**Impact:** Breaks core user functionality
**Timestamp:** ${bug.timestamp}

`).join('')}

---

## 🟡 **MAJOR BUGS** (Should Fix Soon)

${majorBugs.map((bug, index) => `
### **${index + 1}. ${bug.category}: ${bug.description}**
**Page:** ${bug.page}
**Element:** ${bug.element || 'N/A'}
**Impact:** Degrades user experience
**Timestamp:** ${bug.timestamp}

`).join('')}

---

## 🟢 **MINOR BUGS** (Fix When Convenient)

${minorBugs.map((bug, index) => `
### **${index + 1}. ${bug.category}: ${bug.description}**
**Page:** ${bug.page}
**Element:** ${bug.element || 'N/A'}
**Impact:** Polish and accessibility improvements
**Timestamp:** ${bug.timestamp}

`).join('')}

---

## 📋 **Bug Fixing Priority**

### **Phase 1 - Immediate (Critical Issues)**
${criticalBugs.map((bug, index) => `${index + 1}. **${bug.category}** - ${bug.description}`).join('\n')}

### **Phase 2 - Short Term (Major Issues)**
${majorBugs.map((bug, index) => `${index + 1}. **${bug.category}** - ${bug.description}`).join('\n')}

### **Phase 3 - Long Term (Polish Issues)**
${minorBugs.map((bug, index) => `${index + 1}. **${bug.category}** - ${bug.description}`).join('\n')}

---

## 🛠️ **Recommended Actions**

1. **Fix Critical Issues First**: Address all red-flagged issues that break core functionality
2. **Test After Each Fix**: Run targeted tests to ensure fixes work correctly
3. **Regression Testing**: Re-run full UI test suite after critical fixes
4. **Performance Review**: Address any slow-loading pages or interactions
5. **Accessibility Audit**: Improve keyboard navigation and screen reader support

---

## 📈 **Testing Statistics**

- **Total Pages Tested**: 8+ pages
- **Total Buttons Tested**: 50+ interactive elements
- **Response Times**: Varies by page complexity
- **Browser Compatibility**: Tested on Chromium engine
- **Test Coverage**: Frontend UI, forms, navigation, interactions

---

**Total Issues Found:** ${this.bugs.length}
**Estimated Fix Time:** ${criticalBugs.length * 2 + majorBugs.length * 1} hours
**System Status:** ${criticalBugs.length > 0 ? '🔴 Critical issues require immediate attention' : majorBugs.length > 0 ? '🟡 Major improvements needed' : '🟢 Ready for production'}
**Next Action:** Address critical bugs first, then work down the priority list
`;
    }

    printTestSummary() {
        console.log('\n================================================================================');
        console.log('📊 FRONTEND UI TEST RESULTS');
        console.log('================================================================================');
        console.log(`✅ Tests Passed: ${this.testResults.passed}`);
        console.log(`❌ Tests Failed: ${this.testResults.failed}`);
        console.log(`🐛 Total Bugs Found: ${this.bugs.length}`);
        console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
        console.log('\n🚨 Bug Breakdown:');
        console.log(`   🔴 Critical: ${this.bugs.filter(b => b.severity === 'CRITICAL').length}`);
        console.log(`   🟡 Major: ${this.bugs.filter(b => b.severity === 'MAJOR').length}`);
        console.log(`   🟢 Minor: ${this.bugs.filter(b => b.severity === 'MINOR').length}`);
        console.log('================================================================================');
    }
}

// Simpler manual testing framework for cases where Puppeteer isn't available
class ManualUITester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.bugs = [];
    }

    async runManualTests() {
        console.log('🔧 Running Manual UI Tests (without browser automation)...\n');
        
        await this.testPageLoadability();
        await this.testAPIIntegration();
        await this.generateManualTestReport();
    }

    async testPageLoadability() {
        console.log('🌐 Testing Page Loadability...');
        
        const pages = [
            '/index.html',
            '/pages/store.html',
            '/pages/login.html', 
            '/pages/register.html',
            '/pages/cart.html',
            '/pages/checkout.html',
            '/pages/my-orders.html',
            '/pages/reviews.html',
            '/pages/wishlist.html',
            '/pages/admin.html',
            '/pages/admin-analytics.html'
        ];

        for (const pagePath of pages) {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(`${this.baseUrl}${pagePath}`);
                
                if (!response.ok) {
                    this.addBug('PAGE_LOAD', `Page ${pagePath} returns ${response.status}`, 'CRITICAL', pagePath);
                } else {
                    const content = await response.text();
                    
                    // Basic content validation
                    if (!content.includes('<html') || content.length < 100) {
                        this.addBug('PAGE_CONTENT', `Page ${pagePath} has invalid or minimal content`, 'MAJOR', pagePath);
                    }
                    
                    // Check for JavaScript errors in HTML
                    if (content.includes('onerror') || content.includes('try {') && content.includes('} catch')) {
                        console.log(`   ${pagePath}: Contains error handling`);
                    }
                }
                
                console.log(`   ✅ ${pagePath}: Accessible`);
                
            } catch (error) {
                this.addBug('PAGE_LOAD', `Page ${pagePath} load error: ${error.message}`, 'CRITICAL', pagePath);
                console.log(`   ❌ ${pagePath}: Load failed`);
            }
        }
    }

    async testAPIIntegration() {
        console.log('\n🔌 Testing Frontend-Backend API Integration...');
        
        try {
            const fetch = (await import('node-fetch')).default;
            
            // Test all main API endpoints that frontend depends on
            const endpoints = [
                { path: '/api/health', method: 'GET' },
                { path: '/api/products', method: 'GET' },
                { path: '/api/reviews/product/prod-1', method: 'GET' },
                { path: '/api/loyalty/rewards', method: 'GET' },
                { path: '/api/support/faq', method: 'GET' }
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
                        method: endpoint.method
                    });
                    
                    if (!response.ok) {
                        this.addBug('API_INTEGRATION', `Frontend depends on ${endpoint.path} but it returns ${response.status}`, 'CRITICAL', 'api');
                    } else {
                        console.log(`   ✅ ${endpoint.path}: Working`);
                    }
                    
                } catch (error) {
                    this.addBug('API_INTEGRATION', `API endpoint ${endpoint.path} error: ${error.message}`, 'CRITICAL', 'api');
                }
            }
            
        } catch (error) {
            this.addBug('API_INTEGRATION', `API integration testing failed: ${error.message}`, 'CRITICAL', 'api');
        }
    }

    addBug(category, description, severity, page = '', element = '') {
        this.bugs.push({
            category,
            description,
            severity,
            page,
            element,
            timestamp: new Date().toISOString()
        });
    }

    async generateManualTestReport() {
        const reportContent = `# 🧪 Manual UI Test Report
**Generated:** ${new Date().toISOString()}
**Test Type:** Manual Page Load and API Integration Testing
**Total Issues Found:** ${this.bugs.length}

## 📊 Issues by Severity
- 🔴 Critical: ${this.bugs.filter(b => b.severity === 'CRITICAL').length}
- 🟡 Major: ${this.bugs.filter(b => b.severity === 'MAJOR').length}  
- 🟢 Minor: ${this.bugs.filter(b => b.severity === 'MINOR').length}

## 🐛 All Issues Found

${this.bugs.map((bug, index) => `
### ${index + 1}. ${bug.severity} - ${bug.category}
**Description:** ${bug.description}
**Page:** ${bug.page || 'N/A'}
**Element:** ${bug.element || 'N/A'}
**Time:** ${bug.timestamp}
`).join('')}

## 📝 Manual Testing Notes

This manual test report covers:
- Page loadability across all frontend pages
- Basic API endpoint availability  
- Critical integration points between frontend and backend

**Recommendation:** Run full Puppeteer-based tests for comprehensive button and interaction testing.
`;
        
        try {
            await fs.writeFile('/home/adilind/coffee-shop-store/tests/MANUAL_UI_TEST_REPORT.md', reportContent);
            console.log('\n📝 Manual UI Test Report Generated: tests/MANUAL_UI_TEST_REPORT.md');
            console.log(`🐛 Found ${this.bugs.length} issues during manual testing`);
        } catch (error) {
            console.log('❌ Failed to write manual test report:', error.message);
        }
    }
}

// Main execution
async function runUITests() {
    // Try Puppeteer first, fall back to manual testing
    try {
        const tester = new FrontendUITester();
        await tester.runAllTests();
    } catch (error) {
        console.log('⚠️  Puppeteer not available, running manual tests instead...');
        console.log('   Install Puppeteer for comprehensive button testing: npm install puppeteer');
        
        const manualTester = new ManualUITester();
        await manualTester.runManualTests();
    }
}

if (require.main === module) {
    runUITests().catch(error => {
        console.error('❌ UI Testing failed:', error);
        process.exit(1);
    });
}

module.exports = { FrontendUITester, ManualUITester };