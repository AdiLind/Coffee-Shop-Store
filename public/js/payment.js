// Payment Manager for Coffee Shop Frontend
class PaymentManager {
    constructor() {
        this.apiClient = new APIClient();
        this.orderId = null;
        this.order = null;
        this.init();
    }

    async init() {
        // Wait for auth manager to be ready
        await this.waitForAuthManager();
        
        // Check authentication
        const isAuthenticated = await window.authManager.recheckAuth();
        
        if (!isAuthenticated) {
            console.log('Payment Manager - Not authenticated, showing login message');
            this.showLoginRequired();
            return;
        }

        // Get order ID from session storage
        this.orderId = sessionStorage.getItem('currentOrderId');
        
        if (!this.orderId) {
            console.log('Payment Manager - No order ID found');
            this.showNoOrder();
            return;
        }

        console.log('Payment Manager - User authenticated, loading order:', this.orderId);
        await this.loadOrderDetails();
        this.setupEventListeners();
        this.setupFormValidation();
    }

    // Wait for auth manager to initialize using shared utility
    async waitForAuthManager() {
        return await waitForAuthManager({
            maxAttempts: 50,
            intervalMs: 100,
            managerName: 'Payment Manager'
        });
    }

    // Load order details
    async loadOrderDetails() {
        if (!window.authManager.isAuthenticated() || !this.orderId) return;

        try {
            showLoading('orderSummary');
            
            const response = await this.apiClient.request(`/orders/details/${this.orderId}`);
            
            if (response.success) {
                this.order = response.data;
                this.renderOrderSummary();
                this.updatePaymentTotal();
            } else {
                throw new Error(response.message || 'Failed to load order');
            }
        } catch (error) {
            console.error('Failed to load order details:', error);
            this.showError('Failed to load order details. Please try again.');
        } finally {
            hideLoading('orderSummary');
        }
    }

