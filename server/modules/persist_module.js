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
            activity: 'activity.json'
        };
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
            const filePath = path.join(this.dataDir, filename);
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
            const filePath = path.join(this.dataDir, filename);
            const jsonData = JSON.stringify(data, null, 2);
            await fs.writeFile(filePath, jsonData, 'utf8');
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

    async createUser(userData) {
        return await this.appendData(this.files.users, userData);
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

    async searchProducts(query) {
        try {
            const products = await this.readData(this.files.products);
            const searchTerm = query.toLowerCase();
            return products.filter(product => 
                product.title.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm) ||
                product.category.toLowerCase().includes(searchTerm)
            );
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

    async logActivity(activityData) {
        const activity = {
            ...activityData,
            timestamp: new Date().toISOString()
        };
        return await this.appendData(this.files.activity, activity);
    }

    async getActivityByUser(username) {
        try {
            const activities = await this.readData(this.files.activity);
            return activities.filter(activity => activity.username === username);
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
}

const persistenceManager = new PersistenceManager();

module.exports = {
    PersistenceManager,
    persistenceManager
};