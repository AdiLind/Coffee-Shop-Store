const express = require('express');
const { persistenceManager } = require('../modules/persist_module');
const AuthMiddleware = require('../middleware/auth-middleware');

const router = express.Router();

// All analytics endpoints require admin access
router.use(AuthMiddleware.requireAuth);
router.use(AuthMiddleware.requireAdmin);

// Get sales analytics
router.get('/sales', async (req, res) => {
    try {
        const { period = '30d', groupBy = 'day' } = req.query;
        
        const orders = await persistenceManager.readData('orders');
        const completedOrders = orders.filter(order => order.status === 'completed');
        
        // Calculate date range based on period
        const now = new Date();
        let startDate;
        switch (period) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        // Filter orders within date range
        const filteredOrders = completedOrders.filter(order => 
            new Date(order.createdAt) >= startDate
        );
        
        // Calculate totals
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
        const totalOrders = filteredOrders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        // Group sales by time period
        const salesByPeriod = groupSalesByPeriod(filteredOrders, groupBy);
        
        // Top products
        const productSales = {};
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        productId: item.productId,
                        productTitle: item.title,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].revenue += item.price * item.quantity;
            });
        });
        
        const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        
        // Calculate growth compared to previous period
        const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
        const previousPeriodOrders = completedOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= previousPeriodStart && orderDate < startDate;
        });
        
        const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.totalAmount || order.total || 0), 0);
        const revenueGrowth = previousRevenue > 0 ? 
            ((totalRevenue - previousRevenue) / previousRevenue * 100) : 0;
        
        res.json({
            success: true,
            data: {
                period,
                dateRange: {
                    start: startDate.toISOString(),
                    end: now.toISOString()
                },
                totals: {
                    revenue: totalRevenue,
                    orders: totalOrders,
                    averageOrderValue,
                    revenueGrowth
                },
                salesByPeriod,
                topProducts,
                trends: {
                    ordersGrowth: previousPeriodOrders.length > 0 ? 
                        ((totalOrders - previousPeriodOrders.length) / previousPeriodOrders.length * 100) : 0,
                    averageOrderValueGrowth: previousPeriodOrders.length > 0 ? 
                        ((averageOrderValue - (previousRevenue / previousPeriodOrders.length)) / 
                         (previousRevenue / previousPeriodOrders.length) * 100) : 0
                }
            }
        });
    } catch (error) {
        console.error('Error fetching sales analytics:', error);
        res.status(500).json({
            success: false,
            error: 'SALES_ANALYTICS_ERROR',
            message: 'Failed to fetch sales analytics'
        });
    }
});

// Get user analytics
router.get('/users', async (req, res) => {
    try {
        const users = await persistenceManager.readData('users');
        const orders = await persistenceManager.readData('orders');
        const carts = await persistenceManager.readData('carts');
        
        // Total users (excluding admin)
        const regularUsers = users.filter(user => user.role !== 'admin');
        const totalUsers = regularUsers.length;
        
        // User registration trends (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const newUsers = regularUsers.filter(user => 
            new Date(user.createdAt) >= thirtyDaysAgo
        ).length;
        
        // Active users (users with orders in last 30 days)
        const activeUserIds = new Set(
            orders
                .filter(order => new Date(order.createdAt) >= thirtyDaysAgo)
                .map(order => order.userId)
        );
        const activeUsers = activeUserIds.size;
        
        // Users with items in cart
        const usersWithCarts = carts.filter(cart => cart.items.length > 0).length;
        
        // User activity by registration date
        const userRegistrationsByMonth = groupUsersByMonth(regularUsers);
        
        // Top customers by order value
        const customerStats = {};
        orders.forEach(order => {
            if (!customerStats[order.userId]) {
                const user = users.find(u => u.id === order.userId);
                customerStats[order.userId] = {
                    userId: order.userId,
                    username: user?.username || 'Unknown',
                    totalOrders: 0,
                    totalSpent: 0,
                    lastOrderDate: null
                };
            }
            
            customerStats[order.userId].totalOrders++;
            customerStats[order.userId].totalSpent += (order.totalAmount || order.total || 0);
            
            const orderDate = new Date(order.createdAt);
            if (!customerStats[order.userId].lastOrderDate || 
                orderDate > customerStats[order.userId].lastOrderDate) {
                customerStats[order.userId].lastOrderDate = orderDate;
            }
        });
        
        const topCustomers = Object.values(customerStats)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);
        
        res.json({
            success: true,
            data: {
                totals: {
                    totalUsers,
                    newUsers,
                    activeUsers,
                    usersWithCarts,
                    activeUsersPercentage: totalUsers > 0 ? (activeUsers / totalUsers * 100) : 0
                },
                registrationTrends: userRegistrationsByMonth,
                topCustomers,
                userSegments: {
                    new: newUsers,
                    active: activeUsers,
                    inactive: totalUsers - activeUsers,
                    withCarts: usersWithCarts
                }
            }
        });
    } catch (error) {
        console.error('Error fetching user analytics:', error);
        res.status(500).json({
            success: false,
            error: 'USER_ANALYTICS_ERROR',
            message: 'Failed to fetch user analytics'
        });
    }
});

