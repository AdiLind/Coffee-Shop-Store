# Phase 3: Authentication System - Implementation Prompt

## 🎯 **Project Status: Phase 2 ✅ COMPLETED**
- ✅ Complete routing infrastructure with all API endpoints
- ✅ Enhanced persistence module with full CRUD operations
- ✅ Professional HTML templates with coffee shop styling
- ✅ Working product API with search and filtering
- ✅ Responsive CSS framework
- ✅ Comprehensive API testing system

## 🔐 **Phase 3 Goal: Implement Complete User Authentication**

Transform your coffee shop into a fully interactive application with user accounts, secure login/registration, session management, and protected routes. This phase enables shopping carts, order history, and personalized experiences.

---

## 📋 **Phase 3 Implementation Tasks**

### **Task 1: Create Authentication Middleware & Security**

Build robust authentication middleware to protect routes and manage user sessions:

**File: `server/middleware/auth-middleware.js`**
```javascript
const persistenceManager = require('../modules/persist_module');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class AuthMiddleware {
    // Verify if user is authenticated
    static async requireAuth(req, res, next) {
        try {
            const token = req.cookies.authToken;
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: 'Unauthorized',
                    message: 'Authentication required. Please login.',
                    redirectTo: '/pages/login.html'
                });
            }

            // Verify token and get user
            const user = await AuthMiddleware.verifyToken(token);
            if (!user) {
                res.clearCookie('authToken');
                return res.status(401).json({
                    success: false,
                    error: 'Invalid session',
                    message: 'Session expired. Please login again.',
                    redirectTo: '/pages/login.html'
                });
            }

            // Add user to request
            req.user = user;
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'Authentication error',
                message: 'Unable to verify authentication'
            });
        }
    }

    // Verify if user is admin
    static async requireAdmin(req, res, next) {
        try {
            await AuthMiddleware.requireAuth(req, res, () => {
                if (req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        error: 'Forbidden',
                        message: 'Admin access required'
                    });
                }
                next();
            });
        } catch (error) {
            next(error);
        }
    }

    // Optional auth - user can be logged in or not
    static async optionalAuth(req, res, next) {
        try {
            const token = req.cookies.authToken;
            if (token) {
                const user = await AuthMiddleware.verifyToken(token);
                req.user = user; // Will be null if token is invalid
            }
            next();
        } catch (error) {
            // Continue without auth if there's an error
            req.user = null;
            next();
        }
    }

    // Verify token and return user
    static async verifyToken(token) {
        try {
            const sessions = await persistenceManager.readData('sessions');
            const session = sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
            
            if (!session) {
                return null;
            }

            // Get user details
            const users = await persistenceManager.getUsers();
            const user = users.find(u => u.id === session.userId);
            
            if (!user) {
                return null;
            }

            // Return user without password
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        } catch (error) {
            console.error('Token verification error:', error);
            return null;
        }
    }

    // Create session token
    static async createSession(userId, rememberMe = false) {
        try {
            const token = uuidv4();
            const now = new Date();
            const expiresAt = new Date(now.getTime() + (rememberMe ? 12 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000)); // 12 days or 30 minutes
            
            const session = {
                id: uuidv4(),
                token,
                userId,
                createdAt: now.toISOString(),
                expiresAt: expiresAt.toISOString(),
                rememberMe
            };

            const sessions = await persistenceManager.readData('sessions');
            
            // Remove old sessions for this user
            const filteredSessions = sessions.filter(s => s.userId !== userId);
            filteredSessions.push(session);
            
            await persistenceManager.writeData('sessions', filteredSessions);
            
            return { token, expiresAt };
        } catch (error) {
            console.error('Session creation error:', error);
            throw error;
        }
    }

    // Destroy session
    static async destroySession(token) {
        try {
            const sessions = await persistenceManager.readData('sessions');
            const filteredSessions = sessions.filter(s => s.token !== token);
            await persistenceManager.writeData('sessions', filteredSessions);
            return true;
        } catch (error) {
            console.error('Session destruction error:', error);
            return false;
        }
    }

    // Clean up expired sessions
    static async cleanupSessions() {
        try {
            const sessions = await persistenceManager.readData('sessions');
            const activeSessions = sessions.filter(s => new Date(s.expiresAt) > new Date());
            await persistenceManager.writeData('sessions', activeSessions);
            console.log(`🧹 Cleaned up ${sessions.length - activeSessions.length} expired sessions`);
        } catch (error) {
            console.error('Session cleanup error:', error);
        }
    }
}

module.exports = AuthMiddleware;
```

