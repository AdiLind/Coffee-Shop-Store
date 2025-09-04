// Orders Manager for Coffee Shop Frontend
class OrdersManager {
    constructor() {
        this.apiClient = new APIClient();
        this.orders = [];
        this.init();
    }

    async init() {
        // Wait for auth manager to be ready
        await this.waitForAuthManager();
        
        // Check authentication
        const isAuthenticated = await window.authManager.recheckAuth();
        
        if (!isAuthenticated) {
            console.log('Orders Manager - Not authenticated, showing login message');
            this.showLoginRequired();
            return;
        }

        console.log('Orders Manager - User authenticated, loading orders');
        await this.loadOrderHistory();
        this.setupEventListeners();
    }

    // Wait for auth manager to initialize using shared utility
    async waitForAuthManager() {
        return await waitForAuthManager({
            maxAttempts: 50,
            intervalMs: 100,
            managerName: 'Orders Manager'
        });
    }

    // Load user's order history
    async loadOrderHistory() {
        if (!window.authManager.isAuthenticated()) return;

        try {
            showLoading('ordersList');
            const user = window.authManager.currentUser;
            const response = await this.apiClient.request(`/orders/${user.id}`);
            
            if (response.success) {
                this.orders = response.data;
                this.renderOrderHistory();
                this.updateOrdersSummary();
            } else {
                throw new Error(response.message || 'Failed to load orders');
            }
        } catch (error) {
            console.error('Failed to load order history:', error);
            this.showError('Failed to load orders. Please refresh the page.');
        } finally {
            hideLoading('ordersList');
        }
    }

    // Render order history
    renderOrderHistory() {
        const ordersListContainer = document.getElementById('ordersList');
        
        if (!this.orders || this.orders.length === 0) {
            ordersListContainer.innerHTML = `
                <div class="no-orders">
                    <h3>No Orders Yet</h3>
                    <p>You haven't placed any orders yet. Start shopping to see your order history here!</p>
                    <a href="/pages/store.html" class="btn btn-primary">Browse Products</a>
                </div>
            `;
            return;
        }

        const ordersHTML = this.orders.map(order => this.createOrderHTML(order)).join('');
        ordersListContainer.innerHTML = ordersHTML;
    }

