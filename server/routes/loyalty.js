const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { persistenceManager } = require('../modules/persist_module');
const AuthMiddleware = require('../middleware/auth-middleware');
const Joi = require('joi');

const router = express.Router();

// Loyalty program configuration
const LOYALTY_CONFIG = {
    pointsPerDollar: 10, // 10 points per $1 spent
    tiers: {
        bronze: { min: 0, max: 499, multiplier: 1.0 },
        silver: { min: 500, max: 1499, multiplier: 1.2 },
        gold: { min: 1500, max: 2999, multiplier: 1.5 },
        platinum: { min: 3000, max: Infinity, multiplier: 2.0 }
    },
    rewards: [
        {
            id: 'reward-1',
            title: 'Free Coffee',
            description: 'Get a free coffee of your choice',
            cost: 500,
            category: 'beverage',
            available: true
        },
        {
            id: 'reward-2',
            title: '$5 Store Credit',
            description: '$5 off your next purchase',
            cost: 750,
            category: 'discount',
            available: true
        },
        {
            id: 'reward-3',
            title: 'Free Pastry',
            description: 'Get a free pastry with any beverage',
            cost: 300,
            category: 'food',
            available: true
        },
        {
            id: 'reward-4',
            title: '$10 Store Credit',
            description: '$10 off your next purchase',
            cost: 1200,
            category: 'discount',
            available: true
        },
        {
            id: 'reward-5',
            title: 'Premium Coffee Beans (1lb)',
            description: 'Free 1lb bag of premium coffee beans',
            cost: 2000,
            category: 'product',
            available: true
        }
    ]
};

// Get user loyalty points and tier
router.get('/points/:userId', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if user can access this loyalty data
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'You can only access your own loyalty data'
            });
        }

        const loyalty = await persistenceManager.readData('loyalty');
        let userLoyalty = loyalty.find(l => l.userId === userId);

        if (!userLoyalty) {
            // Create new loyalty record
            userLoyalty = {
                userId,
                totalPoints: 0,
                availablePoints: 0,
                tier: 'bronze',
                pointsHistory: [],
                createdAt: new Date().toISOString()
            };
            loyalty.push(userLoyalty);
            await persistenceManager.writeData('loyalty', loyalty);
        }

        // Calculate current tier
        const currentTier = calculateTier(userLoyalty.totalPoints);
        if (userLoyalty.tier !== currentTier) {
            userLoyalty.tier = currentTier;
            await persistenceManager.writeData('loyalty', loyalty);
        }

        // Calculate next tier progress
        const tierInfo = LOYALTY_CONFIG.tiers[currentTier];
        const nextTierKey = getNextTier(currentTier);
        const nextTierInfo = nextTierKey ? LOYALTY_CONFIG.tiers[nextTierKey] : null;
        
        const progress = nextTierInfo ? {
            current: userLoyalty.totalPoints,
            required: nextTierInfo.min,
            remaining: nextTierInfo.min - userLoyalty.totalPoints,
            percentage: Math.min(100, (userLoyalty.totalPoints / nextTierInfo.min) * 100)
        } : null;

        res.json({
            success: true,
            data: {
                ...userLoyalty,
                tierInfo: {
                    current: currentTier,
                    multiplier: tierInfo.multiplier,
                    next: nextTierKey,
                    progress
                }
            }
        });
    } catch (error) {
        console.error('Error fetching loyalty points:', error);
        res.status(500).json({
            success: false,
            error: 'FETCH_LOYALTY_ERROR',
            message: 'Failed to fetch loyalty data'
        });
    }
});

// Get available rewards
router.get('/rewards', async (req, res) => {
    try {
        res.json({
            success: true,
            data: LOYALTY_CONFIG.rewards.filter(reward => reward.available)
        });
    } catch (error) {
        console.error('Error fetching rewards:', error);
        res.status(500).json({
            success: false,
            error: 'FETCH_REWARDS_ERROR',
            message: 'Failed to fetch rewards'
        });
    }
});