// Get product analytics
router.get('/products', async (req, res) => {
    try {
        const products = await persistenceManager.readData('products');
        const orders = await persistenceManager.readData('orders');
        const reviews = await persistenceManager.readData('reviews');
        const carts = await persistenceManager.readData('carts');
        
        // Product performance metrics
        const productMetrics = {};
        
        // Initialize with all products
        products.forEach(product => {
            productMetrics[product.id] = {
                id: product.id,
                title: product.title,
                category: product.category,
                price: product.price,
                inStock: product.inStock,
                totalSold: 0,
                revenue: 0,
                timesOrdered: 0,
                averageRating: 0,
                reviewCount: 0,
                inCartsCount: 0
            };
        });
        
        // Calculate sales metrics
        orders.forEach(order => {
            order.items.forEach(item => {
                if (productMetrics[item.productId]) {
                    productMetrics[item.productId].totalSold += item.quantity;
                    productMetrics[item.productId].revenue += item.price * item.quantity;
                    productMetrics[item.productId].timesOrdered++;
                }
            });
        });
        
        // Calculate review metrics
        const reviewsByProduct = {};
        reviews.forEach(review => {
            if (!reviewsByProduct[review.productId]) {
                reviewsByProduct[review.productId] = [];
            }
            reviewsByProduct[review.productId].push(review);
        });
        
        Object.entries(reviewsByProduct).forEach(([productId, productReviews]) => {
            if (productMetrics[productId]) {
                productMetrics[productId].reviewCount = productReviews.length;
                productMetrics[productId].averageRating = 
                    productReviews.reduce((sum, review) => sum + review.rating, 0) / 
                    productReviews.length;
            }
        });
        
        // Calculate cart metrics
        carts.forEach(cart => {
            cart.items.forEach(item => {
                if (productMetrics[item.productId]) {
                    productMetrics[item.productId].inCartsCount++;
                }
            });
        });
        
        const productList = Object.values(productMetrics);
        
        // Top performers
        const topSellingProducts = productList
            .sort((a, b) => b.totalSold - a.totalSold)
            .slice(0, 10);
            
        const topRevenueProducts = productList
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
            
        const topRatedProducts = productList
            .filter(p => p.reviewCount >= 3)
            .sort((a, b) => b.averageRating - a.averageRating)
            .slice(0, 10);
        
        // Category performance
        const categoryMetrics = {};
        productList.forEach(product => {
            if (!categoryMetrics[product.category]) {
                categoryMetrics[product.category] = {
                    category: product.category,
                    productCount: 0,
                    totalSold: 0,
                    revenue: 0,
                    averagePrice: 0,
                    inStockCount: 0
                };
            }
            
            const category = categoryMetrics[product.category];
            category.productCount++;
            category.totalSold += product.totalSold;
            category.revenue += product.revenue;
            category.averagePrice += product.price;
            if (product.inStock) category.inStockCount++;
        });
        
        // Calculate averages
        Object.values(categoryMetrics).forEach(category => {
            category.averagePrice = category.averagePrice / category.productCount;
        });
        
        res.json({
            success: true,
            data: {
                totals: {
                    totalProducts: products.length,
                    inStockProducts: products.filter(p => p.inStock).length,
                    outOfStockProducts: products.filter(p => !p.inStock).length,
                    categoriesCount: Object.keys(categoryMetrics).length
                },
                topPerformers: {
                    topSelling: topSellingProducts,
                    topRevenue: topRevenueProducts,
                    topRated: topRatedProducts
                },
                categoryPerformance: Object.values(categoryMetrics),
                allProducts: productList
            }
        });
    } catch (error) {
        console.error('Error fetching product analytics:', error);
        res.status(500).json({
            success: false,
            error: 'PRODUCT_ANALYTICS_ERROR',
            message: 'Failed to fetch product analytics'
        });
    }
});

