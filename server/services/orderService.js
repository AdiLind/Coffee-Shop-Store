/**
 * Order Management Service
 * Handles order operations, status updates, and order-related business logic
 */
class OrderService {
    constructor(persistenceManager) {
        this.persistenceManager = persistenceManager;
    }

    /**
     * Get order by ID with ownership validation
     * @param {string} orderId - Order ID
     * @param {string} userId - User ID making the request
     * @param {string} userRole - User role (admin can access any order)
     * @returns {Object} Order object or null if not found/unauthorized
     */
    async getOrderById(orderId, userId, userRole) {
        const orders = await this.persistenceManager.readData('orders.json');
        const order = orders.find(order => order.id === orderId);
        
        if (!order) {
            return null;
        }

        // Check ownership or admin access
        if (order.userId !== userId && userRole !== 'admin') {
            throw new Error('ACCESS_DENIED');
        }

        return order;
    }

    /**
     * Update order status and completion details
     * @param {string} orderId - Order ID
     * @param {string} newStatus - New order status
     * @param {Object} additionalData - Additional data to merge with order
     * @returns {Object} Updated order object
     */
    async updateOrderStatus(orderId, newStatus, additionalData = {}) {
        const orders = await this.persistenceManager.readData('orders.json');
        const orderIndex = orders.findIndex(order => order.id === orderId);
        
        if (orderIndex === -1) {
            throw new Error('ORDER_NOT_FOUND');
        }

        // Update order with new status and additional data
        orders[orderIndex].status = newStatus;
        
        // Add completion timestamp if order is completed
        if (newStatus === 'completed') {
            orders[orderIndex].completedAt = new Date().toISOString();
        }

        // Merge any additional data
        orders[orderIndex] = {
            ...orders[orderIndex],
            ...additionalData
        };

        // Save updated orders
        await this.persistenceManager.writeData('orders.json', orders);
        
        return orders[orderIndex];
    }

    /**
     * Process payment for an order
     * @param {string} orderId - Order ID
     * @param {string} userId - User ID (for ownership validation)
     * @param {Object} paymentRecord - Payment record from payment service
     * @returns {Object} Updated order with payment details
     */
    async processPaymentForOrder(orderId, userId, paymentRecord) {
        const orders = await this.persistenceManager.readData('orders.json');
        const orderIndex = orders.findIndex(order => order.id === orderId);
        
        if (orderIndex === -1) {
            throw new Error('ORDER_NOT_FOUND');
        }

        const order = orders[orderIndex];
        
        // Validate ownership
        if (order.userId !== userId) {
            throw new Error('ACCESS_DENIED');
        }

        // Validate order can be paid
        if (order.status === 'completed') {
            throw new Error('ORDER_ALREADY_COMPLETED');
        }

        // Update order with payment details
        const updatedOrder = await this.updateOrderStatus(orderId, 'completed', {
            paymentDetails: paymentRecord
        });

        return updatedOrder;
    }

    /**
     * Clear user's cart after successful payment
     * @param {string} userId - User ID
     * @returns {Promise} Promise that resolves when cart is cleared
     */
    async clearUserCart(userId) {
        await this.persistenceManager.updateUserCart(userId, { items: [] });
    }

    /**
     * Get user's order history
     * @param {string} userId - User ID
     * @returns {Array} Array of user's orders
     */
    async getUserOrders(userId) {
        const orders = await this.persistenceManager.readData('orders.json');
        return orders.filter(order => order.userId === userId);
    }

    /**
     * Get all orders (admin only)
     * @returns {Array} Array of all orders
     */
    async getAllOrders() {
        return await this.persistenceManager.readData('orders.json');
    }
}

module.exports = OrderService;