// Thank You Page Manager for Coffee Shop Frontend
class ThankYouManager {
    constructor() {
        this.order = null;
        this.init();
    }

    async init() {
        // Wait for auth manager to be ready
        await this.waitForAuthManager();
        
        // Get completed order from session storage
        const orderData = sessionStorage.getItem('completedOrder');
        
        if (!orderData) {
            console.log('Thank You Manager - No order data found');
            this.showNoOrder();
            return;
        }

        try {
            this.order = JSON.parse(orderData);
            console.log('Thank You Manager - Order loaded:', this.order.id);
            
            this.renderOrderConfirmation();
            
            // Clean up session storage
            sessionStorage.removeItem('completedOrder');
            
        } catch (error) {
            console.error('Failed to parse order data:', error);
            this.showNoOrder();
        }
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

    // Render order confirmation details
    renderOrderConfirmation() {
        const orderConfirmationContainer = document.getElementById('orderConfirmation');
        
        if (!this.order) {
            this.showNoOrder();
            return;
        }

        const orderHTML = `
            <div class="confirmation-details">
                <div class="order-header">
                    <h3>Order Confirmation</h3>
                    <div class="order-id">
                        <strong>Order ID:</strong> ${this.order.id.substring(0, 8).toUpperCase()}
                    </div>
                    <div class="order-date">
                        <strong>Date:</strong> ${new Date(this.order.completedAt || this.order.createdAt).toLocaleDateString()}
                    </div>
                </div>

                <div class="customer-info">
                    <h4>Delivery Information</h4>
                    <div class="info-row">
                        <strong>Name:</strong> ${sanitizeHTML(this.order.customerInfo.name)}
                    </div>
                    <div class="info-row">
                        <strong>Email:</strong> ${sanitizeHTML(this.order.customerInfo.email)}
                    </div>
                    <div class="info-row">
                        <strong>Address:</strong> ${sanitizeHTML(this.order.customerInfo.address)}
                    </div>
                    ${this.order.customerInfo.phone ? `
                        <div class="info-row">
                            <strong>Phone:</strong> ${sanitizeHTML(this.order.customerInfo.phone)}
                        </div>
                    ` : ''}
                </div>

                <div class="order-items-section">
                    <h4>Order Items</h4>
                    <div class="items-list">
                        ${this.order.items.map(item => `
                            <div class="confirmation-item">
                                <div class="item-info">
                                    <span class="item-name">${sanitizeHTML(item.title)}</span>
                                    <span class="item-quantity">Quantity: ${item.quantity}</span>
                                </div>
                                <div class="item-price">${formatCurrency(item.subtotal)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="order-summary">
                    <h4>Order Summary</h4>
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(this.order.subtotal)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Tax:</span>
                        <span>${formatCurrency(this.order.tax)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Shipping:</span>
                        <span>${formatCurrency(this.order.shipping)}</span>
                    </div>
                    <div class="summary-row total">
                        <span><strong>Total Paid:</strong></span>
                        <span><strong>${formatCurrency(this.order.totalAmount)}</strong></span>
                    </div>
                </div>

                ${this.order.paymentDetails ? `
                    <div class="payment-info">
                        <h4>Payment Information</h4>
                        <div class="payment-method">
                            <span>Payment Method:</span>
                            <span>Credit Card ending in ${this.order.paymentDetails.last4}</span>
                        </div>
                        <div class="transaction-id">
                            <span>Transaction ID:</span>
                            <span>${this.order.paymentDetails.transactionId}</span>
                        </div>
                    </div>
                ` : ''}

                <div class="status-info">
                    <div class="status-badge ${this.order.status}">
                        ${this.order.status.charAt(0).toUpperCase() + this.order.status.slice(1)}
                    </div>
                    <p class="status-text">
                        Your order is confirmed and will be processed shortly.
                    </p>
                </div>
            </div>
        `;
        
        orderConfirmationContainer.innerHTML = orderHTML;
    }

    // Show no order message
    showNoOrder() {
        const noOrderEl = document.getElementById('noOrder');
        const thankYouContainer = document.querySelector('.thank-you-container');
        
        if (noOrderEl) {
            noOrderEl.style.display = 'block';
        }
        if (thankYouContainer) {
            thankYouContainer.style.display = 'none';
        }
    }
}

// Initialize thank you manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.thankYouManager = new ThankYouManager();
});