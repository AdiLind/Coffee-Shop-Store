// Checkout Manager for Coffee Shop Frontend
class CheckoutManager {
    constructor() {
        this.apiClient = new APIClient();
        this.cart = { items: [] };
        this.order = null;
        this.init();
    }

    async init() {
        // Wait for auth manager to be ready
        await this.waitForAuthManager();
        
        // Check authentication
        const isAuthenticated = await window.authManager.recheckAuth();
        
        if (!isAuthenticated) {
            console.log('Checkout Manager - Not authenticated, showing login message');
            this.showLoginRequired();
            return;
        }

        console.log('Checkout Manager - User authenticated, loading checkout');
        await this.loadCartForCheckout();
        this.setupEventListeners();
        this.prefillCustomerInfo();
    }

    // Wait for auth manager to initialize
    async waitForAuthManager() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            if (window.authManager && typeof window.authManager.isAuthenticated === 'function') {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('AuthManager not available after waiting');
    }

    // Load cart data for checkout
    async loadCartForCheckout() {
        if (!window.authManager.isAuthenticated()) return;

        try {
            showLoading('orderItems');
            const user = window.authManager.currentUser;
            const response = await this.apiClient.getCart(user.id);
            
            if (response.success) {
                this.cart = response.data;
                
                if (!this.cart.items || this.cart.items.length === 0) {
                    this.showEmptyCart();
                    return;
                }
                
                this.renderOrderSummary();
                this.updateOrderTotals();
            } else {
                throw new Error(response.message || 'Failed to load cart');
            }
        } catch (error) {
            console.error('Failed to load cart for checkout:', error);
            this.showError('Failed to load cart. Please try again.');
        } finally {
            hideLoading('orderItems');
        }
    }

    // Render order summary
    renderOrderSummary() {
        const orderItemsContainer = document.getElementById('orderItems');
        
        if (!this.cart.items || this.cart.items.length === 0) {
            this.showEmptyCart();
            return;
        }

        const orderItemsHTML = this.cart.items.map(item => this.createOrderItemHTML(item)).join('');
        orderItemsContainer.innerHTML = orderItemsHTML;
    }

    // Create HTML for a single order item
    createOrderItemHTML(item) {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        
        return `
            <div class="order-item">
                <div class="item-info">
                    <h4>${sanitizeHTML(item.title)}</h4>
                    <p class="item-price">${formatCurrency(item.price)} × ${item.quantity}</p>
                </div>
                <div class="item-total">${formatCurrency(itemTotal)}</div>
            </div>
        `;
    }

    // Calculate all totals
    calculateTotals() {
        const subtotal = this.cart.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
        
        const tax = subtotal * 0.08; // 8% tax
        const shipping = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
        const total = subtotal + tax + shipping;
        
        return {
            subtotal: subtotal,
            tax: tax,
            shipping: shipping,
            total: total
        };
    }

    // Update order totals display
    updateOrderTotals() {
        const totals = this.calculateTotals();

        const subtotalEl = document.getElementById('orderSubtotal');
        const taxEl = document.getElementById('orderTax');
        const shippingEl = document.getElementById('orderShipping');
        const totalEl = document.getElementById('orderTotal');

        if (subtotalEl) subtotalEl.textContent = formatCurrency(totals.subtotal);
        if (taxEl) taxEl.textContent = formatCurrency(totals.tax);
        if (shippingEl) shippingEl.textContent = formatCurrency(totals.shipping);
        if (totalEl) totalEl.innerHTML = `<strong>${formatCurrency(totals.total)}</strong>`;
    }

    // Prefill customer information if available
    prefillCustomerInfo() {
        const user = window.authManager.currentUser;
        if (user) {
            const emailInput = document.getElementById('customerEmail');
            if (emailInput) {
                emailInput.value = user.email || '';
            }
        }
    }

    // Create order
    async createOrder(customerInfo) {
        if (!window.authManager.isAuthenticated()) return;

        try {
            const response = await this.apiClient.request('/orders/create', {
                method: 'POST',
                body: JSON.stringify({ customerInfo })
            });
            
            if (response.success) {
                this.order = response.data;
                return this.order;
            } else {
                throw new Error(response.message || 'Failed to create order');
            }
        } catch (error) {
            console.error('Failed to create order:', error);
            throw error;
        }
    }

    // Handle checkout form submission
    async handleCheckoutSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const customerInfo = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address')
        };

        // Validate required fields
        if (!customerInfo.name || !customerInfo.email || !customerInfo.address) {
            window.authManager.showMessage('Please fill in all required fields', 'error');
            return;
        }

        try {
            showLoading('checkoutForm');
            
            // Create the order
            const order = await this.createOrder(customerInfo);
            
            window.authManager.showMessage('Order created successfully!', 'success');
            
            // Store order ID for payment page and redirect
            sessionStorage.setItem('currentOrderId', order.id);
            
            setTimeout(() => {
                window.location.href = '/pages/pay.html';
            }, 1000);
            
        } catch (error) {
            console.error('Checkout failed:', error);
            window.authManager.showMessage('Checkout failed. Please try again.', 'error');
        } finally {
            hideLoading('checkoutForm');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                this.handleCheckoutSubmit(e);
            });
        }
    }

    // Show login required message
    showLoginRequired() {
        const loginRequiredEl = document.getElementById('loginRequired');
        const checkoutContainer = document.querySelector('.checkout-container');
        
        if (loginRequiredEl) {
            loginRequiredEl.style.display = 'block';
        }
        if (checkoutContainer) {
            checkoutContainer.style.display = 'none';
        }
    }

    // Show empty cart message
    showEmptyCart() {
        const orderItemsContainer = document.getElementById('orderItems');
        if (orderItemsContainer) {
            orderItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <h3>Your cart is empty</h3>
                    <p>Add some coffee products before checkout.</p>
                    <a href="/pages/store.html" class="btn btn-primary">Browse Products</a>
                </div>
            `;
        }

        // Disable checkout form
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.style.display = 'none';
        }
    }

    // Show error message
    showError(message) {
        const orderItemsContainer = document.getElementById('orderItems');
        if (orderItemsContainer) {
            orderItemsContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Try Again</button>
                </div>
            `;
        }
    }
}

// Initialize checkout manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.checkoutManager = new CheckoutManager();
});