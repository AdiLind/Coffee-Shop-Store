// API Client for Coffee Shop Frontend
class APIClient {
    constructor() {
        this.baseURL = '/api';
        this.defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin' // Include cookies
        };
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...this.defaultOptions,
            ...options,
            headers: {
                ...this.defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new APIError(data.message || 'Request failed', response.status, data);
            }
            
            return data;
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            
            // Network or other errors
            throw new APIError('Network error or server unavailable', 0, { originalError: error });
        }
    }

    // HTTP method helpers
    async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    async post(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data = {}, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // Authentication endpoints
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    }

    async getProfile() {
        return this.request('/auth/profile');
    }

    async updateProfile(profileData) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // Product endpoints
    async getProducts(params = {}) {
        const searchParams = new URLSearchParams(params);
        const queryString = searchParams.toString();
        return this.request(`/products${queryString ? '?' + queryString : ''}`);
    }

    async getProduct(productId) {
        return this.request(`/products/${productId}`);
    }

    async searchProducts(query) {
        return this.request(`/products?search=${encodeURIComponent(query)}`);
    }

    async getProductsByCategory(category) {
        return this.request(`/products?category=${encodeURIComponent(category)}`);
    }

    async createProduct(productData) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    async updateProduct(productId, productData) {
        return this.request(`/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    }

    async deleteProduct(productId) {
        return this.request(`/products/${productId}`, {
            method: 'DELETE'
        });
    }

    // Cart endpoints
    async getCart(userId) {
        return this.request(`/cart/${userId}`);
    }

    async updateCart(userId, cartData) {
        return this.request(`/cart/${userId}`, {
            method: 'POST',
            body: JSON.stringify(cartData)
        });
    }

    async clearCart(userId) {
        return this.request(`/cart/${userId}`, {
            method: 'DELETE'
        });
    }

    // Order endpoints
    async getUserOrders(userId) {
        return this.request(`/orders/${userId}`);
    }

    async createOrder(orderData) {
        return this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    async getOrder(orderId) {
        return this.request(`/orders/single/${orderId}`);
    }

    // Admin endpoints
    async getStats() {
        return this.request('/admin/stats');
    }

    async getUsers() {
        return this.request('/admin/users');
    }

    async getActivity() {
        return this.request('/admin/activity');
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }
}

// Custom API Error class
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }

    get isAuthError() {
        return this.status === 401;
    }

    get isValidationError() {
        return this.status === 400;
    }

    get isForbidden() {
        return this.status === 403;
    }

    get isNotFound() {
        return this.status === 404;
    }

    get isServerError() {
        return this.status >= 500;
    }

    get isNetworkError() {
        return this.status === 0;
    }
}

// Export for use in other scripts
window.APIClient = APIClient;
window.APIError = APIError;