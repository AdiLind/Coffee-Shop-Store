const { persistenceManager } = require('../modules/persist_module');

/**
 * CartService - Handles all cart-related business logic
 * 
 * This service layer abstracts common cart operations, providing:
 * - Centralized cart retrieval and validation
 * - Consistent item manipulation logic
 * - Standardized error handling for cart operations
 * - Single source of truth for cart business rules
 * 
 * @class CartService
 */
class CartService {
    
    /**
     * Retrieve a user's cart with validation
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} The user's cart
     * @throws {Error} If userId is invalid
     */
    async getUserCart(userId) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        
        return await persistenceManager.getUserCart(userId);
    }
    
    /**
     * Validate and normalize cart items array
     * @param {Array} items - Array of cart items to validate
     * @returns {Array} Validated and normalized items
     * @throws {Error} If items format is invalid
     */
    validateCartItems(items) {
        if (!Array.isArray(items)) {
            throw new Error('Items must be an array');
        }
        
        return items.map(item => ({
            productId: item.productId,
            quantity: parseInt(item.quantity) || 1,
            ...item
        }));
    }
    
    /**
     * Find item in cart by product ID
     * @param {Object} cart - The cart object
     * @param {string} productId - The product ID to find
     * @returns {Object} Result with item index and item data
     * @throws {Error} If cart is invalid
     */
    findCartItem(cart, productId) {
        if (!cart || !cart.items) {
            throw new Error('Invalid cart structure');
        }
        
        const itemIndex = cart.items.findIndex(item => item.productId === productId);
        const item = itemIndex >= 0 ? cart.items[itemIndex] : null;
        
        return { itemIndex, item, found: itemIndex >= 0 };
    }
    
    /**
     * Validate quantity value
     * @param {number|string} quantity - The quantity to validate
     * @returns {number} Parsed and validated quantity
     * @throws {Error} If quantity is invalid
     */
    validateQuantity(quantity) {
        const parsedQuantity = parseInt(quantity);
        
        if (!parsedQuantity || parsedQuantity < 1) {
            throw new Error('Quantity must be a positive number');
        }
        
        return parsedQuantity;
    }
    
    /**
     * Update item quantity in cart
     * @param {string} userId - The user ID
     * @param {string} productId - The product ID
     * @param {number} quantity - The new quantity
     * @returns {Promise<Object>} Updated cart
     * @throws {Error} If item not found or quantity invalid
     */
    async updateItemQuantity(userId, productId, quantity) {
        const validatedQuantity = this.validateQuantity(quantity);
        const cart = await this.getUserCart(userId);
        const { itemIndex, found } = this.findCartItem(cart, productId);
        
        if (!found) {
            throw new Error('Item not found in cart');
        }
        
        // Update quantity
        cart.items[itemIndex].quantity = validatedQuantity;
        
        return await this.saveCart(userId, cart);
    }
    
    /**
     * Remove item from cart
     * @param {string} userId - The user ID
     * @param {string} productId - The product ID to remove
     * @returns {Promise<Object>} Updated cart
     * @throws {Error} If item not found
     */
    async removeItem(userId, productId) {
        const cart = await this.getUserCart(userId);
        const originalLength = cart.items.length;
        
        // Filter out the item
        cart.items = cart.items.filter(item => item.productId !== productId);
        
        if (cart.items.length === originalLength) {
            throw new Error('Item not found in cart');
        }
        
        return await this.saveCart(userId, cart);
    }
    
    /**
     * Update entire cart with new items
     * @param {string} userId - The user ID
     * @param {Array} items - New cart items
     * @returns {Promise<Object>} Updated cart
     */
    async updateCart(userId, items) {
        const validatedItems = this.validateCartItems(items);
        const cartData = { items: validatedItems };
        
        return await this.saveCart(userId, cartData);
    }
    
    /**
     * Clear all items from cart
     * @param {string} userId - The user ID
     * @returns {Promise<Object>} Empty cart
     */
    async clearCart(userId) {
        return await this.saveCart(userId, { items: [] });
    }
    
    /**
     * Save cart data to persistence layer
     * @param {string} userId - The user ID
     * @param {Object} cartData - Cart data to save
     * @returns {Promise<Object>} Saved cart
     * @private
     */
    async saveCart(userId, cartData) {
        return await persistenceManager.updateUserCart(userId, cartData);
    }
    
    /**
     * Calculate cart totals and statistics
     * @param {Object} cart - The cart object
     * @returns {Object} Cart statistics
     */
    calculateCartStats(cart) {
        if (!cart || !cart.items) {
            return {
                totalItems: 0,
                totalQuantity: 0,
                isEmpty: true
            };
        }
        
        const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        
        return {
            totalItems: cart.items.length,
            totalQuantity,
            isEmpty: cart.items.length === 0
        };
    }
}

module.exports = new CartService();