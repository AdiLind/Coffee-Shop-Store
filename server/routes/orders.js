const express = require('express');
const router = express.Router();
const { persistenceManager } = require('../modules/persist_module');
const { asyncWrapper } = require('../modules/error-handler');

router.get('/:userId', asyncWrapper(async (req, res) => {
    const orders = await persistenceManager.getUserOrders(req.params.userId);
    
    res.json({
        success: true,
        data: orders,
        message: `Found ${orders.length} orders`
    });
}));

router.post('/', asyncWrapper(async (req, res) => {
    const { userId, items, totalAmount, shippingAddress } = req.body;
    
    if (!userId || !items || !totalAmount) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: userId, items, totalAmount'
        });
    }
    
    const newOrder = await persistenceManager.createOrder({
        userId,
        items,
        totalAmount: parseFloat(totalAmount),
        shippingAddress,
        status: 'completed'
    });
    
    res.status(201).json({
        success: true,
        data: newOrder,
        message: 'Order created successfully'
    });
}));

router.get('/single/:orderId', asyncWrapper(async (req, res) => {
    const order = await persistenceManager.getOrderById(req.params.orderId);
    
    res.json({
        success: true,
        data: order
    });
}));

module.exports = router;