    // Create HTML for a single order
    createOrderHTML(order) {
        const orderDate = new Date(order.createdAt).toLocaleDateString();
        const orderTime = new Date(order.createdAt).toLocaleTimeString();
        const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-info">
                        <h3>Order #${order.id.substring(0, 8).toUpperCase()}</h3>
                        <p class="order-date">${orderDate} at ${orderTime}</p>
                    </div>
                    <div class="order-status">
                        <span class="status-badge ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                    </div>
                </div>
                
                <div class="order-summary">
                    <div class="order-items-preview">
                        <p><strong>${itemCount}</strong> item${itemCount !== 1 ? 's' : ''}</p>
                        <p class="items-list">${order.items.slice(0, 2).map(item => item.title).join(', ')}${order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}</p>
                    </div>
                    <div class="order-total">
                        <p class="total-amount">${formatCurrency(order.totalAmount)}</p>
                    </div>
                </div>
                
                <div class="order-actions">
                    <button class="btn btn-outline btn-sm view-details-btn" data-order-id="${order.id}">
                        View Details
                    </button>
                    ${order.status === 'completed' ? `
                        <button class="btn btn-secondary btn-sm">Reorder</button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Update orders summary
    updateOrdersSummary() {
        const ordersSummaryEl = document.getElementById('ordersSummary');
        if (ordersSummaryEl) {
            const totalOrders = this.orders.length;
            const totalSpent = this.orders.reduce((sum, order) => sum + order.totalAmount, 0);
            
            ordersSummaryEl.innerHTML = `
                <div class="summary-stats">
                    <div class="stat">
                        <span class="stat-number">${totalOrders}</span>
                        <span class="stat-label">Total Orders</span>
                    </div>
                    <div class="stat">
                        <span class="stat-number">${formatCurrency(totalSpent)}</span>
                        <span class="stat-label">Total Spent</span>
                    </div>
                </div>
            `;
        }
    }

    // Get order details
    async getOrderDetails(orderId) {
        try {
            const response = await this.apiClient.request(`/orders/details/${orderId}`);
            
            if (response.success) {
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to load order details');
            }
        } catch (error) {
            console.error('Failed to get order details:', error);
            throw error;
        }
    }

    // Show order details in modal
    async showOrderDetails(orderId) {
        try {
            showLoading('orderDetailsContent');
            this.openModal();
            
            const order = await this.getOrderDetails(orderId);
            this.renderOrderDetails(order);
            
        } catch (error) {
            console.error('Failed to show order details:', error);
            window.authManager.showMessage('Failed to load order details', 'error');
            this.closeModal();
        } finally {
            hideLoading('orderDetailsContent');
        }
    }

    // Render order details in modal
    renderOrderDetails(order) {
        const orderDetailsContainer = document.getElementById('orderDetailsContent');
        
        const orderDate = new Date(order.createdAt).toLocaleDateString();
        const orderTime = new Date(order.createdAt).toLocaleTimeString();
        
        const detailsHTML = `
            <div class="order-details">
                <div class="details-header">
                    <h4>Order #${order.id.substring(0, 8).toUpperCase()}</h4>
                    <div class="order-meta">
                        <p><strong>Date:</strong> ${orderDate} at ${orderTime}</p>
                        <p><strong>Status:</strong> <span class="status-badge ${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></p>
                    </div>
                </div>

                <div class="customer-details">
                    <h5>Customer Information</h5>
                    <div class="customer-info">
                        <p><strong>Name:</strong> ${sanitizeHTML(order.customerInfo.name)}</p>
                        <p><strong>Email:</strong> ${sanitizeHTML(order.customerInfo.email)}</p>
                        <p><strong>Address:</strong> ${sanitizeHTML(order.customerInfo.address)}</p>
                        ${order.customerInfo.phone ? `<p><strong>Phone:</strong> ${sanitizeHTML(order.customerInfo.phone)}</p>` : ''}
                    </div>
                </div>

                <div class="order-items-details">
                    <h5>Order Items</h5>
                    <div class="items-table">
                        ${order.items.map(item => `
                            <div class="item-row">
                                <div class="item-name">${sanitizeHTML(item.title)}</div>
                                <div class="item-quantity">× ${item.quantity}</div>
                                <div class="item-price">${formatCurrency(item.price)}</div>
                                <div class="item-total">${formatCurrency(item.subtotal)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="order-totals-details">
                    <h5>Order Summary</h5>
                    <div class="totals-breakdown">
                        <div class="total-line">
                            <span>Subtotal:</span>
                            <span>${formatCurrency(order.subtotal)}</span>
                        </div>
                        <div class="total-line">
                            <span>Tax:</span>
                            <span>${formatCurrency(order.tax)}</span>
                        </div>
                        <div class="total-line">
                            <span>Shipping:</span>
                            <span>${formatCurrency(order.shipping)}</span>
                        </div>
                        <div class="total-line total">
                            <span><strong>Total:</strong></span>
                            <span><strong>${formatCurrency(order.totalAmount)}</strong></span>
                        </div>
                    </div>
                </div>

                ${order.paymentDetails ? `
                    <div class="payment-details">
                        <h5>Payment Information</h5>
                        <div class="payment-info">
                            <p><strong>Method:</strong> Credit Card ending in ${order.paymentDetails.last4}</p>
                            <p><strong>Transaction ID:</strong> ${order.paymentDetails.transactionId}</p>
                            <p><strong>Processed:</strong> ${new Date(order.paymentDetails.processedAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        orderDetailsContainer.innerHTML = detailsHTML;
    }

    // Open modal
    openModal() {
        const modal = document.getElementById('orderModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('orderModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // View details buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-details-btn')) {
                const orderId = e.target.dataset.orderId;
                this.showOrderDetails(orderId);
            }
        });

        // Modal close buttons
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        const modalCloseFooterBtn = document.getElementById('modalCloseFooterBtn');
        
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        if (modalCloseFooterBtn) {
            modalCloseFooterBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // Close modal when clicking overlay
        const modalOverlay = document.getElementById('orderModal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // Show login required message
    showLoginRequired() {
        const loginRequiredEl = document.getElementById('loginRequired');
        const ordersContainer = document.querySelector('.orders-container');
        
        if (loginRequiredEl) {
            loginRequiredEl.style.display = 'block';
        }
        if (ordersContainer) {
            ordersContainer.style.display = 'none';
        }
    }

    // Show error message
    showError(message) {
        const ordersListContainer = document.getElementById('ordersList');
        if (ordersListContainer) {
            ordersListContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Try Again</button>
                </div>
            `;
        }
    }
}

// Initialize orders manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.ordersManager = new OrdersManager();
});