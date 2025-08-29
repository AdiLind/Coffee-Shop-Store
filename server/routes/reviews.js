const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { persistenceManager } = require('../modules/persist_module');
const AuthMiddleware = require('../middleware/auth-middleware');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const reviewSchema = Joi.object({
    productId: Joi.string().required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().min(1).max(100).required(),
    comment: Joi.string().min(1).max(1000).required()
});

// Get reviews for a specific product
router.get('/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const reviews = await persistenceManager.readData('reviews');
        
        const productReviews = reviews.filter(review => review.productId === productId);
        
        // Calculate average rating
        const averageRating = productReviews.length > 0 
            ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
            : 0;
        
        res.json({
            success: true,
            data: {
                reviews: productReviews,
                totalReviews: productReviews.length,
                averageRating: Math.round(averageRating * 10) / 10
            }
        });
    } catch (error) {
        console.error('Error fetching product reviews:', error);
        res.status(500).json({
            success: false,
            error: 'FETCH_REVIEWS_ERROR',
            message: 'Failed to fetch product reviews'
        });
    }
});

// Submit a new review (authenticated users only)
router.post('/', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { error, value } = reviewSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: error.details[0].message
            });
        }

        const { productId, rating, title, comment } = value;
        const userId = req.user.id;
        const username = req.user.username;

        // Check if user already reviewed this product
        const reviews = await persistenceManager.readData('reviews');
        const existingReview = reviews.find(review => 
            review.productId === productId && review.userId === userId
        );

        if (existingReview) {
            return res.status(400).json({
                success: false,
                error: 'DUPLICATE_REVIEW',
                message: 'You have already reviewed this product'
            });
        }

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

        // Check if user purchased this product (optional verification)
        const orders = await persistenceManager.readData('orders');
        const userOrders = orders.filter(order => order.userId === userId && order.status === 'completed');
        const hasPurchased = userOrders.some(order => 
            order.items.some(item => item.productId === productId)
        );

        const newReview = {
            id: uuidv4(),
            productId,
            userId,
            username,
            rating,
            title,
            comment,
            verified: hasPurchased,
            helpful: 0,
            helpfulVotes: [],
            createdAt: new Date().toISOString()
        };

        reviews.push(newReview);
        await persistenceManager.writeData('reviews', reviews);

        res.status(201).json({
            success: true,
            data: newReview,
            message: 'Review submitted successfully'
        });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({
            success: false,
            error: 'SUBMIT_REVIEW_ERROR',
            message: 'Failed to submit review'
        });
    }
});

// Update a review (owner only)
router.put('/:reviewId', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { error, value } = reviewSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: error.details[0].message
            });
        }

        const { rating, title, comment } = value;
        const userId = req.user.id;

        const reviews = await persistenceManager.readData('reviews');
        const reviewIndex = reviews.findIndex(review => 
            review.id === reviewId && review.userId === userId
        );

        if (reviewIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'REVIEW_NOT_FOUND',
                message: 'Review not found or not owned by user'
            });
        }

        reviews[reviewIndex] = {
            ...reviews[reviewIndex],
            rating,
            title,
            comment,
            updatedAt: new Date().toISOString()
        };

        await persistenceManager.writeData('reviews', reviews);

        res.json({
            success: true,
            data: reviews[reviewIndex],
            message: 'Review updated successfully'
        });
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({
            success: false,
            error: 'UPDATE_REVIEW_ERROR',
            message: 'Failed to update review'
        });
    }
});

// Delete a review (owner or admin)
router.delete('/:reviewId', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        const reviews = await persistenceManager.readData('reviews');
        const reviewIndex = reviews.findIndex(review => 
            review.id === reviewId && (review.userId === userId || isAdmin)
        );

        if (reviewIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'REVIEW_NOT_FOUND',
                message: 'Review not found or insufficient permissions'
            });
        }

        const deletedReview = reviews.splice(reviewIndex, 1)[0];
        await persistenceManager.writeData('reviews', reviews);

        res.json({
            success: true,
            data: deletedReview,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            error: 'DELETE_REVIEW_ERROR',
            message: 'Failed to delete review'
        });
    }
});

// Mark review as helpful
router.post('/:reviewId/helpful', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user.id;

        const reviews = await persistenceManager.readData('reviews');
        const reviewIndex = reviews.findIndex(review => review.id === reviewId);

        if (reviewIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'REVIEW_NOT_FOUND',
                message: 'Review not found'
            });
        }

        const review = reviews[reviewIndex];
        
        // Initialize helpfulVotes array if it doesn't exist
        if (!review.helpfulVotes) {
            review.helpfulVotes = [];
        }

        // Check if user already voted
        const hasVoted = review.helpfulVotes.includes(userId);
        
        if (hasVoted) {
            // Remove vote
            review.helpfulVotes = review.helpfulVotes.filter(id => id !== userId);
            review.helpful = Math.max(0, (review.helpful || 0) - 1);
        } else {
            // Add vote
            review.helpfulVotes.push(userId);
            review.helpful = (review.helpful || 0) + 1;
        }

        reviews[reviewIndex] = review;
        await persistenceManager.writeData('reviews', reviews);

        res.json({
            success: true,
            data: {
                reviewId: review.id,
                helpful: review.helpful,
                userVoted: !hasVoted
            },
            message: hasVoted ? 'Vote removed' : 'Review marked as helpful'
        });
    } catch (error) {
        console.error('Error marking review as helpful:', error);
        res.status(500).json({
            success: false,
            error: 'HELPFUL_VOTE_ERROR',
            message: 'Failed to process helpful vote'
        });
    }
});

module.exports = router;