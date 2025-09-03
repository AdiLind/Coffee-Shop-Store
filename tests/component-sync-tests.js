// Specialized tests for component initialization and synchronization issues
const BASE_URL = 'http://localhost:3000';
let fetch;

class ComponentSyncTester {
    constructor() {
        this.results = [];
        this.timingData = {};
    }

    async initializeFetch() {
        if (!fetch) {
            const nodeFetch = await import('node-fetch');
            fetch = nodeFetch.default;
        }
    }

    async runComponentSyncTests() {
        await this.initializeFetch();
        console.log('🔧 Component Synchronization & Timing Tests\n');

        const tests = [
            this.testAuthManagerInitialization,
            this.testStoreManagerRaceConditions,
            this.testCartManagerSynchronization,
            this.testCrossComponentCommunication,
            this.testPageNavigationTiming,
            this.testSessionStateConsistency
        ];

        for (const test of tests) {
            await this.runSyncTest(test);
        }

        this.generateSyncReport();
        return this.results;
    }

    async runSyncTest(test) {
        try {
            console.log(`Testing ${test.name}...`);
            const result = await test.call(this);
            console.log('✅ PASSED');
            this.results.push({ test: test.name, status: 'passed', result });
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.results.push({ test: test.name, status: 'failed', error: error.message });
        }
        console.log('');
    }

    async testAuthManagerInitialization() {
        // Simulate rapid authentication checks that might cause race conditions
        const startTime = Date.now();
        
        const authChecks = [];
        for (let i = 0; i < 10; i++) {
            authChecks.push(
                fetch(`${BASE_URL}/api/auth/profile`).then(response => ({
                    timestamp: Date.now() - startTime,
                    status: response.status,
                    ok: response.ok || response.status === 401 // 401 is expected for unauthenticated
                }))
            );
        }

        const results = await Promise.all(authChecks);
        const failedChecks = results.filter(r => !r.ok);
        
        if (failedChecks.length > 0) {
            throw new Error(`${failedChecks.length}/10 auth checks failed - initialization timing issues`);
        }

        this.timingData.authInitialization = results;
        console.log(`   Auth manager handled ${results.length} rapid requests successfully`);
        
        return { averageResponseTime: results.reduce((sum, r) => sum + r.timestamp, 0) / results.length };
    }

    async testStoreManagerRaceConditions() {
        // Test simultaneous store operations that might cause race conditions
        const operations = [
            fetch(`${BASE_URL}/api/products`),
            fetch(`${BASE_URL}/api/products?search=coffee`),
            fetch(`${BASE_URL}/api/products?category=machines`),
            fetch(`${BASE_URL}/pages/store.html`)
        ];

        const startTime = Date.now();
        const responses = await Promise.all(operations);
        const endTime = Date.now();
        
        const successfulOps = responses.filter(r => r.ok).length;
        
        if (successfulOps < 3) {
            throw new Error(`Store manager race conditions detected - only ${successfulOps}/4 operations successful`);
        }

        console.log(`   Store operations completed in ${endTime - startTime}ms`);
        return { totalTime: endTime - startTime, successfulOperations: successfulOps };
    }

    async testCartManagerSynchronization() {
        // Test cart operations that require proper synchronization with auth
        
        // First, ensure we have an authenticated session
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Could not establish authenticated session for cart sync test');
        }

        const authCookies = loginResponse.headers.get('set-cookie');

        // Test rapid cart operations
        const cartOperations = [
            fetch(`${BASE_URL}/api/cart`, { headers: { 'Cookie': authCookies } }),
            fetch(`${BASE_URL}/pages/cart.html`),
            fetch(`${BASE_URL}/api/cart`, { headers: { 'Cookie': authCookies } })
        ];

        const startTime = Date.now();
        const responses = await Promise.all(cartOperations);
        const endTime = Date.now();
        
        const successfulOps = responses.filter(r => r.ok).length;
        
        if (successfulOps < 2) {
            throw new Error(`Cart synchronization issues detected - only ${successfulOps}/3 operations successful`);
        }