    // Render order summary
    renderOrderSummary() {
        const orderSummaryContainer = document.getElementById('orderSummary');
        
        if (!this.order) {
            this.showError('Order not found');
            return;
        }

        const orderHTML = `
            <div class="order-details">
                <div class="order-info">
                    <h4>Order #${this.order.id.substring(0, 8)}</h4>
                    <p class="order-date">Created: ${new Date(this.order.createdAt).toLocaleDateString()}</p>
                </div>
                
                <div class="order-items">
                    ${this.order.items.map(item => `
                        <div class="payment-item">
                            <span class="item-name">${sanitizeHTML(item.title)}</span>
                            <span class="item-quantity">× ${item.quantity}</span>
                            <span class="item-price">${formatCurrency(item.subtotal)}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="order-totals">
                    <div class="total-line">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(this.order.subtotal)}</span>
                    </div>
                    <div class="total-line">
                        <span>Tax:</span>
                        <span>${formatCurrency(this.order.tax)}</span>
                    </div>
                    <div class="total-line">
                        <span>Shipping:</span>
                        <span>${formatCurrency(this.order.shipping)}</span>
                    </div>
                </div>
            </div>
        `;
        
        orderSummaryContainer.innerHTML = orderHTML;
    }

    // Update payment total display
    updatePaymentTotal() {
        if (!this.order) return;
        
        const paymentTotalEl = document.getElementById('paymentTotal');
        if (paymentTotalEl) {
            paymentTotalEl.textContent = formatCurrency(this.order.totalAmount);
        }
    }

    // Format card number with spaces
    formatCardNumber(value) {
        // Remove all non-digits
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        // Add spaces every 4 digits
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    }

    // Format expiry date with slash
    formatExpiryDate(value) {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    }

    // Setup form validation and formatting
    setupFormValidation() {
        const cardNumberInput = document.getElementById('cardNumber');
        const expiryDateInput = document.getElementById('expiryDate');
        const cvvInput = document.getElementById('cvv');

        if (cardNumberInput) {
            cardNumberInput.addEventListener('input', (e) => {
                e.target.value = this.formatCardNumber(e.target.value);
            });
        }

        if (expiryDateInput) {
            expiryDateInput.addEventListener('input', (e) => {
                e.target.value = this.formatExpiryDate(e.target.value);
            });
        }

        if (cvvInput) {
            cvvInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }
    }

    // Process payment
    async processPayment(paymentDetails) {
        if (!window.authManager.isAuthenticated() || !this.orderId) return;

        try {
            const response = await this.apiClient.request(`/orders/payment/${this.orderId}`, {
                method: 'POST',
                body: JSON.stringify({ paymentDetails })
            });
            
            if (response.success) {
                // Store order details for thank you page
                sessionStorage.setItem('completedOrder', JSON.stringify(response.data));
                sessionStorage.removeItem('currentOrderId');
                
                return response.data;
            } else {
                throw new Error(response.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Payment processing failed:', error);
            throw error;
        }
    }

    // Handle payment form submission
    async handlePaymentSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const paymentDetails = {
            cardNumber: formData.get('cardNumber').replace(/\s/g, ''),
            expiryDate: formData.get('expiryDate'),
            cvv: formData.get('cvv'),
            cardholderName: formData.get('cardholderName')
        };

        // Basic validation
        if (!paymentDetails.cardNumber || paymentDetails.cardNumber.length < 16) {
            window.authManager.showMessage('Please enter a valid card number', 'error');
            return;
        }

        if (!paymentDetails.expiryDate || paymentDetails.expiryDate.length !== 5) {
            window.authManager.showMessage('Please enter a valid expiry date', 'error');
            return;
        }

        if (!paymentDetails.cvv || paymentDetails.cvv.length < 3) {
            window.authManager.showMessage('Please enter a valid CVV', 'error');
            return;
        }

        try {
            // Show processing state
            const payBtn = document.getElementById('payBtn');
            const payText = payBtn.querySelector('.pay-text');
            const processingText = payBtn.querySelector('.processing-text');
            
            payBtn.disabled = true;
            payText.style.display = 'none';
            processingText.style.display = 'inline';
            
            // Simulate processing delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Process the payment
            const completedOrder = await this.processPayment(paymentDetails);
            
            window.authManager.showMessage('Payment successful!', 'success');
            
            setTimeout(() => {
                window.location.href = '/pages/thank-you.html';
            }, 1000);
            
        } catch (error) {
            console.error('Payment failed:', error);
            window.authManager.showMessage('Payment failed. Please try again.', 'error');
            
            // Reset button state
            const payBtn = document.getElementById('payBtn');
            const payText = payBtn.querySelector('.pay-text');
            const processingText = payBtn.querySelector('.processing-text');
            
            payBtn.disabled = false;
            payText.style.display = 'inline';
            processingText.style.display = 'none';
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const paymentForm = document.getElementById('paymentForm');
        if (paymentForm) {
            paymentForm.addEventListener('submit', (e) => {
                this.handlePaymentSubmit(e);
            });
        }
    }

    // Show login required message
    showLoginRequired() {
        const loginRequiredEl = document.getElementById('loginRequired');
        const paymentContainer = document.querySelector('.payment-container');
        
        if (loginRequiredEl) {
            loginRequiredEl.style.display = 'block';
        }
        if (paymentContainer) {
            paymentContainer.style.display = 'none';
        }
    }

    // Show no order message
    showNoOrder() {
        const noOrderEl = document.getElementById('noOrder');
        const paymentContainer = document.querySelector('.payment-container');
        
        if (noOrderEl) {
            noOrderEl.style.display = 'block';
        }
        if (paymentContainer) {
            paymentContainer.style.display = 'none';
        }
    }

    // Show error message
    showError(message) {
        const orderSummaryContainer = document.getElementById('orderSummary');
        if (orderSummaryContainer) {
            orderSummaryContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()">Try Again</button>
                </div>
            `;
        }
    }
}

// Initialize payment manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.paymentManager = new PaymentManager();
});