**File: `server/middleware/rate-limiter.js`** (DOS Protection)
```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests',
        message: 'Too many API requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 auth requests per windowMs
    message: {
        success: false,
        error: 'Too many authentication attempts',
        message: 'Too many login/registration attempts, please try again later.'
    }
});

module.exports = {
    apiLimiter,
    authLimiter
};
```

### **Task 2: Implement Complete Authentication Routes**

Build comprehensive user authentication with registration, login, and session management:

**File: `server/routes/auth.js`**
```javascript
const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const persistenceManager = require('../modules/persist_module');
const AuthMiddleware = require('../middleware/auth-middleware');
const ErrorHandler = require('../modules/error-handler');

// POST /api/auth/register - User registration
router.post('/register', ErrorHandler.asyncWrapper(async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({
            success: false,
            error: 'Missing fields',
            message: 'All fields are required: username, email, password, confirmPassword'
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            error: 'Password mismatch',
            message: 'Password and confirm password do not match'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            error: 'Weak password',
            message: 'Password must be at least 6 characters long'
        });
    }

    // Check if user already exists
    const users = await persistenceManager.getUsers();
    const existingUser = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() || 
        u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
        return res.status(409).json({
            success: false,
            error: 'User exists',
            message: 'Username or email already exists'
        });
    }

    // Hash password and create user
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
        id: uuidv4(),
        username,
        email,
        password: hashedPassword,
        role: 'user',
        preferences: {
            theme: 'light',
            language: 'en'
        },
        createdAt: new Date().toISOString(),
        lastLogin: null
    };

    await persistenceManager.addUser(newUser);
    
    // Log activity
    await persistenceManager.logActivity(username, 'register');

    // Return user without password
    const { password: _, ...userResponse } = newUser;

    res.status(201).json({
        success: true,
        data: userResponse,
        message: 'User registered successfully'
    });
}));

// POST /api/auth/login - User login
router.post('/login', ErrorHandler.asyncWrapper(async (req, res) => {
    const { username, password, rememberMe } = req.body;

    // Validation
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            error: 'Missing credentials',
            message: 'Username and password are required'
        });
    }

    // Find user
    const users = await persistenceManager.getUsers();
    const user = users.find(u => 
        u.username.toLowerCase() === username.toLowerCase() || 
        u.email.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials',
            message: 'Invalid username or password'
        });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({
            success: false,
            error: 'Invalid credentials',
            message: 'Invalid username or password'
        });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    await persistenceManager.saveUsers(users);

    // Create session
    const { token, expiresAt } = await AuthMiddleware.createSession(user.id, rememberMe);

    // Set cookie
    res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: rememberMe ? 12 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000, // 12 days or 30 minutes
        sameSite: 'strict'
    });

    // Log activity
    await persistenceManager.logActivity(user.username, 'login');

    // Return user without password
    const { password: _, ...userResponse } = user;

    res.json({
        success: true,
        data: userResponse,
        message: 'Login successful',
        sessionExpiresAt: expiresAt
    });
}));

// POST /api/auth/logout - User logout
router.post('/logout', AuthMiddleware.requireAuth, ErrorHandler.asyncWrapper(async (req, res) => {
    const token = req.cookies.authToken;
    
    // Destroy session
    await AuthMiddleware.destroySession(token);
    
    // Clear cookie
    res.clearCookie('authToken');
    
    // Log activity
    await persistenceManager.logActivity(req.user.username, 'logout');

    res.json({
        success: true,
        message: 'Logout successful'
    });
}));

// GET /api/auth/profile - Get current user profile
router.get('/profile', AuthMiddleware.requireAuth, (req, res) => {
    res.json({
        success: true,
        data: req.user,
        message: 'Profile retrieved successfully'
    });
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', AuthMiddleware.requireAuth, ErrorHandler.asyncWrapper(async (req, res) => {
    const { email, preferences } = req.body;
    const userId = req.user.id;

    const users = await persistenceManager.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'User not found',
            message: 'User profile not found'
        });
    }

    // Update user data
    if (email) users[userIndex].email = email;
    if (preferences) users[userIndex].preferences = { ...users[userIndex].preferences, ...preferences };
    
    users[userIndex].updatedAt = new Date().toISOString();

    await persistenceManager.saveUsers(users);

    // Return updated user without password
    const { password: _, ...updatedUser } = users[userIndex];

    res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully'
    });
}));

module.exports = router;
```