        console.log(`   Cart synchronization verified in ${endTime - startTime}ms`);
        return { syncTime: endTime - startTime };
    }

    async testCrossComponentCommunication() {
        // Test that components can communicate properly
        
        // Simulate user flow: login → browse products → add to cart
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Authentication step failed in component communication test');
        }

        const authCookies = loginResponse.headers.get('set-cookie');

        // Browse products (store component)
        const productsResponse = await fetch(`${BASE_URL}/api/products`);
        if (!productsResponse.ok) {
            throw new Error('Product browsing step failed in component communication test');
        }

        // Access cart (cart component)
        const cartResponse = await fetch(`${BASE_URL}/api/cart`, {
            headers: { 'Cookie': authCookies }
        });
        
        if (!cartResponse.ok) {
            throw new Error('Cart access step failed in component communication test');
        }

        console.log('   Cross-component communication verified');
        return { communicationFlow: 'login → products → cart successful' };
    }

    async testPageNavigationTiming() {
        // Test that page navigation doesn't cause timing issues
        const pages = [
            '/pages/store.html',
            '/pages/cart.html', 
            '/pages/login.html',
            '/pages/register.html'
        ];

        const navigationResults = {};
        
        for (const page of pages) {
            const startTime = Date.now();
            const response = await fetch(`${BASE_URL}${page}`);
            const endTime = Date.now();
            
            navigationResults[page] = {
                loadTime: endTime - startTime,
                successful: response.ok
            };
            
            if (!response.ok) {
                throw new Error(`Page navigation failed for: ${page}`);
            }
        }

        const avgLoadTime = Object.values(navigationResults).reduce((sum, result) => sum + result.loadTime, 0) / pages.length;
        
        if (avgLoadTime > 1000) {
            throw new Error(`Page navigation too slow - average ${avgLoadTime}ms`);
        }

        console.log(`   Page navigation timing verified - average ${avgLoadTime.toFixed(1)}ms`);
        return navigationResults;
    }

    async testSessionStateConsistency() {
        // Test that session state remains consistent across rapid requests
        
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin', 
                password: 'admin'
            })
        });

        if (!loginResponse.ok) {
            throw new Error('Could not establish session for consistency test');
        }

        const authCookies = loginResponse.headers.get('set-cookie');

        // Make rapid profile requests to test session consistency
        const consistencyChecks = [];
        for (let i = 0; i < 15; i++) {
            consistencyChecks.push(
                fetch(`${BASE_URL}/api/auth/profile`, {
                    headers: { 'Cookie': authCookies }
                }).then(async response => ({
                    successful: response.ok,
                    status: response.status,
                    data: response.ok ? await response.json() : null
                }))
            );
        }

        const results = await Promise.all(consistencyChecks);
        const successfulChecks = results.filter(r => r.successful).length;
        
        if (successfulChecks < 13) {
            throw new Error(`Session consistency issues - only ${successfulChecks}/15 requests successful`);
        }

        // Verify all successful requests returned same user
        const successfulResults = results.filter(r => r.successful && r.data);
        const userIds = [...new Set(successfulResults.map(r => r.data.data.id))];
        
        if (userIds.length > 1) {
            throw new Error('Session state inconsistency - multiple user IDs returned');
        }

        console.log(`   Session state consistency verified: ${successfulChecks}/15 requests successful`);
        return { consistency: successfulChecks / results.length };
    }

    generateSyncReport() {
        console.log('\n🔧 COMPONENT SYNCHRONIZATION REPORT');
        console.log('=' .repeat(60));

        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;

        console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

        if (failed > 0) {
            console.log('\n🚨 SYNCHRONIZATION ISSUES FOUND:');
            const failures = this.results.filter(r => r.status === 'failed');
            
            for (const failure of failures) {
                console.log(`❌ ${failure.test}: ${failure.error}`);
            }
            
            console.log('\n💡 RECOMMENDED FIXES:');
            
            if (failures.some(f => f.test.includes('Auth'))) {
                console.log('1. Add waitForAuthManager() to all components that need authentication');
                console.log('2. Implement proper initialization sequencing');
            }
            
            if (failures.some(f => f.test.includes('Race'))) {
                console.log('3. Add component ready state validation');
                console.log('4. Implement proper async/await in initialization');
            }
            
            if (failures.some(f => f.test.includes('Session'))) {
                console.log('5. Review session cookie configuration');
                console.log('6. Add localStorage backup for authentication state');
            }
        } else {
            console.log('✅ No component synchronization issues detected');
        }

        console.log('\n📈 TIMING ANALYSIS:');
        if (this.timingData.authInitialization) {
            const authTimes = this.timingData.authInitialization.map(t => t.timestamp);
            const avgAuthTime = authTimes.reduce((sum, time) => sum + time, 0) / authTimes.length;
            console.log(`Auth Manager Average Response: ${avgAuthTime.toFixed(1)}ms`);
        }

        console.log('\n' + '=' .repeat(60));
    }
}

module.exports = ComponentSyncTester;

// Run if executed directly
if (require.main === module) {
    (async () => {
        const tester = new ComponentSyncTester();
        await tester.runComponentSyncTests();
    })().catch(console.error);
}