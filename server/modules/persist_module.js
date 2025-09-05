const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createError } = require('./error-handler');

class PersistenceManager {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.files = {
            users: 'users.json',
            products: 'products.json',
            carts: 'carts.json',
            orders: 'orders.json',
            activity: 'activity.json',
            sessions: 'sessions.json',
            reviews: 'reviews.json',
            wishlists: 'wishlists.json',
            loyalty: 'loyalty.json',
            support: 'support.json'
        };
        
        // Simple in-memory cache for performance optimization
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        
        // User activity index for faster lookups
        this.activityUserIndex = new Map();
        this.indexLastUpdated = null;
    }

    async initializeDataFiles() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            
            for (const [key, filename] of Object.entries(this.files)) {
                const filePath = path.join(this.dataDir, filename);
                try {
                    await fs.access(filePath);
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        console.log(`Creating ${filename}...`);
                        await this.writeData(filename, []);
                    }
                }
            }
            
            console.log('Data files initialized successfully');
        } catch (error) {
            throw createError(`Failed to initialize data files: ${error.message}`, 500, 'INITIALIZATION_ERROR');
        }
    }

    async readData(filename) {
        try {
            // Check if filename is a key in this.files, if so get the actual filename
            const actualFilename = this.files[filename] || filename;
            const filePath = path.join(this.dataDir, actualFilename);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`File ${filename} not found, returning empty array`);
                return [];
            }
            if (error instanceof SyntaxError) {
                throw createError(`Invalid JSON in ${filename}: ${error.message}`, 500, 'JSON_PARSE_ERROR');
            }
            throw createError(`Failed to read ${filename}: ${error.message}`, 500, 'FILE_READ_ERROR');
        }
    }

    async writeData(filename, data) {
        try {
            // Check if filename is a key in this.files, if so get the actual filename
            const actualFilename = this.files[filename] || filename;
            const filePath = path.join(this.dataDir, actualFilename);
            const jsonData = JSON.stringify(data, null, 2);
            await fs.writeFile(filePath, jsonData, 'utf8');
            
            // Clear related cache entries when data is written
            this.clearCache(`data:${actualFilename}`);
            if (actualFilename === this.files.activity) {
                this.clearCache('activity:');
                this.indexLastUpdated = null; // Force index rebuild
            }
            if (actualFilename === this.files.products) {
                this.clearCache('search:');
            }
            
            return true;
        } catch (error) {
            throw createError(`Failed to write ${filename}: ${error.message}`, 500, 'FILE_WRITE_ERROR');
        }
    }

    async appendData(filename, newItem) {
        try {
            const data = await this.readData(filename);
            data.push(newItem);
            await this.writeData(filename, data);
            return newItem;
        } catch (error) {
            throw createError(`Failed to append to ${filename}: ${error.message}`, 500, 'FILE_APPEND_ERROR');
        }
    }

    async findById(filename, id) {
        try {
            const data = await this.readData(filename);
            const item = data.find(item => item.id === id);
            if (!item) {
                throw createError(`Item with id ${id} not found in ${filename}`, 404, 'ITEM_NOT_FOUND');
            }
            return item;
        } catch (error) {
            if (error.statusCode === 404) throw error;
            throw createError(`Failed to find item by id in ${filename}: ${error.message}`, 500, 'FIND_ERROR');
        }
    }

    async updateById(filename, id, updateData) {
        try {
            const data = await this.readData(filename);
            const itemIndex = data.findIndex(item => item.id === id);
            
            if (itemIndex === -1) {
                throw createError(`Item with id ${id} not found in ${filename}`, 404, 'ITEM_NOT_FOUND');
            }
            
            data[itemIndex] = { ...data[itemIndex], ...updateData, updatedAt: new Date().toISOString() };
            await this.writeData(filename, data);
            return data[itemIndex];
        } catch (error) {
            if (error.statusCode === 404) throw error;
            throw createError(`Failed to update item in ${filename}: ${error.message}`, 500, 'UPDATE_ERROR');
        }
    }

    async deleteById(filename, id) {
        try {
            const data = await this.readData(filename);
            const itemIndex = data.findIndex(item => item.id === id);
            
            if (itemIndex === -1) {
                throw createError(`Item with id ${id} not found in ${filename}`, 404, 'ITEM_NOT_FOUND');
            }
            
            const deletedItem = data.splice(itemIndex, 1)[0];
            await this.writeData(filename, data);
            return deletedItem;
        } catch (error) {
            if (error.statusCode === 404) throw error;
            throw createError(`Failed to delete item from ${filename}: ${error.message}`, 500, 'DELETE_ERROR');
        }
    }

    async getAllUsers() {
        return await this.readData(this.files.users);
    }

    async getUserById(userId) {
        return await this.findById(this.files.users, userId);
    }

    async getUserByUsername(username) {
        try {
            const users = await this.readData(this.files.users);
            const user = users.find(user => user.username === username);
            if (!user) {
                throw createError(`User with username ${username} not found`, 404, 'USER_NOT_FOUND');
            }
            return user;
        } catch (error) {
            if (error.statusCode === 404) throw error;
            throw createError(`Failed to find user by username: ${error.message}`, 500, 'USER_LOOKUP_ERROR');
        }
    }

    async addUser(userData) {
        return await this.appendData(this.files.users, userData);
    }

    async saveUsers(usersData) {
        return await this.writeData(this.files.users, usersData);
    }

    async updateUser(userId, updateData) {
        return await this.updateById(this.files.users, userId, updateData);
    }

    async getAllProducts() {
        return await this.readData(this.files.products);
    }

    async getProductById(productId) {
        return await this.findById(this.files.products, productId);
    }

    async createProduct(productData) {
        const newProduct = {
            id: uuidv4(),
            ...productData,
            createdAt: new Date().toISOString(),
            inStock: productData.inStock !== undefined ? productData.inStock : true
        };
        return await this.appendData(this.files.products, newProduct);
    }

    async updateProduct(productId, updateData) {
        return await this.updateById(this.files.products, productId, updateData);
    }

    async deleteProduct(productId) {
        return await this.deleteById(this.files.products, productId);
    }

    async getProductsByCategory(category) {
        try {
            const products = await this.readData(this.files.products);
            return products.filter(product => product.category === category);
        } catch (error) {
            throw createError(`Failed to get products by category: ${error.message}`, 500, 'CATEGORY_FILTER_ERROR');
        }
    }

    /**
     * Optimized product search with caching and result limiting
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @param {number} options.limit - Maximum number of results (default: 50)
     * @param {boolean} options.useCache - Whether to use cached results (default: true)
     * @returns {Promise<Array>} - Array of matching products
     */
    async searchProducts(query, options = {}) {
        try {
            const { limit = 50, useCache = true } = options;
            const searchTerm = query.toLowerCase().trim();
            
            // Early return for empty queries
            if (!searchTerm) {
                return [];
            }
            
            // Check cache first
            const cacheKey = `search:${searchTerm}:${limit}`;
            if (useCache && this.isCacheValid(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            
            // Load products with caching
            const products = await this.getCachedData(this.files.products);
            
            // Optimized search with early termination and result limiting
            const results = [];
            const searchWords = searchTerm.split(' ').filter(word => word.length > 0);
            
            for (const product of products) {
                if (results.length >= limit) break; // Early termination
                
                if (this.matchesSearchCriteria(product, searchTerm, searchWords)) {
                    results.push(product);
                }
            }
            
            // Cache the results
            if (useCache) {
                this.setCacheEntry(cacheKey, results);
            }
            
            return results;
        } catch (error) {
            throw createError(`Failed to search products: ${error.message}`, 500, 'SEARCH_ERROR');
        }
    }

    async getUserCart(userId) {
        try {
            const carts = await this.readData(this.files.carts);
            return carts.find(cart => cart.userId === userId) || { userId, items: [], updatedAt: new Date().toISOString() };
        } catch (error) {
            throw createError(`Failed to get user cart: ${error.message}`, 500, 'CART_READ_ERROR');
        }
    }

    async updateUserCart(userId, cartData) {
        try {
            const carts = await this.readData(this.files.carts);
            const cartIndex = carts.findIndex(cart => cart.userId === userId);
            
            const updatedCart = { 
                userId, 
                ...cartData, 
                updatedAt: new Date().toISOString() 
            };
            
            if (cartIndex >= 0) {
                carts[cartIndex] = updatedCart;
            } else {
                carts.push(updatedCart);
            }
            
            await this.writeData(this.files.carts, carts);
            return updatedCart;
        } catch (error) {
            throw createError(`Failed to update user cart: ${error.message}`, 500, 'CART_UPDATE_ERROR');
        }
    }

    async getUserOrders(userId) {
        try {
            const orders = await this.readData(this.files.orders);
            return orders.filter(order => order.userId === userId);
        } catch (error) {
            throw createError(`Failed to get user orders: ${error.message}`, 500, 'ORDERS_READ_ERROR');
        }
    }

    async createOrder(orderData) {
        const newOrder = {
            id: uuidv4(),
            ...orderData,
            status: orderData.status || 'completed',
            createdAt: new Date().toISOString()
        };
        return await this.appendData(this.files.orders, newOrder);
    }

    async getOrderById(orderId) {
        return await this.findById(this.files.orders, orderId);
    }

    async logActivity(username, action, details = null) {
        const activity = {
            id: uuidv4(),
            username,
            action,
            details,
            timestamp: new Date().toISOString()
        };
        return await this.appendData(this.files.activity, activity);
    }

    /**
     * Optimized user activity retrieval with indexing and caching
     * @param {string} username - Username to get activities for
     * @param {Object} options - Query options
     * @param {number} options.limit - Maximum number of activities (default: 100)
     * @param {number} options.offset - Number of activities to skip (default: 0)
     * @param {boolean} options.useCache - Whether to use cached results (default: true)
     * @returns {Promise<Array>} - Array of user activities
     */
    async getActivityByUser(username, options = {}) {
        try {
            const { limit = 100, offset = 0, useCache = true } = options;
            
            // Check cache first
            const cacheKey = `activity:${username}:${limit}:${offset}`;
            if (useCache && this.isCacheValid(cacheKey)) {
                return this.cache.get(cacheKey);
            }
            
            // Update activity index if needed
            await this.updateActivityIndex();
            
            // Use index for fast lookup
            const userActivityIds = this.activityUserIndex.get(username) || [];
            
            // Apply pagination
            const paginatedIds = userActivityIds.slice(offset, offset + limit);
            
            // Load full activities (only for the ones we need)
            const activities = await this.getCachedData(this.files.activity);
            const results = paginatedIds.map(id => 
                activities.find(activity => activity.id === id)
            ).filter(activity => activity !== undefined);
            
            // Cache the results
            if (useCache) {
                this.setCacheEntry(cacheKey, results);
            }
            
            return results;
        } catch (error) {
            throw createError(`Failed to get user activity: ${error.message}`, 500, 'ACTIVITY_READ_ERROR');
        }
    }

    async getAllActivity() {
        return await this.readData(this.files.activity);
    }

    async initializeData() {
        await this.initializeDataFiles();
    }

    async createSampleData() {
        console.log('🔧 Creating comprehensive coffee shop sample data...');
        
        const sampleProducts = [
            {
                title: 'Professional Espresso Machine',
                description: 'Italian-made espresso machine with dual boiler system for perfect coffee extraction',
                price: 299.99,
                category: 'machines',
                image: '/images/products/espresso-machine-pro.jpg'
            },
            {
                title: 'Premium Drip Coffee Maker',
                description: 'Programmable coffee maker with thermal carafe, perfect for office or home',
                price: 89.99,
                category: 'machines',
                image: '/images/products/drip-coffee-maker.jpg'
            },
            {
                title: 'French Press Deluxe',
                description: 'Borosilicate glass French press with steel frame for rich, full-bodied coffee',
                price: 34.99,
                category: 'machines',
                image: '/images/products/french-press.jpg'
            },
            {
                title: 'Colombian Arabica Coffee Beans',
                description: 'Single-origin Colombian coffee beans, medium roast with chocolate notes',
                price: 24.99,
                category: 'beans',
                image: '/images/products/colombian-beans.jpg'
            },
            {
                title: 'Ethiopian Yirgacheffe',
                description: 'Light roast Ethiopian beans with bright acidity and floral aroma',
                price: 28.99,
                category: 'beans',
                image: '/images/products/ethiopian-beans.jpg'
            },
            {
                title: 'House Espresso Blend',
                description: 'Dark roast espresso blend perfect for lattes and cappuccinos',
                price: 22.99,
                category: 'beans',
                image: '/images/products/espresso-blend.jpg'
            },
            {
                title: 'Artisan Ceramic Coffee Cup',
                description: 'Handcrafted ceramic cup with ergonomic handle, perfect for morning coffee',
                price: 15.99,
                category: 'accessories',
                image: '/images/products/ceramic-cup.jpg'
            },
            {
                title: 'Electric Milk Frother',
                description: 'Stainless steel milk frother for perfect cappuccino and latte foam',
                price: 45.99,
                category: 'accessories',
                image: '/images/products/milk-frother.jpg'
            },
            {
                title: 'Burr Coffee Grinder',
                description: 'Conical burr grinder with 15 grind settings for consistent results',
                price: 79.99,
                category: 'accessories',
                image: '/images/products/coffee-grinder.jpg'
            }
        ];

        const products = await this.getAllProducts();
        if (products.length === 0) {
            for (const productData of sampleProducts) {
                await this.createProduct(productData);
            }
            console.log(`✅ Created ${sampleProducts.length} coffee products`);
        } else {
            console.log(`✅ Found existing ${products.length} products, skipping sample data creation`);
        }

        console.log('✅ Sample data initialization complete!');
    }
    
    /**
     * Check if a product matches search criteria
     * @param {Object} product - Product to check
     * @param {string} searchTerm - Full search term
     * @param {Array} searchWords - Individual search words
     * @returns {boolean} - Whether product matches
     */
    matchesSearchCriteria(product, searchTerm, searchWords) {
        const title = product.title?.toLowerCase() || '';
        const description = product.description?.toLowerCase() || '';
        const category = product.category?.toLowerCase() || '';
        
        // Exact phrase match (highest priority)
        if (title.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm)) {
            return true;
        }
        
        // All words must match somewhere in the product
        return searchWords.every(word => 
            title.includes(word) || description.includes(word) || category.includes(word)
        );
    }
    
    /**
     * Update the activity user index for faster lookups
     */
    async updateActivityIndex() {
        try {
            const activities = await this.getCachedData(this.files.activity);
            const currentHash = this.getDataHash(activities);
            
            // Only rebuild index if data has changed
            if (this.indexLastUpdated !== currentHash) {
                this.activityUserIndex.clear();
                
                for (const activity of activities) {
                    if (activity.username && activity.id) {
                        if (!this.activityUserIndex.has(activity.username)) {
                            this.activityUserIndex.set(activity.username, []);
                        }
                        this.activityUserIndex.get(activity.username).push(activity.id);
                    }
                }
                
                // Sort by timestamp (most recent first) for each user
                for (const [username, activityIds] of this.activityUserIndex.entries()) {
                    const sortedIds = activityIds.sort((a, b) => {
                        const activityA = activities.find(act => act.id === a);
                        const activityB = activities.find(act => act.id === b);
                        const timestampA = new Date(activityA?.timestamp || 0);
                        const timestampB = new Date(activityB?.timestamp || 0);
                        return timestampB - timestampA; // Most recent first
                    });
                    this.activityUserIndex.set(username, sortedIds);
                }
                
                this.indexLastUpdated = currentHash;
            }
        } catch (error) {
            console.error('Failed to update activity index:', error);
            // Don't throw error - fallback to original method
        }
    }
    
    /**
     * Cache management methods
     */
    
    /**
     * Get cached data with TTL support
     */
    async getCachedData(filename) {
        const cacheKey = `data:${filename}`;
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        const data = await this.readData(filename);
        this.setCacheEntry(cacheKey, data);
        return data;
    }
    
    /**
     * Check if cache entry is valid
     */
    isCacheValid(key) {
        if (!this.cache.has(key)) {
            return false;
        }
        
        const expiry = this.cacheExpiry.get(key);
        const now = Date.now();
        
        if (now > expiry) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            return false;
        }
        
        return true;
    }
    
    /**
     * Set cache entry with TTL
     */
    setCacheEntry(key, value) {
        this.cache.set(key, value);
        this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
    }
    
    /**
     * Clear specific cache entries
     */
    clearCache(pattern) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (!pattern || key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }
        
        for (const key of keysToDelete) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
        }
    }
    
    /**
     * Generate a simple hash of data for change detection
     */
    getDataHash(data) {
        return JSON.stringify(data).length + ':' + (data.length || 0);
    }
}

const persistenceManager = new PersistenceManager();

module.exports = {
    PersistenceManager,
    persistenceManager
};