### **Task 3: Create Interactive Frontend Authentication**

Build complete frontend JavaScript for user authentication and UI management:

**File: `public/js/auth.js`**
```javascript
// Frontend Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.apiClient = new APIClient();
        this.init();
    }

    async init() {
        // Check if user is logged in on page load
        await this.checkAuthStatus();
        this.updateUI();
        this.setupEventListeners();
    }

    // Check current authentication status
    async checkAuthStatus() {
        try {
            const response = await this.apiClient.request('/auth/profile');
            if (response.success) {
                this.currentUser = response.data;
                return true;
            }
        } catch (error) {
            console.log('Not authenticated');
        }
        this.currentUser = null;
        return false;
    }

    // User registration
    async register(userData) {
        try {
            const response = await this.apiClient.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            if (response.success) {
                this.showMessage('Registration successful! Please login.', 'success');
                return response;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            this.showMessage(error.message || 'Registration failed', 'error');
            throw error;
        }
    }

    // User login
    async login(credentials) {
        try {
            const response = await this.apiClient.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (response.success) {
                this.currentUser = response.data;
                this.updateUI();
                this.showMessage('Login successful!', 'success');
                
                // Redirect to store or intended page
                setTimeout(() => {
                    window.location.href = '/pages/store.html';
                }, 1000);
                
                return response;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            this.showMessage(error.message || 'Login failed', 'error');
            throw error;
        }
    }

    // User logout
    async logout() {
        try {
            await this.apiClient.request('/auth/logout', {
                method: 'POST'
            });
            
            this.currentUser = null;
            this.updateUI();
            this.showMessage('Logged out successfully', 'success');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '/pages/login.html';
            }, 1000);
        } catch (error) {
            this.showMessage('Logout failed', 'error');
        }
    }

    // Update UI based on authentication status
    updateUI() {
        const authElements = document.querySelectorAll('[data-auth]');
        const noAuthElements = document.querySelectorAll('[data-no-auth]');
        const adminElements = document.querySelectorAll('[data-admin]');

        // Show/hide elements based on auth status
        authElements.forEach(el => {
            el.style.display = this.currentUser ? 'block' : 'none';
        });

        noAuthElements.forEach(el => {
            el.style.display = this.currentUser ? 'none' : 'block';
        });

        // Show/hide admin elements
        adminElements.forEach(el => {
            el.style.display = (this.currentUser && this.currentUser.role === 'admin') ? 'block' : 'none';
        });

        // Update user info displays
        const userInfoElements = document.querySelectorAll('[data-user-info]');
        userInfoElements.forEach(el => {
            const field = el.dataset.userInfo;
            if (this.currentUser && this.currentUser[field]) {
                el.textContent = this.currentUser[field];
            }
        });

        // Update navigation
        this.updateNavigation();
    }

    // Update navigation menu
    updateNavigation() {
        const navContainer = document.querySelector('.nav-user-section');
        if (!navContainer) return;

        if (this.currentUser) {
            navContainer.innerHTML = `
                <span class="nav-welcome">Welcome, ${this.currentUser.username}!</span>
                <a href="/pages/cart.html" class="nav-link">Cart</a>
                <a href="/pages/my-orders.html" class="nav-link">My Orders</a>
                ${this.currentUser.role === 'admin' ? '<a href="/pages/admin.html" class="nav-link">Admin</a>' : ''}
                <button class="btn btn-secondary btn-sm" onclick="authManager.logout()">Logout</button>
            `;
        } else {
            navContainer.innerHTML = `
                <a href="/pages/login.html" class="btn btn-primary btn-sm">Login</a>
                <a href="/pages/register.html" class="btn btn-secondary btn-sm">Register</a>
            `;
        }
    }

    // Setup form event listeners
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(loginForm);
                const credentials = {
                    username: formData.get('username'),
                    password: formData.get('password'),
                    rememberMe: formData.get('rememberMe') === 'on'
                };
                
                await this.login(credentials);
            });
        }

        // Registration form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(registerForm);
                const userData = {
                    username: formData.get('username'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    confirmPassword: formData.get('confirmPassword')
                };
                
                await this.register(userData);
            });
        }
    }

    // Show user messages
    showMessage(message, type = 'info') {
        // Create or update message container
        let messageContainer = document.querySelector('.auth-messages');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.className = 'auth-messages';
            document.body.insertBefore(messageContainer, document.body.firstChild);
        }

        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        messageContainer.appendChild(messageEl);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageEl.remove();
        }, 5000);
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Check if user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    // Require authentication (redirect if not authenticated)
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.showMessage('Please login to access this page', 'warning');
            setTimeout(() => {
                window.location.href = '/pages/login.html';
            }, 2000);
            return false;
        }
        return true;
    }

    // Require admin access
    requireAdmin() {
        if (!this.requireAuth()) return false;
        
        if (!this.isAdmin()) {
            this.showMessage('Admin access required', 'error');
            setTimeout(() => {
                window.location.href = '/pages/store.html';
            }, 2000);
            return false;
        }
        return true;
    }
}

// Initialize authentication manager globally
window.authManager = new AuthManager();
```

