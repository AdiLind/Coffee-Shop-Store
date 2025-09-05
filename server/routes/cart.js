const express = require('express');
const router = express.Router();
const { persistenceManager } = require('../modules/persist_module');
const { asyncWrapper } = require('../modules/error-handler');
const AuthMiddleware = require('../middleware/auth-middleware');

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
            error: 'INVALID_ITEMS_FORMAT',
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

// Update item quantity in cart
router.put('/update/:userId/:productId', asyncWrapper(async (req, res) => {
    const { userId, productId } = req.params;
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
        return res.status(400).json({
            success: false,
            error: 'INVALID_QUANTITY',
            message: 'Quantity must be a positive number'
        });
    }
    
    // Get current cart
    const cart = await persistenceManager.getUserCart(userId);
    
    // Find item in cart
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex === -1) {
        return res.status(404).json({
            success: false,
            error: 'ITEM_NOT_FOUND',
            message: 'Item not found in cart'
        });
    }
    
    // Update quantity
    cart.items[itemIndex].quantity = parseInt(quantity);
    
    // Save updated cart
    const updatedCart = await persistenceManager.updateUserCart(userId, cart);
    
    res.json({
        success: true,
        data: updatedCart,
        message: 'Cart item quantity updated successfully'
    });
}));

// Remove specific item from cart
router.delete('/remove/:userId/:productId', asyncWrapper(async (req, res) => {
    const { userId, productId } = req.params;
    
    // Get current cart
    const cart = await persistenceManager.getUserCart(userId);
    
    // Filter out the item
    const originalLength = cart.items.length;
    cart.items = cart.items.filter(item => item.productId !== productId);
    
    if (cart.items.length === originalLength) {
        return res.status(404).json({
            success: false,
            error: 'ITEM_NOT_FOUND',
            message: 'Item not found in cart'
        });
    }
    
    // Save updated cart
    const updatedCart = await persistenceManager.updateUserCart(userId, cart);
    
    res.json({
        success: true,
        data: updatedCart,
        message: 'Item removed from cart successfully'
    });
}));

// Clear entire cart
router.delete('/:userId', asyncWrapper(async (req, res) => {
    await persistenceManager.updateUserCart(req.params.userId, { items: [] });
    
    res.json({
        success: true,
        message: 'Cart cleared successfully'
    });
}));

module.exports = router;