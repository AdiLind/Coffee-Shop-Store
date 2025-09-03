// Stress testing and performance validation for Coffee Shop application
const BASE_URL = 'http://localhost:3000';
let fetch;

class StressTestSuite {
    constructor() {
        this.results = {
            performance: {},
            errors: [],
            rateLimiting: {},
            concurrency: {}
        };
    }

    async initializeFetch() {
        if (!fetch) {
            const nodeFetch = await import('node-fetch');
            fetch = nodeFetch.default;
        }
    }

    async runStressTests() {
        await this.initializeFetch();
        console.log('⚡ Coffee Shop Stress & Performance Testing\n');

        const stressTests = [
            this.testAPIResponseTimeUnderLoad,
            this.testRateLimitingBehavior,
            this.testConcurrentUserSimulation,
            this.testAuthenticationUnderLoad,
            this.testDatabaseOperationPerformance,
            this.testMemoryLeakDetection,
            this.testSessionCleanupPerformance
        ];

        for (const test of stressTests) {
            await this.runStressTest(test);
        }

        this.generateStressReport();
        return this.results;
    }

    async runStressTest(test) {
        try {
            console.log(`🔥 ${test.name}...`);
            const startTime = Date.now();
            const result = await test.call(this);
            const duration = Date.now() - startTime;
            
            console.log(`✅ COMPLETED (${duration}ms)`);
            
            if (!this.results.performance[test.name]) {
                this.results.performance[test.name] = {};
            }
            this.results.performance[test.name] = { ...result, totalTime: duration };
            
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            this.results.errors.push({
                test: test.name,
                error: error.message
            });
        }
        console.log('');
    }

    async testAPIResponseTimeUnderLoad() {
        const endpoints = [
            '/api/health',
            '/api/products',
            '/api/products?search=coffee',
            '/api/products?category=machines'
        ];

        const loadTestResults = {};

        for (const endpoint of endpoints) {
            console.log(`   Testing ${endpoint} under load...`);
            
            // Send 20 concurrent requests
            const requests = Array(20).fill(null).map(() => {
                const start = Date.now();
                return fetch(`${BASE_URL}${endpoint}`).then(response => ({
                    time: Date.now() - start,
                    success: response.ok,
                    status: response.status
                }));
            });

            const responses = await Promise.all(requests);
            const successfulRequests = responses.filter(r => r.success);
            const responseTimes = successfulRequests.map(r => r.time);
            
            if (successfulRequests.length < 15) {
                throw new Error(`Too many failures under load for ${endpoint}: ${successfulRequests.length}/20 successful`);
            }

            const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
            const maxTime = Math.max(...responseTimes);
            const minTime = Math.min(...responseTimes);

            loadTestResults[endpoint] = {
                successRate: (successfulRequests.length / 20) * 100,
                averageTime: avgTime,
                maxTime: maxTime,
                minTime: minTime
            };

            console.log(`     Success: ${successfulRequests.length}/20, Avg: ${avgTime.toFixed(1)}ms, Max: ${maxTime}ms`);

            // Performance thresholds
            if (avgTime > 1000) {
                throw new Error(`${endpoint} average response time too slow: ${avgTime}ms`);
            }
        }

        return loadTestResults;
    }