### **Task 4: Update HTML Templates with Authentication**

Enhance your HTML templates with authentication functionality:

**File: `public/pages/login.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Coffee Shop</title>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/components.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>☕ Coffee Shop Login</h1>
            <p>Sign in to your account</p>
        </header>

        <nav class="navbar">
            <ul class="nav-menu">
                <li class="nav-item"><a href="/pages/store.html">Store</a></li>
                <li class="nav-item"><a href="/pages/register.html">Register</a></li>
                <li class="nav-item nav-user-section"></li>
            </ul>
        </nav>

        <main class="main">
            <div class="form-container">
                <h2>Welcome Back!</h2>
                
                <form id="loginForm" class="auth-form">
                    <div class="form-group">
                        <label for="username">Username or Email</label>
                        <input type="text" id="username" name="username" required 
                               placeholder="Enter your username or email">
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required 
                               placeholder="Enter your password" minlength="6">
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <input type="checkbox" id="rememberMe" name="rememberMe">
                        <label for="rememberMe">Remember me (12 days)</label>
                        <small>Unchecked sessions expire in 30 minutes</small>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-full">Login</button>
                </form>
                
                <div class="auth-links">
                    <p>Don't have an account? <a href="/pages/register.html">Register here</a></p>
                    <p><a href="/pages/store.html">Continue as guest</a></p>
                </div>

                <div class="admin-info">
                    <h4>Demo Admin Account:</h4>
                    <p>Username: <strong>admin</strong></p>
                    <p>Password: <strong>admin</strong></p>
                </div>
            </div>
        </main>
    </div>

    <!-- Scripts -->
    <script src="/js/utils.js"></script>
    <script src="/js/api.js"></script>
    <script src="/js/auth.js"></script>
</body>
</html>
```

**File: `public/pages/register.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - Coffee Shop</title>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/components.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>☕ Join Our Coffee Community</h1>
            <p>Create your account to start shopping</p>
        </header>

        <nav class="navbar">
            <ul class="nav-menu">
                <li class="nav-item"><a href="/pages/store.html">Store</a></li>
                <li class="nav-item"><a href="/pages/login.html">Login</a></li>
                <li class="nav-item nav-user-section"></li>
            </ul>
        </nav>

        <main class="main">
            <div class="form-container">
                <h2>Create Account</h2>
                
                <form id="registerForm" class="auth-form">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" name="username" required 
                               placeholder="Choose a username" minlength="3">
                        <small>At least 3 characters</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" name="email" required 
                               placeholder="Enter your email address">
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required 
                               placeholder="Create a secure password" minlength="6">
                        <small>At least 6 characters</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" required 
                               placeholder="Confirm your password" minlength="6">
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-full">Create Account</button>
                </form>
                
                <div class="auth-links">
                    <p>Already have an account? <a href="/pages/login.html">Login here</a></p>
                </div>
            </div>
        </main>
    </div>

    <!-- Scripts -->
    <script src="/js/utils.js"></script>
    <script src="/js/api.js"></script>
    <script src="/js/auth.js"></script>
</body>
</html>
```

