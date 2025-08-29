const express = require('express');
const router = express.Router();
const { persistenceManager } = require('../modules/persist_module');
const { asyncWrapper } = require('../modules/error-handler');

router.get('/users', asyncWrapper(async (req, res) => {
    const users = await persistenceManager.getAllUsers();
    
    const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
    }));
    
    res.json({
        success: true,
        data: safeUsers,
        message: `Found ${safeUsers.length} users`
    });
}));

router.get('/activity', asyncWrapper(async (req, res) => {
    const activity = await persistenceManager.getAllActivity();
    
    res.json({
        success: true,
        data: activity,
        message: `Found ${activity.length} activity records`
    });
}));

router.get('/stats', asyncWrapper(async (req, res) => {
    const [users, products, orders, activity] = await Promise.all([
        persistenceManager.getAllUsers(),
        persistenceManager.getAllProducts(),
        persistenceManager.readData('orders.json'),
        persistenceManager.getAllActivity()
    ]);
    
    res.json({
        success: true,
        data: {
            totalUsers: users.length,
            totalProducts: products.length,
            totalOrders: orders.length,
            totalActivity: activity.length,
            generatedAt: new Date().toISOString()
        },
        message: 'Admin statistics retrieved successfully'
    });
}));

router.post('/products', asyncWrapper(async (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Admin product management will be enhanced in Phase 4'
    });
}));

module.exports = router;