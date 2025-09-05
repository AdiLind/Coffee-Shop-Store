// Utility functions for the coffee shop frontend

// Format currency values
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format dates
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format relative time (e.g., "2 hours ago")
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show loading state
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="loading">Loading...</div>';
    }
}

// Hide loading state
function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loadingEl = element.querySelector('.loading');
        if (loadingEl) {
            loadingEl.remove();
        }
    }
}

// Validate email format
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength
function validatePassword(password) {
    return {
        isValid: password.length >= 6,
        length: password.length >= 6,
        hasLetter: /[a-zA-Z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
}

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Generate random ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Local storage helpers with error handling
const Storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    },
    
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Failed to read from localStorage:', e);
            return null;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Failed to remove from localStorage:', e);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Failed to clear localStorage:', e);
            return false;
        }
    }
};

// Form helpers
const FormUtils = {
    // Get form data as object
    getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    },
    
    // Validate form inputs
    validateForm(formElement) {
        const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
        const errors = [];
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                errors.push(`${input.name || input.id} is required`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },
    
    // Clear form validation errors
    clearErrors(formElement) {
        const errorElements = formElement.querySelectorAll('.error-message');
        errorElements.forEach(el => el.remove());
        
        const inputs = formElement.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.classList.remove('error');
        });
    },
    
    // Show validation errors
    showErrors(formElement, errors) {
        this.clearErrors(formElement);
        
        errors.forEach(error => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = error;
            formElement.appendChild(errorDiv);
        });
    }
};

// DOM helpers
const DOM = {
    // Create element with attributes and content
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        
        if (content) {
            element.textContent = content;
        }
        
        return element;
    },
    
    // Find closest parent element with class
    findParent(element, className) {
        while (element && !element.classList.contains(className)) {
            element = element.parentElement;
        }
        return element;
    }
};

// Event helpers
const Events = {
    // Add event listener with cleanup
    on(element, event, handler) {
        element.addEventListener(event, handler);
        return () => element.removeEventListener(event, handler);
    },
    
    // Delegate event handling
    delegate(parent, selector, event, handler) {
        parent.addEventListener(event, function(e) {
            if (e.target.matches(selector)) {
                handler.call(e.target, e);
            }
        });
    }
};

/**
 * Shared utility function to wait for AuthManager to be ready
 * @param {Object} options - Configuration options
 * @param {number} options.maxAttempts - Maximum number of attempts (default: 100)
 * @param {number} options.intervalMs - Interval between attempts in milliseconds (default: 50)
 * @param {string} options.managerName - Name for logging purposes (optional)
 * @param {boolean} options.requireCurrentUser - Whether to wait for currentUser to be available (default: false)
 * @returns {Promise<void>} Resolves when auth manager is ready
 */
