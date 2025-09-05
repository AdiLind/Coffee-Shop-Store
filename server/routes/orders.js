const express = require('express');
const router = express.Router();
const { persistenceManager } = require('../modules/persist_module');
const { asyncWrapper } = require('../modules/error-handler');
const AuthMiddleware = require('../middleware/auth-middleware');
const { v4: uuidv4 } = require('uuid');
const paymentService = require('../services/paymentService');
const OrderService = require('../services/orderService');

// Initialize order service with persistence manager
const orderService = new OrderService(persistenceManager);

/**
 * Calculate order totals (subtotal, tax, shipping, total)
 * @param {Array} items - Array of order items with price and quantity
 * @returns {Object} Object containing subtotal, tax, shipping, totalAmount
 */
function calculateOrderTotals(items) {
    const subtotal = items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
    
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal >= 50 ? 0 : 9.99; // Free shipping over $50
    const totalAmount = subtotal + tax + shipping;
    
    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        shipping: parseFloat(shipping.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2))
    };
}

// Get user's order history
router.get('/:userId', AuthMiddleware.requireAuth, asyncWrapper(async (req, res) => {
    const { userId } = req.params;
    
    // Ensure user can only access their own orders
    if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'ACCESS_DENIED',
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
            error: 'MISSING_CUSTOMER_INFO',
            message: 'Customer information is required (name, email, address)'
        });
    }
    
    // Get user's cart
    const cart = await persistenceManager.getUserCart(userId);
    
    if (!cart.items || cart.items.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'EMPTY_CART',
            message: 'Cart is empty'
        });
    }
    
    // Calculate totals using helper function
    const totals = calculateOrderTotals(cart.items);
    
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
        subtotal: totals.subtotal,
        tax: totals.tax,
        shipping: totals.shipping,
        totalAmount: totals.totalAmount,
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

// Create order (API client compatible endpoint)
router.post('/', AuthMiddleware.requireAuth, asyncWrapper(async (req, res) => {
    const { userId, items, totalAmount, shippingAddress } = req.body;
    
    // Ensure user can only create orders for themselves
    if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'ACCESS_DENIED',
            message: 'Access denied'
        });
    }
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_ORDER_ITEMS',
            message: 'Order items are required'
        });
    }
    
    if (!totalAmount || !shippingAddress) {
        return res.status(400).json({
            success: false,
            error: 'MISSING_REQUIRED_FIELDS',
            message: 'Total amount and shipping address are required'
        });
    }
    
    // Calculate totals using helper function
    const totals = calculateOrderTotals(items);
    
    // Prepare order data for persistence manager
    const orderData = {
        userId: userId,
        items: items.map(item => ({
            productId: item.productId,
            title: item.title,
            price: item.price,
            quantity: item.quantity
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        shipping: totals.shipping,
        totalAmount: totals.totalAmount,
        shippingAddress: shippingAddress,
        status: 'pending'
    };
    
    // Save order (persistence manager adds ID and timestamps)
    const savedOrder = await persistenceManager.createOrder(orderData);
    
    // Log activity
    await persistenceManager.logActivity(userId, 'order_created', {
        orderId: savedOrder.id,
        itemCount: items.length,
        totalAmount: totals.totalAmount
    });
    
    res.status(201).json({
        success: true,
        data: savedOrder,
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
            error: 'ORDER_NOT_FOUND',
            message: 'Order not found'
        });
    }
    
    // Ensure user can only access their own orders
    if (req.user.id !== order.userId && req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'ACCESS_DENIED',
            message: 'Access denied'
        });
    }
    
    res.json({
        success: true,
        data: order,
        message: 'Order details retrieved successfully'
    });
}));

/**
 * Process payment for an order
 * Separated concerns: payment validation, processing, and order updates
 */
router.post('/payment/:orderId', AuthMiddleware.requireAuth, asyncWrapper(async (req, res) => {
    const { orderId } = req.params;
    const { paymentDetails } = req.body;
    
    try {
        // 1. Validate payment details
        const validation = paymentService.validatePaymentDetails(paymentDetails);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_PAYMENT_DETAILS',
                message: 'Payment validation failed',
                details: validation.errors
            });
        }

        // 2. Get and validate order ownership
        const order = await orderService.getOrderById(orderId, req.user.id, req.user.role);
        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'ORDER_NOT_FOUND',
                message: 'Order not found'
            });
        }

        // 3. Process payment through payment service
        const paymentResult = await paymentService.processPayment(paymentDetails, order.totalAmount);
        const paymentRecord = paymentService.createPaymentRecord(paymentResult);

        // 4. Update order with payment details
        const updatedOrder = await orderService.processPaymentForOrder(orderId, req.user.id, paymentRecord);

        // 5. Clear user's cart after successful payment
        await orderService.clearUserCart(req.user.id);

        // 6. Generate response with payment confirmation
        const confirmation = paymentService.generateConfirmation(paymentResult);
        
        res.json({
            success: true,
            data: {
                order: updatedOrder,
                payment: confirmation
            },
            message: 'Payment processed successfully'
        });
    } catch (error) {
        // Handle specific service errors
        if (error.message === 'ACCESS_DENIED') {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'Access denied'
            });
        }
        
        if (error.message === 'ORDER_ALREADY_COMPLETED') {
            return res.status(400).json({
                success: false,
                error: 'ORDER_ALREADY_COMPLETED',
                message: 'Order has already been completed'
            });
        }
        
        // Re-throw unexpected errors for global error handler
        throw error;
    }
}));

module.exports = router;