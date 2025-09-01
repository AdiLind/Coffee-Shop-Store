const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { persistenceManager } = require('../modules/persist_module');
const AuthMiddleware = require('../middleware/auth-middleware');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const addToWishlistSchema = Joi.object({
    productId: Joi.string().required(),
    notes: Joi.string().max(500).optional()
});

// Get user wishlist
router.get('/:userId', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if user can access this wishlist
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'You can only access your own wishlist'
            });
        }

        const wishlists = await persistenceManager.readData('wishlists');
        const userWishlist = wishlists.find(w => w.userId === userId);
        
        if (!userWishlist) {
            return res.json({
                success: true,
                data: {
                    userId,
                    items: [],
                    totalItems: 0
                }
            });
        }

        // Get full product details for wishlist items
        const products = await persistenceManager.readData('products');
        const wishlistWithProducts = userWishlist.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                ...item,
                product: product || null
            };
        }).filter(item => item.product); // Remove items where product no longer exists

        res.json({
            success: true,
            data: {
                userId: userWishlist.userId,
                items: wishlistWithProducts,
                totalItems: wishlistWithProducts.length
            }
        });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({
            success: false,
            error: 'FETCH_WISHLIST_ERROR',
            message: 'Failed to fetch wishlist'
        });
    }
});

// Add item to wishlist
router.post('/add', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { error, value } = addToWishlistSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: error.details[0].message
            });
        }

        const { productId, notes } = value;
        const userId = req.user.id;

        // Check if product exists
        const products = await persistenceManager.readData('products');
        const product = products.find(p => p.id === productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'PRODUCT_NOT_FOUND',
                message: 'Product not found'
            });
        }

        const wishlists = await persistenceManager.readData('wishlists');
        let userWishlist = wishlists.find(w => w.userId === userId);

        if (!userWishlist) {
            userWishlist = {
                userId,
                items: []
            };
            wishlists.push(userWishlist);
        }

        // Check if item already in wishlist
        const existingItemIndex = userWishlist.items.findIndex(item => item.productId === productId);
        if (existingItemIndex !== -1) {
            // Update notes if provided
            if (notes !== undefined) {
                userWishlist.items[existingItemIndex].notes = notes;
                userWishlist.items[existingItemIndex].updatedAt = new Date().toISOString();
            }
        } else {
            // Add new item
            const wishlistItem = {
                id: uuidv4(),
                productId,
                notes: notes || '',
                addedAt: new Date().toISOString()
            };
            userWishlist.items.push(wishlistItem);
        }

        await persistenceManager.writeData('wishlists', wishlists);

        res.json({
            success: true,
            data: {
                productId,
                totalItems: userWishlist.items.length
            },
            message: existingItemIndex !== -1 ? 'Wishlist item updated' : 'Item added to wishlist'
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({
            success: false,
            error: 'ADD_TO_WISHLIST_ERROR',
            message: 'Failed to add item to wishlist'
        });
    }
});

// Remove item from wishlist
router.delete('/remove/:productId', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        const wishlists = await persistenceManager.readData('wishlists');
        const userWishlist = wishlists.find(w => w.userId === userId);

        if (!userWishlist) {
            return res.status(404).json({
                success: false,
                error: 'WISHLIST_NOT_FOUND',
                message: 'Wishlist not found'
            });
        }

        const itemIndex = userWishlist.items.findIndex(item => item.productId === productId);
        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'ITEM_NOT_FOUND',
                message: 'Item not found in wishlist'
            });
        }

        userWishlist.items.splice(itemIndex, 1);
        await persistenceManager.writeData('wishlists', wishlists);

        res.json({
            success: true,
            data: {
                productId,
                totalItems: userWishlist.items.length
            },
            message: 'Item removed from wishlist'
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({
            success: false,
            error: 'REMOVE_FROM_WISHLIST_ERROR',
            message: 'Failed to remove item from wishlist'
        });
    }
});

// Move wishlist items to cart
router.post('/to-cart', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productIds } = req.body; // Array of product IDs to move

        if (!Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_PRODUCT_IDS',
                message: 'Product IDs array is required'
            });
        }

        const wishlists = await persistenceManager.readData('wishlists');
        const carts = await persistenceManager.readData('carts');
        const products = await persistenceManager.readData('products');
        
        const userWishlist = wishlists.find(w => w.userId === userId);
        if (!userWishlist) {
            return res.status(404).json({
                success: false,
                error: 'WISHLIST_NOT_FOUND',
                message: 'Wishlist not found'
            });
        }

        let userCart = carts.find(c => c.userId === userId);
        if (!userCart) {
            userCart = {
                userId,
                items: [],
                updatedAt: new Date().toISOString()
            };
            carts.push(userCart);
        }

        let movedCount = 0;
        const movedItems = [];

        // Process each product ID
        for (const productId of productIds) {
            const wishlistItemIndex = userWishlist.items.findIndex(item => item.productId === productId);
            if (wishlistItemIndex !== -1) {
                const wishlistItem = userWishlist.items[wishlistItemIndex];
                
                // Check if item already in cart
                const cartItemIndex = userCart.items.findIndex(item => item.productId === productId);
                if (cartItemIndex !== -1) {
                    // Increase quantity if already in cart
                    userCart.items[cartItemIndex].quantity += 1;
                } else {
                    // Get product details
                    const product = products.find(p => p.id === productId);
                    if (!product) {
                        console.warn(`Product ${productId} not found when adding to cart`);
                        continue;
                    }
                    
                    // Add new item to cart with full product details
                    const cartItem = {
                        id: uuidv4(),
                        productId,
                        title: product.title,
                        price: product.price,
                        quantity: 1,
                        addedAt: new Date().toISOString()
                    };
                    userCart.items.push(cartItem);
                }

                // Remove from wishlist
                userWishlist.items.splice(wishlistItemIndex, 1);
                movedItems.push(productId);
                movedCount++;
            }
        }

        if (movedCount > 0) {
            userCart.updatedAt = new Date().toISOString();
            await persistenceManager.writeData('wishlists', wishlists);
            await persistenceManager.writeData('carts', carts);
        }

        res.json({
            success: true,
            data: {
                movedItems,
                movedCount,
                cartItemCount: userCart.items.length,
                wishlistItemCount: userWishlist.items.length
            },
            message: `${movedCount} item${movedCount !== 1 ? 's' : ''} moved to cart`
        });
    } catch (error) {
        console.error('Error moving wishlist to cart:', error);
        res.status(500).json({
            success: false,
            error: 'MOVE_TO_CART_ERROR',
            message: 'Failed to move items to cart'
        });
    }
});

// Clear entire wishlist
router.delete('/clear', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;

        const wishlists = await persistenceManager.readData('wishlists');
        const userWishlist = wishlists.find(w => w.userId === userId);

        if (!userWishlist) {
            return res.json({
                success: true,
                message: 'Wishlist already empty'
            });
        }

        userWishlist.items = [];
        await persistenceManager.writeData('wishlists', wishlists);

        res.json({
            success: true,
            message: 'Wishlist cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing wishlist:', error);
        res.status(500).json({
            success: false,
            error: 'CLEAR_WISHLIST_ERROR',
            message: 'Failed to clear wishlist'
        });
    }
});

module.exports = router;