async function waitForAuthManager(options = {}) {
    const {
        maxAttempts = 100,
        intervalMs = 50,
        managerName = 'Manager',
        requireCurrentUser = false
    } = options;

    let attempts = 0;
    
    while (attempts < maxAttempts) {
        if (window.authManager && typeof window.authManager.isAuthenticated === 'function') {
            // Basic auth manager availability check
            if (!requireCurrentUser) {
                console.log(`${managerName} - Auth manager ready, attempts:`, attempts);
                return;
            }
            
            // Extended check for current user or confirmed no user
            if (window.authManager.currentUser || localStorage.getItem('userAuthenticated') === 'false') {
                console.log(`${managerName} - Auth manager ready with user status, attempts:`, attempts);
                return;
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
    }
    
    console.warn(`${managerName} - AuthManager not available after waiting ${maxAttempts} attempts`);
}

/**
 * AuthHelper - Centralized authentication utilities
 * Consolidates common authentication patterns across frontend managers
 */
class AuthHelper {
    /**
     * Check if auth manager exists and user is authenticated
     * @returns {boolean} True if authenticated
     */
    static isAuthenticated() {
        return window.authManager && 
               typeof window.authManager.isAuthenticated === 'function' && 
               window.authManager.isAuthenticated();
    }

    /**
     * Get current authenticated user
     * @returns {Object|null} Current user object or null if not authenticated
     */
    static getCurrentUser() {
        return this.isAuthenticated() ? window.authManager.currentUser : null;
    }

    /**
     * Check authentication with recheck capability
     * @returns {Promise<boolean>} True if authenticated after recheck
     */
    static async recheckAuthentication() {
        if (!window.authManager || typeof window.authManager.recheckAuth !== 'function') {
            return false;
        }
        return await window.authManager.recheckAuth();
    }

    /**
     * Require authentication - redirect if not authenticated
     * @param {string} message - Message to show before redirect (optional)
     * @param {string} redirectUrl - URL to redirect to (default: login page)
     * @returns {boolean} True if authenticated, false if redirected
     */
    static requireAuth(message = 'Please login to access this page', redirectUrl = '/pages/login.html') {
        if (!this.isAuthenticated()) {
            NotificationSystem.show(message, 'warning');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
            return false;
        }
        return true;
    }

    /**
     * Handle authentication failure with consistent messaging
     * @param {string} action - Action that requires authentication
     * @param {string} message - Custom message (optional)
     */
    static handleAuthFailure(action = 'perform this action', message = null) {
        const defaultMessage = `Please login to ${action}`;
        const finalMessage = message || defaultMessage;
        
        NotificationSystem.show(finalMessage, 'warning');
    }

    /**
     * Check if current user is admin
     * @returns {boolean} True if user is admin
     */
    static isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }

    /**
     * Get user ID safely
     * @returns {string|null} User ID or null if not authenticated
     */
    static getUserId() {
        const user = this.getCurrentUser();
        return user ? user.id : null;
    }

    /**
     * Check auth and show login message if not authenticated
     * Used for initialization in managers
     * @param {string} managerName - Name of the manager for logging
     * @returns {boolean} True if authenticated
     */
    static checkAuthAndShowLogin(managerName) {
        if (!this.isAuthenticated()) {
            console.log(`${managerName} - Not authenticated, showing login message`);
            return false;
        }
        return true;
    }

    /**
     * Comprehensive authentication check for manager initialization
     * @param {string} managerName - Name of the manager
     * @returns {Promise<{isAuthenticated: boolean, user: Object|null}>}
     */
    static async initializeManagerAuth(managerName) {
        console.log(`${managerName} - Rechecking authentication...`);
        const isAuthenticated = await this.recheckAuthentication();
        
        console.log(`${managerName} - Auth check:`, {
            authManagerExists: !!window.authManager,
            currentUser: this.getCurrentUser(),
            isAuthenticated: isAuthenticated
        });
        
        return {
            isAuthenticated: isAuthenticated,
            user: this.getCurrentUser()
        };
    }
}

/**
 * Centralized Notification System
 * Provides consistent messaging across all frontend managers
 * Replaces inconsistent alert() and authManager.showMessage() usage
 */
class NotificationSystem {
    
    /**
     * Show a notification message with consistent styling and behavior
     * @param {string} message - Message to display
     * @param {string} type - Notification type ('success', 'error', 'warning', 'info')
     * @param {Object} options - Additional options
     * @param {number} options.duration - Auto-hide duration in ms (0 for persistent)
     * @param {boolean} options.allowHtml - Whether to allow HTML content
     */
    static show(message, type = 'info', options = {}) {
        const { 
            duration = type === 'error' ? 5000 : 3000, 
            allowHtml = false 
        } = options;
        
        // Try to use authManager if available (preferred method)
        if (this.canUseAuthManager()) {
            return this.showViaAuthManager(message, type, duration);
        }
        
        // Fallback to custom toast system
        return this.showViaToast(message, type, duration, allowHtml);
    }
    
    /**
     * Show success message
     * @param {string} message - Success message
     * @param {Object} options - Additional options
     */
    static success(message, options = {}) {
        return this.show(message, 'success', options);
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     */
    static error(message, options = {}) {
        return this.show(message, 'error', options);
    }
    
    /**
     * Show warning message
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     */
    static warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }
    
    /**
     * Show info message
     * @param {string} message - Info message
     * @param {Object} options - Additional options
     */
    static info(message, options = {}) {
        return this.show(message, 'info', options);
    }
    
    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Object} options - Additional options
     * @param {string} options.confirmText - Confirm button text
     * @param {string} options.cancelText - Cancel button text
     * @returns {Promise<boolean>} - True if confirmed, false if cancelled
     */
    static async confirm(message, options = {}) {
        const { 
            confirmText = 'Confirm', 
            cancelText = 'Cancel' 
        } = options;
        
        // Use browser confirm as fallback for now
        // In a full implementation, this would use a custom modal
        return new Promise((resolve) => {
            const result = window.confirm(message);
            resolve(result);
        });
    }
    
    /**
     * Check if authManager is available and functional
     */
    static canUseAuthManager() {
        return window.authManager && 
               typeof window.authManager.showMessage === 'function';
    }
    
    /**
     * Show notification via authManager (preferred method)
     */
    static showViaAuthManager(message, type, duration) {
        try {
            window.authManager.showMessage(message, type, duration);
            return true;
        } catch (error) {
            console.error('Failed to show notification via authManager:', error);
            return this.showViaToast(message, type, duration);
        }
    }
    
    /**
     * Show notification via custom toast system (fallback)
     */
    static showViaToast(message, type, duration, allowHtml = false) {
        try {
            // Ensure toast container exists
            this.ensureToastContainer();
            
            // Create toast element
            const toast = this.createToast(message, type, allowHtml);
            
            // Add to container with animation
            const container = document.getElementById('notification-container');
            container.appendChild(toast);
            
            // Trigger show animation
            requestAnimationFrame(() => {
                toast.classList.add('show');
            });
            
            // Auto-remove after duration
            if (duration > 0) {
                setTimeout(() => {
                    this.removeToast(toast);
                }, duration);
            }
            
            return toast;
        } catch (error) {
            console.error('Failed to show toast notification:', error);
            // Ultimate fallback to alert
            alert(message);
            return null;
        }
    }
    
    /**
     * Create toast container if it doesn't exist
     */
    static ensureToastContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }
    
    /**
     * Create a toast element
     */
    static createToast(message, type, allowHtml) {
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${type}`;
        
        // Set content safely
        if (allowHtml) {
            toast.innerHTML = message;
        } else {
            toast.textContent = message;
        }
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '&times;';
        closeButton.className = 'notification-close';
        closeButton.onclick = (e) => {
            e.stopPropagation();
            this.removeToast(toast);
        };
        toast.appendChild(closeButton);
        
        // Apply styles
        toast.style.cssText = `
            background: ${this.getToastBackground(type)};
            color: ${this.getToastTextColor(type)};
            border: 1px solid ${this.getToastBorderColor(type)};
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 10px;
            min-width: 300px;
            max-width: 500px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            pointer-events: auto;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        
        // Style close button
        closeButton.style.cssText = `
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: inherit;
            opacity: 0.7;
            margin-left: 12px;
            flex-shrink: 0;
            padding: 0;
            line-height: 1;
        `;
        
        return toast;
    }
    
    /**
     * Remove toast with animation
     */
    static removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }
    
    /**
     * Get background color for toast type
     */
    static getToastBackground(type) {
        const colors = {
            success: '#d4edda',
            error: '#f8d7da',
            warning: '#fff3cd',
            info: '#d1ecf1'
        };
        return colors[type] || colors.info;
    }
    
    /**
     * Get text color for toast type
     */
    static getToastTextColor(type) {
        const colors = {
            success: '#155724',
            error: '#721c24',
            warning: '#856404',
            info: '#0c5460'
        };
        return colors[type] || colors.info;
    }
    
    /**
     * Get border color for toast type
     */
    static getToastBorderColor(type) {
        const colors = {
            success: '#c3e6cb',
            error: '#f5c6cb',
            warning: '#ffeeba',
            info: '#bee5eb'
        };
        return colors[type] || colors.info;
    }
}

// Add CSS class for show animation
const style = document.createElement('style');
style.textContent = `
    .notification-toast.show {
        opacity: 1 !important;
        transform: translateX(0) !important;
    }
    
    .notification-close:hover {
        opacity: 1 !important;
    }
`;
document.head.appendChild(style);