### **Task 5: Update Store Page with Authentication**

Enhance the store page to work with authenticated and guest users:

**File: `public/pages/store.html`** (Updated)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coffee Shop - Premium Coffee & Equipment</title>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/components.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>☕ Coffee Shop Store</h1>
            <p>Premium coffee machines, beans, and accessories</p>
        </header>

        <nav class="navbar">
            <ul class="nav-menu">
                <li class="nav-item"><a href="/pages/store.html">Store</a></li>
                <li class="nav-item nav-user-section"></li>
            </ul>
        </nav>

        <main class="main">
            <!-- Search and Filter Section -->
            <div class="store-controls">
                <div class="search-section">
                    <input type="text" id="searchInput" placeholder="Search for coffee products..." 
                           class="search-input">
                    <button onclick="storeManager.searchProducts()" class="btn btn-primary">Search</button>
                </div>
                
                <div class="filter-section">
                    <select id="categoryFilter" onchange="storeManager.filterByCategory(this.value)">
                        <option value="">All Categories</option>
                        <option value="machines">Coffee Machines</option>
                        <option value="beans">Coffee Beans</option>
                        <option value="accessories">Accessories</option>
                    </select>
                </div>
            </div>

            <!-- Products Grid -->
            <div id="productsGrid" class="products-grid">
                <!-- Products will be loaded here -->
            </div>

            <!-- Guest Warning -->
            <div id="guestWarning" class="message message-warning" data-no-auth style="display: none;">
                <p>You're browsing as a guest. <a href="/pages/login.html">Login</a> to add items to your cart!</p>
            </div>
        </main>
    </div>

    <!-- Scripts -->
    <script src="/js/utils.js"></script>
    <script src="/js/api.js"></script>
    <script src="/js/auth.js"></script>
    <script src="/js/store.js"></script>
</body>
</html>
```

### **Task 6: Enhanced CSS for Authentication**

Add styles for authentication forms and messages:

**File: `public/css/components.css`** (New file)
```css
/* Authentication Components */
.auth-form {
    margin: 2rem 0;
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
    transition: border-color 0.3s;
}

.form-group input:focus {
    outline: none;
    border-color: var(--coffee-brown);
    box-shadow: 0 0 5px rgba(74, 44, 36, 0.3);
}

.form-group small {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #666;
}

.checkbox-group {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
}

.checkbox-group input[type="checkbox"] {
    width: auto;
    margin: 0;
}

.checkbox-group label {
    margin: 0;
    font-weight: normal;
    flex: 1;
}

.btn-full {
    width: 100%;
    margin: 1rem 0;
}

.btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
}

/* Auth Links */
.auth-links {
    text-align: center;
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid #eee;
}

.auth-links p {
    margin: 0.5rem 0;
}

.auth-links a {
    color: var(--coffee-brown);
    text-decoration: none;
    font-weight: bold;
}

.auth-links a:hover {
    text-decoration: underline;
}

/* Admin Info */
.admin-info {
    background: var(--cream);
    padding: 1rem;
    border-radius: 5px;
    margin-top: 2rem;
    border-left: 4px solid var(--accent);
}

.admin-info h4 {
    margin: 0 0 0.5rem 0;
    color: var(--coffee-brown);
}

.admin-info p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
}

/* Messages */
.auth-messages {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    max-width: 400px;
}

.message {
    padding: 1rem;
    border-radius: 5px;
    margin-bottom: 0.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease;
}

.message-success {
    background-color: #d4edda;
    color: #155724;
    border-left: 4px solid #28a745;
}