// Get system health metrics
router.get('/system', async (req, res) => {
    try {
        const startTime = process.hrtime();
        
        // File system checks
        const dataFiles = ['products', 'users', 'orders', 'carts', 'sessions', 'reviews', 'loyalty', 'support', 'wishlists'];
        const fileStatus = {};
        
        for (const file of dataFiles) {
            try {
                const data = await persistenceManager.readData(file);
                fileStatus[file] = {
                    status: 'healthy',
                    recordCount: Array.isArray(data) ? data.length : Object.keys(data).length,
                    lastModified: new Date().toISOString() // In a real system, you'd check file stats
                };
            } catch (error) {
                fileStatus[file] = {
                    status: 'error',
                    error: error.message
                };
            }
        }
        
        // Performance metrics
        const endTime = process.hrtime(startTime);
        const responseTime = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to milliseconds
        
        // Memory usage
        const memoryUsage = process.memoryUsage();
        
        // System uptime
        const uptime = process.uptime();
        
        res.json({
            success: true,
            data: {
                system: {
                    status: 'healthy',
                    uptime: Math.floor(uptime),
                    responseTime: Math.round(responseTime * 100) / 100,
                    timestamp: new Date().toISOString()
                },
                memory: {
                    used: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // MB
                    heap: {
                        used: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
                        total: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100 // MB
                    }
                },
                dataFiles: fileStatus,
                healthChecks: {
                    database: fileStatus.products.status === 'healthy',
                    authentication: fileStatus.sessions.status === 'healthy',
                    orders: fileStatus.orders.status === 'healthy'
                }
            }
        });
    } catch (error) {
        console.error('Error fetching system analytics:', error);
        res.status(500).json({
            success: false,
            error: 'SYSTEM_ANALYTICS_ERROR',
            message: 'Failed to fetch system analytics'
        });
    }
});

// Helper functions
function groupSalesByPeriod(orders, groupBy) {
    const groups = {};
    
    orders.forEach(order => {
        const date = new Date(order.createdAt);
        let key;
        
        switch (groupBy) {
            case 'hour':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
                break;
            case 'day':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                break;
            case 'week':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
                break;
            case 'month':
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
            default:
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
        
        if (!groups[key]) {
            groups[key] = {
                period: key,
                orders: 0,
                revenue: 0
            };
        }
        
        groups[key].orders++;
        groups[key].revenue += (order.totalAmount || order.total || 0);
    });
    
    return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period));
}

function groupUsersByMonth(users) {
    const groups = {};
    
    users.forEach(user => {
        const date = new Date(user.createdAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!groups[key]) {
            groups[key] = {
                period: key,
                newUsers: 0
            };
        }
        
        groups[key].newUsers++;
    });
    
    return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period));
}

module.exports = router;