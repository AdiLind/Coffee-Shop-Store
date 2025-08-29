// Frontend Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.apiClient = new APIClient();
        this.init();
    }

    async init() {
        // Try to restore authentication state from localStorage first
        this.restoreFromLocalStorage();
        
        // Then verify with server
        await this.checkAuthStatus();
        this.updateUI();
        this.setupEventListeners();
    }

    // Restore authentication state from localStorage
    restoreFromLocalStorage() {
        try {
            const isAuthenticated = localStorage.getItem('userAuthenticated') === 'true';
            const userData = localStorage.getItem('currentUser');
            
            if (isAuthenticated && userData) {
                this.currentUser = JSON.parse(userData);
                console.log('Auth Manager - Restored from localStorage:', this.currentUser.username);
            }
        } catch (error) {
            console.log('Auth Manager - Failed to restore from localStorage:', error);
            localStorage.removeItem('userAuthenticated');
            localStorage.removeItem('currentUser');
        }
    }

    // Check current authentication status
    async checkAuthStatus() {
        try {
            console.log('Auth Manager - Checking authentication status...');
            const response = await this.apiClient.request('/auth/profile');
            if (response.success) {
                this.currentUser = response.data;
                console.log('Auth Manager - User authenticated:', this.currentUser.username);
                localStorage.setItem('userAuthenticated', 'true');
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                return true;
            }
        } catch (error) {
            console.log('Auth Manager - Not authenticated:', error.message || 'Unknown error');
            localStorage.removeItem('userAuthenticated');
            localStorage.removeItem('currentUser');
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
                localStorage.setItem('userAuthenticated', 'true');
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                this.updateUI();
                this.notifyOtherComponents();
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
            localStorage.removeItem('userAuthenticated');
            localStorage.removeItem('currentUser');
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
        const authSection = document.getElementById('auth-section');
        if (!authSection) return;

        if (this.currentUser) {
            authSection.innerHTML = `
                <span style="margin-right: 10px; color: var(--text-color, #333);">Welcome, ${this.currentUser.username}!</span>
                ${this.currentUser.role === 'admin' ? '<a href="/pages/admin.html">Admin Panel</a>' : ''}
                <a href="#" onclick="authManager.logout()">Logout</a>
            `;
        } else {
            authSection.innerHTML = `
                <a href="/pages/login.html">Login</a>
            `;
        }
        
        // Update cart count
        this.updateCartCount();
    }

    // Update cart count in navigation
    async updateCartCount() {
        const cartCountElement = document.getElementById('cart-count');
        if (!cartCountElement) return;

        if (this.currentUser) {
            try {
                const response = await this.apiClient.getCart(this.currentUser.id);
                if (response.success && response.data && response.data.items) {
                    const totalItems = response.data.items.reduce((sum, item) => sum + item.quantity, 0);
                    cartCountElement.textContent = totalItems;
                } else {
                    cartCountElement.textContent = '0';
                }
            } catch (error) {
                console.error('Failed to load cart count:', error);
                cartCountElement.textContent = '0';
            }
        } else {
            cartCountElement.textContent = '0';
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
                
                try {
                    await this.register(userData);
                    // Clear form on success
                    registerForm.reset();
                    // Redirect to login after a delay
                    setTimeout(() => {
                        window.location.href = '/pages/login.html';
                    }, 2000);
                } catch (error) {
                    // Error already handled in register method
                }
            });
        }

        // Password confirmation validation
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const passwordInput = document.getElementById('password');
        if (confirmPasswordInput && passwordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                const password = passwordInput.value;
                const confirmPassword = confirmPasswordInput.value;
                
                if (confirmPassword && password !== confirmPassword) {
                    confirmPasswordInput.setCustomValidity('Passwords do not match');
                } else {
                    confirmPasswordInput.setCustomValidity('');
                }
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
        return !!this.currentUser && localStorage.getItem('userAuthenticated') === 'true';
    }

    // Check if user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    // Force re-check authentication status (useful for other components)
    async recheckAuth() {
        const isAuth = await this.checkAuthStatus();
        this.updateUI();
        this.notifyOtherComponents();
        return isAuth;
    }

    // Notify other components about authentication status changes
    notifyOtherComponents() {
        // Notify store manager if it exists
        if (window.storeManager && typeof window.storeManager.refreshAuthStatus === 'function') {
            console.log('Auth Manager - Notifying store manager about auth status change');
            window.storeManager.refreshAuthStatus();
        }
        
        // Notify cart manager if it exists
        if (window.cartManager && typeof window.cartManager.refreshAuthStatus === 'function') {
            window.cartManager.refreshAuthStatus();
        }
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