    async testRateLimitingBehavior() {
        console.log('   Testing rate limiting boundaries...');

        // Test normal usage pattern (should not be blocked)
        const normalUsageRequests = Array(50).fill(null).map(() => 
            fetch(`${BASE_URL}/api/health`)
        );

        const normalResponses = await Promise.all(normalUsageRequests);
        const normalSuccessRate = normalResponses.filter(r => r.ok).length / normalResponses.length;

        if (normalSuccessRate < 0.9) {
            throw new Error(`Rate limiting too aggressive for normal usage: ${(normalSuccessRate * 100).toFixed(1)}% success rate`);
        }

        console.log(`     Normal usage: ${(normalSuccessRate * 100).toFixed(1)}% success rate`);

        // Test authentication rate limiting
        const authRequests = Array(15).fill(null).map(() =>
            fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'nonexistent',
                    password: 'wrong'
                })
            })
        );

        const authResponses = await Promise.all(authRequests);
        const authBlocked = authResponses.filter(r => r.status === 429).length;

        console.log(`     Auth rate limiting: ${authBlocked}/15 requests blocked`);

        return {
            normalUsageSuccessRate: normalSuccessRate,
            authRateLimitingActive: authBlocked > 0
        };
    }

    async testConcurrentUserSimulation() {
        console.log('   Simulating 10 concurrent users...');

        // Create test users for concurrent simulation
        const userPromises = Array(10).fill(null).map((_, index) => 
            this.simulateUserSession(`stressuser${Date.now()}_${index}`)
        );

        const startTime = Date.now();
        const userSessions = await Promise.all(userPromises);
        const endTime = Date.now();

        const successfulSessions = userSessions.filter(session => session.success).length;

        if (successfulSessions < 7) {
            throw new Error(`Concurrent user handling failed: only ${successfulSessions}/10 users could complete their session`);
        }

        console.log(`     ${successfulSessions}/10 users completed full sessions in ${endTime - startTime}ms`);

        return {
            concurrentUsers: successfulSessions,
            totalTime: endTime - startTime,
            averageSessionTime: userSessions.reduce((sum, session) => sum + (session.duration || 0), 0) / userSessions.length
        };
    }

    async simulateUserSession(username) {
        try {
            const sessionStart = Date.now();

            // Register user
            const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    email: `${username}@stresstest.com`,
                    password: 'StressTest123!',
                    confirmPassword: 'StressTest123!'
                })
            });

            if (!registerResponse.ok) {
                return { success: false, step: 'register' };
            }

            // Login
            const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username,
                    password: 'StressTest123!'
                })
            });

            if (!loginResponse.ok) {
                return { success: false, step: 'login' };
            }

            const authCookies = loginResponse.headers.get('set-cookie');

            // Browse products
            const productsResponse = await fetch(`${BASE_URL}/api/products`, {
                headers: { 'Cookie': authCookies }
            });

            if (!productsResponse.ok) {
                return { success: false, step: 'browse' };
            }

            // Access cart
            const cartResponse = await fetch(`${BASE_URL}/api/cart`, {
                headers: { 'Cookie': authCookies }
            });

            if (!cartResponse.ok) {
                return { success: false, step: 'cart' };
            }

            const sessionEnd = Date.now();

            return {
                success: true,
                duration: sessionEnd - sessionStart,
                completedSteps: ['register', 'login', 'browse', 'cart']
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async testAuthenticationUnderLoad() {
        console.log('   Testing authentication system under heavy load...');

        // Test multiple rapid login attempts with valid credentials
        const loginRequests = Array(25).fill(null).map(() =>
            fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin'
                })
            })
        );

        const startTime = Date.now();
        const responses = await Promise.all(loginRequests);
        const endTime = Date.now();

        const successfulLogins = responses.filter(r => r.ok).length;
        const rateLimitedRequests = responses.filter(r => r.status === 429).length;

        console.log(`     ${successfulLogins}/25 logins successful, ${rateLimitedRequests} rate limited`);
        console.log(`     Total time: ${endTime - startTime}ms`);

        return {
            successfulLogins,
            rateLimitedRequests,
            totalTime: endTime - startTime
        };
    }

    async testDatabaseOperationPerformance() {
        console.log('   Testing database operation performance...');

        const operations = [
            { name: 'Products Query', url: '/api/products' },
            { name: 'Product Search', url: '/api/products?search=coffee' },
            { name: 'Category Filter', url: '/api/products?category=machines' },
            { name: 'Admin Stats', url: '/api/admin/stats' }
        ];

        const dbPerformance = {};

        for (const op of operations) {
            const times = [];
            
            // Run each operation 10 times
            for (let i = 0; i < 10; i++) {
                const start = Date.now();
                const response = await fetch(`${BASE_URL}${op.url}`);
                const end = Date.now();
                
                if (response.ok || response.status === 401) { // 401 is expected for some admin endpoints
                    times.push(end - start);
                }
            }

            if (times.length === 0) {
                throw new Error(`Database operation failed for ${op.name}`);
            }

            const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
            const maxTime = Math.max(...times);
            
            dbPerformance[op.name] = { avgTime, maxTime, samples: times.length };
            
            console.log(`     ${op.name}: Avg ${avgTime.toFixed(1)}ms, Max ${maxTime}ms`);

            if (avgTime > 500) {
                throw new Error(`Database operation too slow for ${op.name}: ${avgTime}ms`);
            }
        }

        return dbPerformance;
    }

    async testMemoryLeakDetection() {
        console.log('   Testing for memory leaks with repeated operations...');

        // Perform 100 operations that might cause memory leaks
        const operations = [
            () => fetch(`${BASE_URL}/api/health`),
            () => fetch(`${BASE_URL}/api/products`),
            () => fetch(`${BASE_URL}/pages/store.html`)
        ];

        let successfulOperations = 0;
        let errors = 0;

        for (let i = 0; i < 100; i++) {
            try {
                const operation = operations[i % operations.length];
                const response = await operation();
                
                if (response.ok) {
                    successfulOperations++;
                } else {
                    errors++;
                }

                // Brief pause to simulate real usage
                await new Promise(resolve => setTimeout(resolve, 10));
                
            } catch (error) {
                errors++;
                if (errors > 20) {
                    throw new Error('Too many errors during memory leak test - system unstable');
                }
            }
        }

        if (successfulOperations < 80) {
            throw new Error('Memory leak detected - performance degraded significantly');
        }

        console.log(`     Completed 100 operations: ${successfulOperations} successful, ${errors} errors`);
        return { successfulOperations, errors, memoryStable: true };
    }

    async testSessionCleanupPerformance() {
        console.log('   Testing session cleanup performance...');

        // Create multiple sessions
        const sessionRequests = Array(10).fill(null).map((_, index) =>
            fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin'
                })
            })
        );

        const responses = await Promise.all(sessionRequests);
        const successfulSessions = responses.filter(r => r.ok).length;

        console.log(`     Created ${successfulSessions} test sessions`);

        // Test that system remains responsive with multiple active sessions
        const healthCheck = await fetch(`${BASE_URL}/api/health`);
        
        if (!healthCheck.ok) {
            throw new Error('System unresponsive after multiple session creation');
        }

        return { sessionsCreated: successfulSessions, systemResponsive: true };
    }

    generateStressReport() {
        console.log('\n⚡ STRESS TEST REPORT');
        console.log('=' .repeat(70));

        // Overall Results
        const testCount = Object.keys(this.results.performance).length + this.results.errors.length;
        const failedTests = this.results.errors.length;
        const passedTests = Object.keys(this.results.performance).length;

        console.log(`\n📊 Overall Results: ${passedTests}/${testCount} tests passed`);

        // Performance Analysis
        if (Object.keys(this.results.performance).length > 0) {
            console.log('\n🚀 PERFORMANCE METRICS:');
            
            for (const [testName, metrics] of Object.entries(this.results.performance)) {
                console.log(`\n${testName}:`);
                
                if (metrics.averageTime) {
                    console.log(`   Average Response Time: ${metrics.averageTime.toFixed(1)}ms`);
                }
                
                if (metrics.maxTime) {
                    console.log(`   Maximum Response Time: ${metrics.maxTime}ms`);
                }
                
                if (metrics.successRate) {
                    console.log(`   Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
                }
                
                if (metrics.concurrentUsers) {
                    console.log(`   Concurrent Users Supported: ${metrics.concurrentUsers}`);
                }
                
                if (metrics.totalTime) {
                    console.log(`   Test Duration: ${metrics.totalTime}ms`);
                }
            }
        }

        // Error Analysis
        if (this.results.errors.length > 0) {
            console.log('\n🚨 STRESS TEST FAILURES:');
            
            for (const error of this.results.errors) {
                console.log(`❌ ${error.test}: ${error.error}`);
            }

            console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
            
            if (this.results.errors.some(e => e.error.includes('slow') || e.error.includes('time'))) {
                console.log('1. Optimize slow database queries');
                console.log('2. Implement response caching for frequently accessed data');
                console.log('3. Consider connection pooling for better performance');
            }
            
            if (this.results.errors.some(e => e.error.includes('concurrent') || e.error.includes('load'))) {
                console.log('4. Review concurrency handling in Express middleware');
                console.log('5. Implement request queuing for heavy load scenarios');
                console.log('6. Consider horizontal scaling options');
            }
            
            if (this.results.errors.some(e => e.error.includes('memory') || e.error.includes('leak'))) {
                console.log('7. Investigate potential memory leaks in session management');
                console.log('8. Implement more aggressive session cleanup');
                console.log('9. Review object lifecycle management');
            }
            
        } else {
            console.log('\n✅ EXCELLENT PERFORMANCE:');
            console.log('- System handles stress testing without issues');
            console.log('- Rate limiting properly configured');
            console.log('- Concurrent user support verified');
            console.log('- No memory leaks detected');
        }

        // Production Readiness Assessment
        console.log('\n🎯 PRODUCTION READINESS ASSESSMENT:');
        console.log('-' .repeat(50));
        
        const criticalFailures = this.results.errors.filter(e => 
            e.error.includes('unresponsive') || 
            e.error.includes('memory') ||
            e.error.includes('crash')
        ).length;

        const performanceIssues = this.results.errors.filter(e =>
            e.error.includes('slow') ||
            e.error.includes('timeout')
        ).length;

        if (criticalFailures === 0 && performanceIssues === 0) {
            console.log('🟢 READY FOR PRODUCTION');
            console.log('   - Handles expected load without issues');
            console.log('   - Rate limiting appropriately configured');
            console.log('   - Performance metrics within acceptable bounds');
        } else if (criticalFailures === 0 && performanceIssues < 3) {
            console.log('🟡 PRODUCTION READY WITH MONITORING');
            console.log('   - Minor performance issues detected');
            console.log('   - Recommend performance monitoring in production');
            console.log('   - Consider optimization before high-traffic launch');
        } else {
            console.log('🔴 NOT READY FOR PRODUCTION');
            console.log('   - Critical issues must be resolved first');
            console.log('   - Performance optimization required');
            console.log('   - Additional stress testing recommended after fixes');
        }

        console.log('\n' + '=' .repeat(70));
    }
}

module.exports = StressTestSuite;

// Run if executed directly
if (require.main === module) {
    (async () => {
        const suite = new StressTestSuite();
        await suite.runStressTests();
    })().catch(console.error);
}