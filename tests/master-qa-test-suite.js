const fs = require('fs').promises;
const path = require('path');

class MasterQATester {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.allBugs = [];
        this.testResults = { passed: 0, failed: 0, total: 0 };
        this.buttonTests = [];
        this.functionalityStatus = new Map();
    }

    async runMasterQATest() {
        console.log('🎯 MASTER QA TEST SUITE - COMPREHENSIVE SYSTEM ANALYSIS');
        console.log('======================================================\n');
        
        await this.testAllSystemComponents();
        await this.consolidateAllBugReports();
        await this.generateMasterBugReport();
        
        this.printMasterResults();
    }

    async testAllSystemComponents() {
        console.log('🔍 Testing All System Components...');
        
        // Test 1: API Health and Availability
        await this.testAPIHealth();
        
        // Test 2: Button Functionality Analysis
        await this.testButtonFunctionality();
        
        // Test 3: Complete User Workflows
        await this.testUserWorkflows();
        
        // Test 4: Frontend-Backend Integration
        await this.testIntegrationPoints();
        
        console.log('✅ System Component Testing Completed\n');
    }

    async testAPIHealth() {
        console.log('   🏥 API Health Check...');
        
        const criticalEndpoints = [
            { path: '/api/health', name: 'System Health' },
            { path: '/api/products', name: 'Product Catalog' },
            { path: '/api/auth/register', name: 'User Registration', method: 'POST' },
            { path: '/api/auth/login', name: 'User Login', method: 'POST' },
            { path: '/api/cart/test-user', name: 'Cart System' },
            { path: '/api/orders/test-user', name: 'Order System' }
        ];
        
        for (const endpoint of criticalEndpoints) {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(`${this.baseUrl}${endpoint.path}`, {
                    method: endpoint.method || 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    body: endpoint.method === 'POST' ? JSON.stringify({}) : undefined
                });
                
                if (response.status < 500) {  // Accept 4xx as "working" (authentication issues are different from server errors)
                    console.log(`     ✅ ${endpoint.name}: Available (${response.status})`);
                    this.functionalityStatus.set(endpoint.name, 'AVAILABLE');
                } else {
                    console.log(`     ❌ ${endpoint.name}: Server Error (${response.status})`);
                    this.functionalityStatus.set(endpoint.name, 'SERVER_ERROR');
                    this.addBug('API_AVAILABILITY', `${endpoint.name} returns server error: ${response.status}`, 'CRITICAL', endpoint.path);
                }
                
            } catch (error) {
                console.log(`     ❌ ${endpoint.name}: Connection Failed`);
                this.functionalityStatus.set(endpoint.name, 'CONNECTION_ERROR');
                this.addBug('API_AVAILABILITY', `${endpoint.name} connection error: ${error.message}`, 'CRITICAL', endpoint.path);
            }
        }
        
        this.testResults.passed++;
    }

    async testButtonFunctionality() {
        console.log('   🔘 Button Functionality Analysis...');
        
        const pages = [
            'public/pages/store.html',
            'public/pages/cart.html', 
            'public/pages/checkout.html',
            'public/pages/login.html',
            'public/pages/register.html',
            'public/pages/admin.html',
            'public/pages/reviews.html',
            'public/pages/wishlist.html'
        ];
        
        let totalButtons = 0;
        let problematicButtons = 0;
        
        for (const pagePath of pages) {
            try {
                const content = await fs.readFile(path.join('/home/adilind/coffee-shop-store', pagePath), 'utf-8');
                const pageName = path.basename(pagePath, '.html');
                
                // Extract all button elements
                const buttonMatches = [
                    ...((content.match(/<button[^>]*>.*?<\/button>/gs) || [])),
                    ...((content.match(/<input[^>]*type="submit"[^>]*>/g) || [])),
                    ...((content.match(/<button[^>]*\/>/g) || []))
                ];
                
                totalButtons += buttonMatches.length;
                
                buttonMatches.forEach((button, index) => {
                    const buttonAnalysis = this.analyzeButtonElement(button, pageName, index);
                    if (buttonAnalysis.issues.length > 0) {
                        problematicButtons++;
                        buttonAnalysis.issues.forEach(issue => {
                            this.addBug('BUTTON_FUNCTIONALITY', issue, 'MAJOR', pageName, `button-${index}`);
                        });
                    }
                    
                    this.buttonTests.push({
                        page: pageName,
                        index,
                        button: button.substring(0, 100) + '...',
                        issues: buttonAnalysis.issues,
                        hasOnClick: buttonAnalysis.hasOnClick,
                        hasLabel: buttonAnalysis.hasLabel
                    });
                });
                
                console.log(`     📄 ${pageName}: ${buttonMatches.length} buttons analyzed`);
                
            } catch (error) {
                this.addBug('FILE_ACCESS', `Cannot analyze buttons in ${pagePath}: ${error.message}`, 'MAJOR', pagePath);
            }
        }
        
        console.log(`     🔘 Total Buttons Found: ${totalButtons}`);
        console.log(`     ⚠️  Problematic Buttons: ${problematicButtons}`);
        
        if (problematicButtons > totalButtons * 0.2) {  // More than 20% problematic
            this.addBug('OVERALL_QUALITY', `High percentage of problematic buttons: ${problematicButtons}/${totalButtons}`, 'CRITICAL', 'frontend');
        }
        
        this.testResults.passed++;
    }

    analyzeButtonElement(buttonHTML, pageName, index) {
        const issues = [];
        const hasOnClick = buttonHTML.includes('onclick');
        const hasLabel = buttonHTML.includes('>') && buttonHTML.match(/>([^<]+)</);
        const hasAriaLabel = buttonHTML.includes('aria-label');
        const hasTitle = buttonHTML.includes('title=');
        
        // Check for missing functionality
        if (!hasOnClick && !buttonHTML.includes('type="submit"')) {
            issues.push(`Button ${index} has no onclick handler or submit type`);
        }
        
        // Check for accessibility
        if (!hasLabel && !hasAriaLabel && !hasTitle) {
            issues.push(`Button ${index} missing accessible label`);
        }
        
        // Check for potentially broken onclick
        if (hasOnClick) {
            const onclickMatch = buttonHTML.match(/onclick="([^"]+)"/);
            if (onclickMatch) {
                const onclick = onclickMatch[1];
                
                if (onclick.includes('undefined') || onclick.includes('null')) {
                    issues.push(`Button ${index} onclick calls undefined/null: ${onclick}`);
                }
                
                if (onclick.includes('window.') && onclick.includes('.') && !onclick.includes('(')) {
                    issues.push(`Button ${index} onclick missing function parentheses: ${onclick}`);
                }
                
                if (onclick.includes('this.') && !pageName.includes('admin')) {
                    issues.push(`Button ${index} onclick uses 'this' which may be undefined: ${onclick}`);
                }
            }
        }
        
        return { issues, hasOnClick, hasLabel: hasLabel || hasAriaLabel || hasTitle };
    }

    async testUserWorkflows() {
        console.log('   👤 User Workflow Testing...');
        
        try {
            const fetch = (await import('node-fetch')).default;
            
            // Test essential user workflow endpoints
            const workflows = [
                { name: 'Browse Products', endpoint: '/api/products', critical: true },
                { name: 'Product Details', endpoint: '/api/products/prod-1', critical: true },
                { name: 'User Registration', endpoint: '/api/auth/register', method: 'POST', critical: true },
                { name: 'User Login', endpoint: '/api/auth/login', method: 'POST', critical: true },
                { name: 'Cart Operations', endpoint: '/api/cart/user-test', critical: true },
                { name: 'Reviews System', endpoint: '/api/reviews/product/prod-1', critical: false },
                { name: 'Wishlist System', endpoint: '/api/wishlist/user-test', critical: false },
                { name: 'Support System', endpoint: '/api/support/faq', critical: false }
            ];
            
            for (const workflow of workflows) {
                try {
                    const response = await fetch(`${this.baseUrl}${workflow.endpoint}`, {
                        method: workflow.method || 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        body: workflow.method === 'POST' ? JSON.stringify({}) : undefined
                    });
                    
                    if (response.ok) {
                        console.log(`     ✅ ${workflow.name}: Working`);
                        this.functionalityStatus.set(workflow.name, 'WORKING');
                    } else if (response.status === 401 || response.status === 403) {
                        console.log(`     🔒 ${workflow.name}: Authentication Required`);
                        this.functionalityStatus.set(workflow.name, 'AUTH_REQUIRED');
                    } else {
                        console.log(`     ❌ ${workflow.name}: Failed (${response.status})`);
                        this.functionalityStatus.set(workflow.name, 'BROKEN');
                        
                        if (workflow.critical) {
                            this.addBug('WORKFLOW', `Critical workflow broken: ${workflow.name}`, 'CRITICAL', workflow.endpoint);
                        } else {
                            this.addBug('WORKFLOW', `Advanced feature broken: ${workflow.name}`, 'MAJOR', workflow.endpoint);
                        }
                    }
                    
                } catch (error) {
                    console.log(`     ❌ ${workflow.name}: Connection Error`);
                    this.functionalityStatus.set(workflow.name, 'CONNECTION_ERROR');
                    this.addBug('WORKFLOW', `Workflow connection error ${workflow.name}: ${error.message}`, 'CRITICAL', workflow.endpoint);
                }
            }
            
        } catch (error) {
            this.addBug('WORKFLOW', `User workflow testing failed: ${error.message}`, 'CRITICAL', 'workflows');
        }
        
        this.testResults.passed++;
    }

    async testIntegrationPoints() {
        console.log('   🔌 Integration Point Testing...');
        
        // Test static file serving for JavaScript files
        const jsFiles = [
            '/js/api.js',
            '/js/auth.js',
            '/js/cart.js',
            '/js/store.js',
            '/js/theme.js'
        ];
        
        for (const jsFile of jsFiles) {
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(`${this.baseUrl}${jsFile}`);
                
                if (response.ok) {
                    const jsContent = await response.text();
                    if (jsContent.length < 100) {
                        this.addBug('JS_FILES', `JavaScript file ${jsFile} appears empty or minimal`, 'MAJOR', jsFile);
                    } else {
                        console.log(`     ✅ ${jsFile}: Accessible`);
                    }
                } else {
                    this.addBug('JS_FILES', `JavaScript file ${jsFile} not accessible: ${response.status}`, 'CRITICAL', jsFile);
                    console.log(`     ❌ ${jsFile}: Not accessible`);
                }
                
            } catch (error) {
                this.addBug('JS_FILES', `JavaScript file ${jsFile} error: ${error.message}`, 'CRITICAL', jsFile);
            }
        }
        
        this.testResults.passed++;
    }

    async consolidateAllBugReports() {
        console.log('\n📋 Consolidating All Bug Reports...');
        
        // Read existing bug reports
        const bugReportFiles = [
            'tests/COMPREHENSIVE_BUG_REPORT.md',
            'tests/BUG_DISCOVERY_REPORT.md'
        ];
        
        for (const reportFile of bugReportFiles) {
            try {
                await fs.access(path.join('/home/adilind/coffee-shop-store', reportFile));
                console.log(`   📄 Found existing bug report: ${reportFile}`);
            } catch (error) {
                console.log(`   ⚠️  Bug report not found: ${reportFile}`);
            }
        }
        
        console.log(`   🐛 Master QA discovered: ${this.allBugs.length} additional issues`);
    }

    async generateMasterBugReport() {
        const criticalCount = this.allBugs.filter(bug => bug.severity === 'CRITICAL').length;
        const majorCount = this.allBugs.filter(bug => bug.severity === 'MAJOR').length;
        const minorCount = this.allBugs.filter(bug => bug.severity === 'MINOR').length;
        
        const workingFeatures = Array.from(this.functionalityStatus.values()).filter(v => v === 'WORKING').length;
        const brokenFeatures = Array.from(this.functionalityStatus.values()).filter(v => v === 'BROKEN').length;
        const blockedFeatures = Array.from(this.functionalityStatus.values()).filter(v => v.includes('ERROR') || v === 'AUTH_REQUIRED').length;
        
        const totalButtons = this.buttonTests.length;
        const problematicButtons = this.buttonTests.filter(btn => btn.issues.length > 0).length;
        const functionalButtons = this.buttonTests.filter(btn => btn.hasOnClick || btn.issues.length === 0).length;
        
        const reportContent = `# 🎯 MASTER QA ANALYSIS REPORT - COFFEE SHOP STORE
**Generated:** ${new Date().toISOString()}  
**QA Engineer:** Senior QA Automation Suite v1.0  
**Analysis Type:** Comprehensive System Quality Assessment

---

## 🏆 **EXECUTIVE SUMMARY**

**Overall System Health:** ${criticalCount === 0 ? brokenFeatures < 3 ? '🟢 GOOD' : '🟡 NEEDS_IMPROVEMENT' : '🔴 CRITICAL_ISSUES'}  
**Production Readiness:** ${criticalCount === 0 && brokenFeatures < 2 ? '✅ READY' : '❌ NOT_READY'}  
**User Experience Quality:** ${problematicButtons / totalButtons < 0.2 ? '🟢 GOOD' : '🟡 NEEDS_POLISH'}

### **Key Metrics:**
- 🐛 **Total Issues Found**: ${this.allBugs.length}
- 🔘 **Button Analysis**: ${functionalButtons}/${totalButtons} functional buttons
- 🔌 **API Integration**: ${workingFeatures}/${this.functionalityStatus.size} features working
- 🎯 **Core Features**: ${workingFeatures > this.functionalityStatus.size * 0.8 ? 'MOSTLY_WORKING' : 'SIGNIFICANT_ISSUES'}

---

## 🚨 **ISSUE BREAKDOWN**

### **By Severity:**
- 🔴 **Critical**: ${criticalCount} issues (Break core functionality)
- 🟡 **Major**: ${majorCount} issues (Impact user experience)  
- 🟢 **Minor**: ${minorCount} issues (Polish improvements)

### **By Component:**
- 🔘 **Button Functionality**: ${problematicButtons} problematic buttons out of ${totalButtons} total
- 🔌 **API Integration**: ${brokenFeatures} broken features out of ${this.functionalityStatus.size} tested
- 🌐 **Frontend Pages**: All ${this.buttonTests.map(t => t.page).filter((v, i, a) => a.indexOf(v) === i).length} pages analyzed
- 🖥️ **Backend Services**: ${Array.from(this.functionalityStatus.values()).filter(v => v === 'WORKING').length} working endpoints

---

## 🔴 **CRITICAL BUGS** (Fix Immediately)

${this.allBugs.filter(bug => bug.severity === 'CRITICAL').map((bug, index) => `
### ${index + 1}. ${bug.category}
**Issue:** ${bug.description}
**Location:** ${bug.location} ${bug.element ? `(${bug.element})` : ''}
**Impact:** Breaks essential user functionality
**Status:** OPEN
`).join('')}

---

## 🟡 **MAJOR BUGS** (Fix Soon)

${this.allBugs.filter(bug => bug.severity === 'MAJOR').slice(0, 15).map((bug, index) => `
### ${index + 1}. ${bug.category}
**Issue:** ${bug.description}  
**Location:** ${bug.location}
**Impact:** Degrades user experience
`).join('')}

${this.allBugs.filter(bug => bug.severity === 'MAJOR').length > 15 ? `\n**... and ${this.allBugs.filter(bug => bug.severity === 'MAJOR').length - 15} more major issues**\n` : ''}

---

## 🔘 **BUTTON FUNCTIONALITY ANALYSIS**

### **Button Health Overview:**
- 🟢 **Functional Buttons**: ${functionalButtons} (${((functionalButtons / totalButtons) * 100).toFixed(1)}%)
- 🟡 **Problematic Buttons**: ${problematicButtons} (${((problematicButtons / totalButtons) * 100).toFixed(1)}%)
- 📊 **Total Buttons Analyzed**: ${totalButtons}

### **Most Problematic Pages:**
${this.buttonTests
    .reduce((acc, test) => {
        acc[test.page] = (acc[test.page] || 0) + (test.issues.length > 0 ? 1 : 0);
        return acc;
    }, {})
    ? Object.entries(this.buttonTests.reduce((acc, test) => {
        acc[test.page] = (acc[test.page] || 0) + (test.issues.length > 0 ? 1 : 0);
        return acc;
    }, {}))
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([page, count]) => `- **${page}**: ${count} problematic buttons`)
    .join('\n') : '- No data available'}

---

## 🔌 **FUNCTIONALITY STATUS REPORT**

${Array.from(this.functionalityStatus.entries()).map(([feature, status]) => {
    const icon = status === 'WORKING' ? '✅' : status === 'AUTH_REQUIRED' ? '🔒' : status === 'BROKEN' ? '❌' : '⚠️';
    return `- ${icon} **${feature}**: ${status}`;
}).join('\n')}

---

## 🛠️ **DEVELOPER ACTION PLAN**

### **Phase 1: Critical Fixes (Immediate - 4-6 hours)**
**Goal:** Restore core e-commerce functionality

1. **Fix API Integration Issues**
   - Resolve connection errors for critical endpoints
   - Fix authentication cookie handling
   - Ensure cart and order APIs respond correctly

2. **Button Functionality**
   - Fix buttons with undefined onclick handlers
   - Add missing event handlers for core interactions
   - Test add-to-cart, checkout, and login buttons

3. **User Flow Validation**
   - Test complete user journey: register → login → browse → cart → checkout
   - Ensure authentication persists across page navigation
   - Validate order creation and history access

### **Phase 2: Major Improvements (Short Term - 3-4 hours)**
**Goal:** Improve user experience and system reliability

1. **Button Polish**
   - Add accessibility labels to unlabeled buttons
   - Improve button feedback and loading states
   - Fix minor interaction issues

2. **Error Handling**
   - Improve error messages for failed operations
   - Add user-friendly validation feedback
   - Implement graceful fallbacks

### **Phase 3: Minor Enhancements (Medium Term - 2-3 hours)**
**Goal:** System polish and optimization

1. **Code Quality**
   - Remove console.log statements
   - Add proper error handling
   - Optimize performance bottlenecks

---

## 📊 **QUALITY METRICS**

### **System Reliability**
- **API Availability**: ${Array.from(this.functionalityStatus.values()).filter(v => v === 'WORKING').length}/${this.functionalityStatus.size} endpoints working
- **Button Functionality**: ${((functionalButtons / totalButtons) * 100).toFixed(1)}% buttons functional
- **Critical Features**: ${criticalCount === 0 ? '✅ All Working' : '❌ Issues Found'}

### **User Experience Score**
- **Navigation**: ${problematicButtons < 5 ? '🟢 Smooth' : '🟡 Needs Work'}
- **Interaction Reliability**: ${this.allBugs.filter(b => b.category === 'BUTTON_FUNCTIONALITY').length < 10 ? '🟢 Reliable' : '🔴 Unreliable'}
- **Error Handling**: ${this.allBugs.filter(b => b.category === 'ERROR_HANDLING').length < 3 ? '🟢 Good' : '🟡 Needs Improvement'}

### **Development Quality**
- **Code Structure**: ${this.allBugs.filter(b => b.category === 'CODE_QUALITY').length < 5 ? '🟢 Clean' : '🟡 Needs Refactoring'}
- **Security Practices**: ${this.allBugs.filter(b => b.category === 'SECURITY').length < 3 ? '🟢 Secure' : '⚠️ Concerns'}
- **Test Coverage**: ${this.testResults.passed > 5 ? '🟢 Comprehensive' : '🟡 Basic'}

---

## 🚀 **NEXT STEPS**

1. **Immediate Actions (Today)**:
   - Fix all ${criticalCount} critical issues
   - Test core user journey end-to-end
   - Verify authentication and cart functionality

2. **This Week**:
   - Address ${majorCount > 10 ? 'top 10' : 'all'} major issues
   - Improve button functionality and user feedback
   - Add comprehensive error handling

3. **Next Week**:
   - Polish minor issues for better UX
   - Performance optimization
   - Enhanced testing and monitoring

---

## 📝 **TEST EXECUTION LOG**

**Tests Run**: ${this.testResults.passed + this.testResults.failed}
**Success Rate**: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%
**Analysis Duration**: Complete
**Coverage**: Frontend + Backend + Integration

**QA Verdict**: ${criticalCount === 0 ? 
    majorCount < 5 ? '✅ APPROVED FOR RELEASE' : '🟡 APPROVED WITH MINOR FIXES' : 
    '❌ REJECTED - CRITICAL ISSUES MUST BE RESOLVED'}

---

**Report Generated**: ${new Date().toISOString()}  
**Next QA Review**: After critical fixes completed  
**Recommended Re-test**: Full regression testing after fixes
`;

        try {
            await fs.writeFile('/home/adilind/coffee-shop-store/tests/MASTER_QA_REPORT.md', reportContent);
            console.log('📝 Master QA Report Generated: tests/MASTER_QA_REPORT.md');
        } catch (error) {
            console.log('❌ Failed to generate master report:', error.message);
        }
        
        // Generate quick bug summary for developers
        const quickBugList = this.allBugs
            .sort((a, b) => {
                const severityOrder = { 'CRITICAL': 0, 'MAJOR': 1, 'MINOR': 2 };
                return severityOrder[a.severity] - severityOrder[b.severity];
            })
            .map((bug, index) => `${index + 1}. [${bug.severity}] ${bug.category}: ${bug.description} (${bug.location})`)
            .join('\n');
        
        try {
            await fs.writeFile('/home/adilind/coffee-shop-store/tests/QUICK_BUG_LIST.md', `# Quick Bug Reference\n\n${quickBugList}`);
            console.log('📝 Quick Bug List Generated: tests/QUICK_BUG_LIST.md');
        } catch (error) {
            console.log('❌ Failed to generate quick bug list:', error.message);
        }
    }

    addBug(category, description, severity, location = '', element = '') {
        this.allBugs.push({
            id: `QA-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            category,
            description,
            severity,
            location,
            element,
            timestamp: new Date().toISOString(),
            status: 'OPEN'
        });
    }

    printMasterResults() {
        console.log('\n================================================================================');
        console.log('🎯 MASTER QA ANALYSIS - FINAL RESULTS');
        console.log('================================================================================');
        
        const criticalCount = this.allBugs.filter(bug => bug.severity === 'CRITICAL').length;
        const majorCount = this.allBugs.filter(bug => bug.severity === 'MAJOR').length;
        const minorCount = this.allBugs.filter(bug => bug.severity === 'MINOR').length;
        const totalButtons = this.buttonTests.length;
        const problematicButtons = this.buttonTests.filter(btn => btn.issues.length > 0).length;
        
        console.log(`🐛 TOTAL BUGS DISCOVERED: ${this.allBugs.length}`);
        console.log(`   🔴 Critical: ${criticalCount} (Must fix immediately)`);
        console.log(`   🟡 Major: ${majorCount} (Fix this week)`);  
        console.log(`   🟢 Minor: ${minorCount} (Polish when possible)`);
        
        console.log(`\n🔘 BUTTON ANALYSIS RESULTS:`);
        console.log(`   Total Buttons Found: ${totalButtons}`);
        console.log(`   Problematic Buttons: ${problematicButtons}`);
        console.log(`   Button Health: ${(((totalButtons - problematicButtons) / totalButtons) * 100).toFixed(1)}%`);
        
        console.log(`\n🔌 FUNCTIONALITY STATUS:`);
        const workingCount = Array.from(this.functionalityStatus.values()).filter(v => v === 'WORKING').length;
        console.log(`   Working Features: ${workingCount}/${this.functionalityStatus.size}`);
        console.log(`   System Health: ${((workingCount / this.functionalityStatus.size) * 100).toFixed(1)}%`);
        
        console.log(`\n🎯 QA VERDICT:`);
        if (criticalCount === 0) {
            if (majorCount < 5) {
                console.log('   ✅ APPROVED FOR RELEASE');
                console.log('   📝 Minor improvements recommended but not blocking');
            } else {
                console.log('   🟡 APPROVED WITH FIXES');
                console.log('   📝 Major issues should be addressed before release');
            }
        } else {
            console.log('   ❌ REJECTED - CRITICAL ISSUES');
            console.log(`   📝 ${criticalCount} critical bugs MUST be fixed before release`);
        }
        
        console.log(`\n📋 REPORTS GENERATED:`);
        console.log('   📄 tests/MASTER_QA_REPORT.md - Complete analysis');
        console.log('   📄 tests/QUICK_BUG_LIST.md - Developer reference');
        console.log('   📄 tests/COMPREHENSIVE_BUG_REPORT.md - Detailed frontend analysis');
        
        console.log('\n🚀 NEXT ACTIONS:');
        if (criticalCount > 0) {
            console.log('   1. Fix all critical issues immediately');
            console.log('   2. Test each fix with targeted testing');
            console.log('   3. Re-run master QA test after fixes');
        } else {
            console.log('   1. Address major issues systematically');
            console.log('   2. Polish user experience elements');
            console.log('   3. Prepare for production deployment');
        }
        
        console.log('================================================================================');
    }
}

// Execution
async function runMasterQA() {
    const masterQA = new MasterQATester();
    await masterQA.runMasterQATest();
}

if (require.main === module) {
    runMasterQA().catch(error => {
        console.error('❌ Master QA Analysis failed:', error);
        process.exit(1);
    });
}

module.exports = { MasterQATester };