.message-error {
    background-color: #f8d7da;
    color: #721c24;
    border-left: 4px solid #dc3545;
}

.message-warning {
    background-color: #fff3cd;
    color: #856404;
    border-left: 4px solid #ffc107;
}

.message-info {
    background-color: #cce7ff;
    color: #004085;
    border-left: 4px solid #007bff;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Navigation User Section */
.nav-welcome {
    color: var(--cream);
    margin-right: 1rem;
    font-weight: bold;
}

.nav-user-section {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* Store Components */
.store-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 2rem 0;
    padding: 1rem;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.search-section {
    display: flex;
    gap: 0.5rem;
    flex: 1;
}

.search-input {
    flex: 1;
    max-width: 400px;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 5px;
    font-size: 1rem;
}

.filter-section select {
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 5px;
    font-size: 1rem;
    background: white;
}

.products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
}

.product-card {
    background: white;
    border-radius: 10px;
    padding: 1.5rem;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    transition: transform 0.3s, box-shadow 0.3s;
}

.product-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.product-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 5px;
    margin-bottom: 1rem;
}

.product-title {
    font-size: 1.25rem;
    font-weight: bold;
    color: var(--dark-roast);
    margin-bottom: 0.5rem;
}

.product-description {
    color: #666;
    margin-bottom: 1rem;
    line-height: 1.4;
}

.product-price {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--coffee-brown);
    margin-bottom: 1rem;
}

.product-actions {
    display: flex;
    gap: 0.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
    .store-controls {
        flex-direction: column;
        gap: 1rem;
    }
    
    .search-section {
        width: 100%;
    }
    
    .auth-messages {
        left: 20px;
        right: 20px;
        max-width: none;
    }
    
    .nav-user-section {
        flex-direction: column;
        align-items: stretch;
        gap: 0.25rem;
    }
}
```

### **Task 7: Update Application Integration**

Update the main app.js to integrate authentication:

**Add to `server/app.js`:**
```javascript
// Add at the top with other imports
const { apiLimiter, authLimiter } = require('./middleware/rate-limiter');
const AuthMiddleware = require('./middleware/auth-middleware');

// Add after basic middleware setup
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Cleanup expired sessions every hour
setInterval(async () => {
    await AuthMiddleware.cleanupSessions();
}, 60 * 60 * 1000);
```

---

## 🎯 **Phase 3 Success Criteria**

After Phase 3 completion, you should have:

- ✅ **Complete user registration** with validation and password hashing
- ✅ **Secure login system** with "Remember Me" functionality (12 days vs 30 minutes)
- ✅ **Cookie-based session management** with automatic cleanup
- ✅ **Protected routes** requiring authentication
- ✅ **Admin role system** with role-based access control
- ✅ **Interactive frontend** with login/register forms
- ✅ **Dynamic navigation** showing user status
- ✅ **Rate limiting** for DOS attack protection
- ✅ **Activity logging** for all user actions
- ✅ **Responsive authentication UI** with coffee shop theming

---

## 🚀 **Implementation Command for Claude Code**

**"I've completed Phase 2 successfully. Now implement Phase 3: Authentication System exactly as specified above.**

**Focus on:**
1. Creating robust authentication middleware with session management
2. Building complete auth routes (register, login, logout, profile)
3. Implementing interactive frontend authentication with proper UI updates
4. Adding authentication to HTML templates with dynamic navigation
5. Setting up rate limiting for DOS protection
6. Integrating everything with the existing application structure
7. Creating comprehensive testing for all authentication features

**Critical Requirements:**
- "Remember Me" checkbox: 12 days if checked, 30 minutes if not
- Admin user already exists: admin/admin
- All authentication must use cookies as specified in project requirements
- Rate limiting must be implemented for DOS attack protection
- Activity logging for all user actions (login, logout, register)

**Test everything thoroughly - authentication is critical for all future features!"**

---

## 🔄 **Next Phase Preview**

After Phase 3, you'll be ready for **Phase 4: Store Core Features** which will add:
- Interactive product catalog with user-specific features
- Shopping cart functionality (add/remove items)
- Product search and filtering with better UX
- User-specific product recommendations

**Ready to make your coffee shop interactive with user accounts?** 🚀☕