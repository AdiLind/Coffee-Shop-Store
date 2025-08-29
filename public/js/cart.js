// Shopping Cart Manager for Coffee Shop Frontend
class CartManager {
    constructor() {
        this.apiClient = new APIClient();
        this.cart = { items: [] };
        this.init();
    }

    async init() {
        // Wait for auth manager to be ready
        await this.waitForAuthManager();
        
        // Force re-check authentication status to make sure we have the latest state
        console.log('Cart Manager - Rechecking authentication...');
        const isAuthenticated = await window.authManager.recheckAuth();
        
        // Debug authentication state
        console.log('Cart Manager - Auth check:', {
            authManagerExists: !!window.authManager,
            currentUser: window.authManager?.currentUser,
            isAuthenticated: isAuthenticated
        });
        
        // Check authentication
        if (!isAuthenticated) {
            console.log('Cart Manager - Not authenticated, showing login message');
            this.showLoginMessage();
            return;
        }

        console.log('Cart Manager - User authenticated, loading cart');
        await this.loadCart();
        this.setupEventListeners();
    }

    // Wait for auth manager to initialize
    async waitForAuthManager() {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max
        
        while (attempts < maxAttempts) {
            if (window.authManager && 
                typeof window.authManager.isAuthenticated === 'function' && 
                (window.authManager.currentUser || localStorage.getItem('userAuthenticated') === 'false')) {
                // Auth manager exists and has finished initializing (either with user or confirmed no user)
                console.log('Cart Manager - Auth manager ready, attempts:', attempts);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('AuthManager not available after waiting', attempts * 100, 'ms');
    }

    // Load cart data from server
    async loadCart() {
        if (!window.authManager.isAuthenticated()) return;

        try {
            showLoading('cartItems');
            const user = window.authManager.currentUser;
            const response = await this.apiClient.getCart(user.id);
            
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
                this.updateCartSummary();
            } else {
                throw new Error(response.message || 'Failed to load cart');
            }
        } catch (error) {
            console.error('Failed to load cart:', error);
            this.showError('Failed to load cart. Please refresh the page.');
        } finally {
            hideLoading('cartItems');
        }
    }

    // Render cart items
    renderCart() {
        const cartItemsContainer = document.getElementById('cartItems');
        
        if (!this.cart.items || this.cart.items.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <h3>Your cart is empty</h3>
                    <p>Add some coffee products to get started!</p>
                    <a href="/pages/store.html" class="btn btn-primary">Browse Products</a>
                </div>
            `;
            return;
        }

        const cartItemsHTML = this.cart.items.map(item => this.createCartItemHTML(item)).join('');
        cartItemsContainer.innerHTML = cartItemsHTML;
    }

    // Create HTML for a single cart item
    createCartItemHTML(item) {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        
        return `
            <div class="cart-item" data-product-id="${item.productId}">
                <div class="item-image">
                    <div class="product-image-placeholder">
                        <span>${item.title}</span>
                    </div>
                </div>
                <div class="item-details">
                    <h3>${sanitizeHTML(item.title)}</h3>
                    <p class="item-price">${formatCurrency(item.price)} each</p>
                </div>
                <div class="item-quantity">
                    <button class="btn btn-sm quantity-btn" onclick="cartManager.updateQuantity('${item.productId}', -1)">−</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="btn btn-sm quantity-btn" onclick="cartManager.updateQuantity('${item.productId}', 1)">+</button>
                </div>
                <div class="item-total">${formatCurrency(itemTotal)}</div>
                <button class="btn btn-outline btn-sm remove-item" onclick="cartManager.removeItem('${item.productId}')">Remove</button>
            </div>
        `;
    }

    // Update item quantity
    async updateQuantity(productId, change) {
        if (!window.authManager.isAuthenticated()) return;

        try {
            const itemIndex = this.cart.items.findIndex(item => item.productId === productId);
            if (itemIndex === -1) return;

            const newQuantity = this.cart.items[itemIndex].quantity + change;
            
            if (newQuantity <= 0) {
                // Remove item if quantity becomes 0 or less
                await this.removeItem(productId);
                return;
            }

            const user = window.authManager.currentUser;
            const response = await this.apiClient.request(`/cart/update/${user.id}/${productId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity: newQuantity })
            });
            
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
                this.updateCartSummary();
                window.authManager.showMessage('Cart updated', 'success');
            } else {
                throw new Error(response.message || 'Failed to update quantity');
            }
            
        } catch (error) {
            console.error('Failed to update quantity:', error);
            window.authManager.showMessage('Failed to update cart', 'error');
        }
    }

    // Remove item from cart
    async removeItem(productId) {
        if (!window.authManager.isAuthenticated()) return;

        try {
            const itemIndex = this.cart.items.findIndex(item => item.productId === productId);
            if (itemIndex === -1) return;

            const removedItem = this.cart.items[itemIndex];
            const user = window.authManager.currentUser;
            
            const response = await this.apiClient.request(`/cart/remove/${user.id}/${productId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                this.cart = response.data;
                this.renderCart();
                this.updateCartSummary();
                window.authManager.showMessage(`${removedItem.title} removed from cart`, 'success');
            } else {
                throw new Error(response.message || 'Failed to remove item');
            }
            
        } catch (error) {
            console.error('Failed to remove item:', error);
            window.authManager.showMessage('Failed to remove item', 'error');
        }
    }

    // Save cart to server
    async saveCart() {
        if (!window.authManager.isAuthenticated()) return;

        const user = window.authManager.currentUser;
        const response = await this.apiClient.updateCart(user.id, this.cart);
        
        if (!response.success) {
            throw new Error(response.message || 'Failed to save cart');
        }
    }

    // Update cart summary (totals)
    updateCartSummary() {
        const totals = this.calculateTotals();

        const subtotalEl = document.getElementById('subtotal');
        const taxEl = document.getElementById('tax');
        const shippingEl = document.getElementById('shipping');
        const totalEl = document.getElementById('total');

        if (subtotalEl) subtotalEl.textContent = formatCurrency(totals.subtotal);
        if (taxEl) taxEl.textContent = formatCurrency(totals.tax);
        if (shippingEl) shippingEl.textContent = formatCurrency(totals.shipping);
        if (totalEl) totalEl.textContent = formatCurrency(totals.total);

        // Update checkout button state
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = this.cart.items.length === 0;
            checkoutBtn.textContent = this.cart.items.length === 0 ? 'Cart Empty' : 'Proceed to Checkout';
        }
    }

    // Calculate subtotal
    calculateSubtotal() {
        return this.cart.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }

    // Calculate all totals including tax and shipping
    calculateTotals() {
        const subtotal = this.calculateSubtotal();
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

    // Clear entire cart
    async clearCart() {
        if (!window.authManager.isAuthenticated()) return;

        try {
            if (!confirm('Are you sure you want to clear your entire cart?')) {
                return;
            }

            this.cart.items = [];
            
            // Save to server
            await this.saveCart();
            
            // Update display
            this.renderCart();
            this.updateCartSummary();
            
            window.authManager.showMessage('Cart cleared', 'success');
            
        } catch (error) {
            console.error('Failed to clear cart:', error);
            window.authManager.showMessage('Failed to clear cart', 'error');
        }
    }

    // Handle checkout
    async checkout() {
        if (!window.authManager.isAuthenticated()) {
            window.authManager.showMessage('Please login to checkout', 'warning');
            return;
        }

        if (!this.cart.items || this.cart.items.length === 0) {
            window.authManager.showMessage('Your cart is empty', 'warning');
            return;
        }

        try {
            const user = window.authManager.currentUser;
            const subtotal = this.calculateSubtotal();
            const shipping = 9.99;
            const total = subtotal + shipping;

            // Create order
            const orderData = {
                userId: user.id,
                items: this.cart.items.map(item => ({
                    productId: item.productId,
                    title: item.title,
                    price: item.price,
                    quantity: item.quantity
                })),
                totalAmount: total,
                shippingAddress: 'Default Address' // In a real app, this would be user-provided
            };

            const response = await this.apiClient.createOrder(orderData);
            
            if (response.success) {
                // Clear cart after successful order
                this.cart.items = [];
                await this.saveCart();
                
                // Update display
                this.renderCart();
                this.updateCartSummary();
                
                // Show success message
                window.authManager.showMessage(`Order placed successfully! Order ID: ${response.data.id.substring(0, 8)}...`, 'success');
                
                // Redirect to orders page after delay
                setTimeout(() => {
                    window.location.href = '/pages/my-orders.html';
                }, 2000);
                
            } else {
                throw new Error(response.message || 'Order failed');
            }
            
        } catch (error) {
            console.error('Checkout failed:', error);
            window.authManager.showMessage('Checkout failed. Please try again.', 'error');
        }
    }

    // Proceed to checkout
    async proceedToCheckout() {
        if (!window.authManager.isAuthenticated()) {
            window.authManager.showMessage('Please login to checkout', 'warning');
            return;
        }

        if (!this.cart.items || this.cart.items.length === 0) {
            window.authManager.showMessage('Your cart is empty', 'warning');
            return;
        }

        // Redirect to checkout page
        window.location.href = '/pages/checkout.html';
    }

    // Setup event listeners
    setupEventListeners() {
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                this.proceedToCheckout();
            });
        }

        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => {
                this.clearCart();
            });
        }
    }

    // Show login message for unauthenticated users
    showLoginMessage() {
        const cartItemsContainer = document.getElementById('cartItems');
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = `
                <div class="auth-required">
                    <h3>Login Required</h3>
                    <p>Please login to view your shopping cart.</p>
                    <div style="margin-top: 1rem;">
                        <a href="/pages/login.html" class="btn btn-primary">Login</a>
                        <a href="/pages/register.html" class="btn btn-secondary">Register</a>
                    </div>
                </div>
            `;
        }

        // Hide cart summary
        const cartSummary = document.querySelector('.cart-summary');
        if (cartSummary) {
            cartSummary.style.display = 'none';
        }
    }

    // Show error message
    showError(message) {
        const cartItemsContainer = document.getElementById('cartItems');
        if (cartItemsContainer) {
            cartItemsContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="cartManager.loadCart()">Try Again</button>
                </div>
            `;
        }
    }

    // Get cart item count for navigation display
    getItemCount() {
        return this.cart.items.reduce((total, item) => total + item.quantity, 0);
    }
}

// Initialize cart manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Cart Manager - Initializing...');
    window.cartManager = new CartManager();
});