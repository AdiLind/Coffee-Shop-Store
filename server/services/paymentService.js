const { v4: uuidv4 } = require('uuid');

/**
 * Payment Processing Service
 * Handles payment validation, processing, and transaction management
 */
class PaymentService {
    /**
     * Validate payment details format and required fields
     * @param {Object} paymentDetails - Payment information object
     * @returns {Object} Validation result with isValid flag and errors array
     */
    validatePaymentDetails(paymentDetails) {
        const errors = [];
        
        if (!paymentDetails) {
            errors.push('Payment details are required');
            return { isValid: false, errors };
        }

        if (!paymentDetails.cardNumber) {
            errors.push('Card number is required');
        } else if (!/^\d{13,19}$/.test(paymentDetails.cardNumber.replace(/\s/g, ''))) {
            errors.push('Invalid card number format');
        }

        if (!paymentDetails.expiryDate) {
            errors.push('Expiry date is required');
        } else if (!/^\d{2}\/\d{2}$/.test(paymentDetails.expiryDate)) {
            errors.push('Invalid expiry date format (MM/YY)');
        }

        if (!paymentDetails.cvv) {
            errors.push('CVV is required');
        } else if (!/^\d{3,4}$/.test(paymentDetails.cvv)) {
            errors.push('Invalid CVV format');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Simulate payment processing (for demo purposes)
     * In production, this would integrate with a real payment gateway
     * @param {Object} paymentDetails - Payment information object
     * @param {number} amount - Payment amount
     * @returns {Object} Payment processing result
     */
    processPayment(paymentDetails, amount) {
        // Simulate processing time and potential failures
        const processingTime = Math.random() * 1000 + 500; // 500-1500ms
        
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate 5% failure rate for testing
                if (Math.random() < 0.05) {
                    reject(new Error('Payment processing failed'));
                    return;
                }

                const transactionId = `tx_${uuidv4().substring(0, 8)}`;
                const last4 = paymentDetails.cardNumber.replace(/\s/g, '').slice(-4);
                
                resolve({
                    success: true,
                    transactionId,
                    last4,
                    amount,
                    method: 'credit-card',
                    processedAt: new Date().toISOString(),
                    processingTimeMs: Math.round(processingTime)
                });
            }, processingTime);
        });
    }

    /**
     * Create payment record object for order storage
     * @param {Object} paymentResult - Result from processPayment
     * @returns {Object} Payment record for database storage
     */
    createPaymentRecord(paymentResult) {
        return {
            method: paymentResult.method,
            last4: paymentResult.last4,
            transactionId: paymentResult.transactionId,
            processedAt: paymentResult.processedAt,
            amount: paymentResult.amount
        };
    }

    /**
     * Generate payment confirmation data for response
     * @param {Object} paymentResult - Result from processPayment
     * @returns {Object} Confirmation data for API response
     */
    generateConfirmation(paymentResult) {
        return {
            transactionId: paymentResult.transactionId,
            last4: paymentResult.last4,
            amount: paymentResult.amount,
            processedAt: paymentResult.processedAt,
            status: 'completed'
        };
    }
}

module.exports = new PaymentService();