// Redeem points for reward
router.post('/redeem', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { rewardId } = req.body;
        const userId = req.user.id;

        if (!rewardId) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Reward ID is required'
            });
        }

        const reward = LOYALTY_CONFIG.rewards.find(r => r.id === rewardId && r.available);
        if (!reward) {
            return res.status(404).json({
                success: false,
                error: 'REWARD_NOT_FOUND',
                message: 'Reward not found or unavailable'
            });
        }

        const loyalty = await persistenceManager.readData('loyalty');
        const userLoyalty = loyalty.find(l => l.userId === userId);

        if (!userLoyalty) {
            return res.status(404).json({
                success: false,
                error: 'LOYALTY_NOT_FOUND',
                message: 'Loyalty account not found'
            });
        }

        if (userLoyalty.availablePoints < reward.cost) {
            return res.status(400).json({
                success: false,
                error: 'INSUFFICIENT_POINTS',
                message: `Insufficient points. You need ${reward.cost} points but only have ${userLoyalty.availablePoints}`
            });
        }

        // Deduct points
        userLoyalty.availablePoints -= reward.cost;
        
        // Add to history
        const transaction = {
            id: uuidv4(),
            type: 'redeemed',
            amount: -reward.cost,
            description: `Redeemed: ${reward.title}`,
            rewardId: reward.id,
            timestamp: new Date().toISOString()
        };
        userLoyalty.pointsHistory.push(transaction);

        await persistenceManager.writeData('loyalty', loyalty);

        res.json({
            success: true,
            data: {
                reward: reward,
                transaction: transaction,
                availablePoints: userLoyalty.availablePoints,
                totalPoints: userLoyalty.totalPoints
            },
            message: `Successfully redeemed ${reward.title}!`
        });
    } catch (error) {
        console.error('Error redeeming reward:', error);
        res.status(500).json({
            success: false,
            error: 'REDEEM_ERROR',
            message: 'Failed to redeem reward'
        });
    }
});

// Add points (internal use - triggered by orders)
router.post('/earn', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { userId, amount, orderId, orderTotal } = req.body;
        
        // Only admins or the system can add points
        if (req.user.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                error: 'ACCESS_DENIED',
                message: 'Insufficient permissions to add points'
            });
        }

        const loyalty = await persistenceManager.readData('loyalty');
        let userLoyalty = loyalty.find(l => l.userId === userId);

        if (!userLoyalty) {
            userLoyalty = {
                userId,
                totalPoints: 0,
                availablePoints: 0,
                tier: 'bronze',
                pointsHistory: [],
                createdAt: new Date().toISOString()
            };
            loyalty.push(userLoyalty);
        }

        // Calculate points based on tier multiplier
        const currentTier = calculateTier(userLoyalty.totalPoints);
        const multiplier = LOYALTY_CONFIG.tiers[currentTier].multiplier;
        const pointsEarned = Math.floor((amount || (orderTotal * LOYALTY_CONFIG.pointsPerDollar)) * multiplier);

        // Add points
        userLoyalty.totalPoints += pointsEarned;
        userLoyalty.availablePoints += pointsEarned;

        // Update tier if necessary
        const newTier = calculateTier(userLoyalty.totalPoints);
        const tierUpgrade = userLoyalty.tier !== newTier;
        userLoyalty.tier = newTier;

        // Add to history
        const transaction = {
            id: uuidv4(),
            type: 'earned',
            amount: pointsEarned,
            description: orderId ? `Order #${orderId}` : 'Points earned',
            orderId: orderId || null,
            orderTotal: orderTotal || null,
            multiplier: multiplier,
            timestamp: new Date().toISOString()
        };
        userLoyalty.pointsHistory.push(transaction);

        await persistenceManager.writeData('loyalty', loyalty);

        res.json({
            success: true,
            data: {
                pointsEarned,
                availablePoints: userLoyalty.availablePoints,
                totalPoints: userLoyalty.totalPoints,
                tier: userLoyalty.tier,
                tierUpgrade,
                transaction
            },
            message: `Earned ${pointsEarned} points!${tierUpgrade ? ` Congratulations! You've been promoted to ${newTier} tier!` : ''}`
        });
    } catch (error) {
        console.error('Error earning points:', error);
        res.status(500).json({
            success: false,
            error: 'EARN_POINTS_ERROR',
            message: 'Failed to add points'
        });
    }
});

// Helper functions
function calculateTier(totalPoints) {
    for (const [tier, config] of Object.entries(LOYALTY_CONFIG.tiers)) {
        if (totalPoints >= config.min && totalPoints <= config.max) {
            return tier;
        }
    }
    return 'bronze';
}

function getNextTier(currentTier) {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(currentTier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}

module.exports = router;