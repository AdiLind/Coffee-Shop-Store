const express = require('express');
const router = express.Router();
const { persistenceManager } = require('../modules/persist_module');
const { asyncWrapper } = require('../modules/error-handler');
const AuthMiddleware = require('../middleware/auth-middleware');
const { v4: uuidv4 } = require('uuid');

// Get user's order history
router.get('/:userId', AuthMiddleware.requireAuth, asyncWrapper(async (req, res) => {
    const { userId } = req.params;
    
    // Ensure user can only access their own orders
    if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }
    
    const orders = await persistenceManager.getUserOrders(userId);
    
    // Sort by creation date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({
        success: true,
        data: orders,
        message: `Found ${orders.length} orders`
    });
}));

// Create order from cart (checkout process)
router.post('/create', AuthMiddleware.requireAuth, asyncWrapper(async (req, res) => {
    const { customerInfo } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.address) {
        return res.status(400).json({
            success: false,
            message: 'Customer information is required (name, email, address)'
        });
    }
    
    // Get user's cart
    const cart = await persistenceManager.getUserCart(userId);
    
    if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Cart is empty'
        });
    }
    
    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
    
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 50 ? 0 : 9.99; // Free shipping over $50
    const totalAmount = subtotal + tax + shipping;
    
    // Create order using existing method but with enhanced data
    const newOrder = await persistenceManager.createOrder({
        userId,
        items: cart.items.map(item => ({
            productId: item.productId,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
        })),
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        totalAmount: totalAmount,
        status: 'pending',
        customerInfo: {
            name: customerInfo.name,
            email: customerInfo.email,
            address: customerInfo.address,
            phone: customerInfo.phone || ''
        },
        shippingAddress: customerInfo.address
    });
    
    res.status(201).json({
        success: true,
        data: newOrder,
        message: 'Order created successfully'
    });
}));

// Get specific order details
router.get('/details/:orderId', AuthMiddleware.requireAuth, asyncWrapper(async (req, res) => {
    const { orderId } = req.params;
    
    const order = await persistenceManager.getOrderById(orderId);
    
    if (!order) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }
    
    // Ensure user can only access their own orders
    if (req.user.id !== order.userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }
    
    res.json({
        success: true,
        data: order,
        message: 'Order details retrieved successfully'
    });
}));

// Process fake payment
router.post('/payment/:orderId', AuthMiddleware.requireAuth, asyncWrapper(async (req, res) => {
    const { orderId } = req.params;
    const { paymentDetails } = req.body;
    
    if (!paymentDetails || !paymentDetails.cardNumber || !paymentDetails.expiryDate || !paymentDetails.cvv) {
        return res.status(400).json({
            success: false,
            message: 'Payment details are required'
        });
    }
    
    // Get order
    const orders = await persistenceManager.readData('orders.json');
    const orderIndex = orders.findIndex(order => order.id === orderId);
    
    if (orderIndex === -1) {
        return res.status(404).json({
            success: false,
            message: 'Order not found'
        });
    }
    
    const order = orders[orderIndex];
    
    // Ensure user owns this order
    if (req.user.id !== order.userId) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }
    
    // Simulate payment processing
    const last4 = paymentDetails.cardNumber.slice(-4);
    const transactionId = `tx_${uuidv4().substring(0, 8)}`;
    
    // Update order with payment details
    orders[orderIndex].status = 'completed';
    orders[orderIndex].completedAt = new Date().toISOString();
    orders[orderIndex].paymentDetails = {
        method: 'credit-card',
        last4: last4,
        transactionId: transactionId,
        processedAt: new Date().toISOString()
    };
    
    // Save updated orders
    await persistenceManager.writeData('orders.json', orders);
    
    // Clear user's cart
    await persistenceManager.updateUserCart(req.user.id, { items: [] });
    
    res.json({
        success: true,
        data: orders[orderIndex],
        message: 'Payment processed successfully'
    });
}));

module.exports = router;