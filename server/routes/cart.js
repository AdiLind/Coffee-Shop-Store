const express = require('express');
const router = express.Router();
const { persistenceManager } = require('../modules/persist_module');
const { asyncWrapper } = require('../modules/error-handler');

router.get('/:userId', asyncWrapper(async (req, res) => {
    const cart = await persistenceManager.getUserCart(req.params.userId);
    
    res.json({
        success: true,
        data: cart,
        message: 'Cart retrieved successfully'
    });
}));

router.post('/:userId', asyncWrapper(async (req, res) => {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
        return res.status(400).json({
            success: false,
            message: 'Items must be an array'
        });
    }
    
    const updatedCart = await persistenceManager.updateUserCart(req.params.userId, { items });
    
    res.json({
        success: true,
        data: updatedCart,
        message: 'Cart updated successfully'
    });
}));

router.delete('/:userId', asyncWrapper(async (req, res) => {
    await persistenceManager.updateUserCart(req.params.userId, { items: [] });
    
    res.json({
        success: true,
        message: 'Cart cleared successfully'
    });
}));

module.exports = router;