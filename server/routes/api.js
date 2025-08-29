const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const productRoutes = require('./products');
const cartRoutes = require('./cart');
const orderRoutes = require('./orders');
const adminRoutes = require('./admin');
const reviewRoutes = require('./reviews');
const wishlistRoutes = require('./wishlist');
const loyaltyRoutes = require('./loyalty');
const supportRoutes = require('./support');
const analyticsRoutes = require('./analytics');

router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/reviews', reviewRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/support', supportRoutes);
router.use('/analytics', analyticsRoutes);

router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Coffee Shop API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

module.exports = router;