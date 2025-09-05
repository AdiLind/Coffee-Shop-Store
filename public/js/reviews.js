class ReviewManager {
    constructor() {
        this.currentProductId = null;
        this.userRating = 0;
        this.reviews = [];
        this.currentUser = null;
        this.apiClient = new APIClient();
    }

    async init() {
        // Wait for auth manager to be ready
        await this.waitForAuthManager();
        
        // Get product ID from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.currentProductId = urlParams.get('productId');

        // Get current user from auth manager
        if (window.authManager) {
            this.currentUser = window.authManager.currentUser;
        }

        // Set up event listeners
        this.setupEventListeners();

        try {
            if (this.currentProductId) {
                await this.loadProductInfo();
                await this.loadReviews();
            } else {
                await this.showAllReviews();
            }
        } catch (error) {
            console.error('Error during initialization:', error);
            this.showError('Failed to load reviews');
        }

        this.updateUI();
    }

    async waitForAuthManager() {
        return await waitForAuthManager({
            managerName: 'Review Manager'
        });
    }

    setupEventListeners() {
        // Rating input
        const ratingStars = document.querySelectorAll('#rating-input .star');
        ratingStars.forEach(star => {
            star.addEventListener('click', (e) => {
                this.userRating = parseInt(e.target.dataset.rating);
                document.getElementById('rating').value = this.userRating;
                this.updateRatingDisplay();
            });

            star.addEventListener('mouseover', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.highlightStars('#rating-input', rating, true);
            });

            star.addEventListener('mouseout', () => {
                this.updateRatingDisplay();
            });
        });

        // Review form submission
        const reviewForm = document.getElementById('review-form');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitReview();
            });
        }
    }

    async loadProductInfo() {
        try {
            const response = await this.apiClient.getProduct(this.currentProductId);
            if (response.success) {
                const product = response.data;
                document.getElementById('product-title').textContent = `${product.title} - Reviews`;
                document.getElementById('product-description').textContent = product.description;
                document.getElementById('product-image').src = product.image || '/images/products/placeholder.jpg';
                document.getElementById('product-header').style.display = 'flex';
            }
        } catch (error) {
            console.error('Failed to load product info:', error);
        }
    }

    async loadReviews() {
        try {
            this.showLoading(true);
            const endpoint = this.currentProductId 
                ? `/reviews/product/${this.currentProductId}` 
                : '/reviews/all';
            
            const response = await this.apiClient.request(endpoint);
            
            if (response.success) {
                this.reviews = response.data.reviews || [];
                this.updateReviewStats(response.data);
                this.displayReviews();
            } else {
                this.showError('Failed to load reviews');
            }
        } catch (error) {
            console.error('Failed to load reviews:', error);
            this.showError('Failed to load reviews');
        } finally {
            this.showLoading(false);
        }
    }

    async showAllReviews() {
        // Show all reviews across all products
        document.getElementById('reviews-title').textContent = 'All Product Reviews';
        await this.loadAllReviews();
    }

    async loadAllReviews() {
        try {
            this.showLoading(true);
            const productsResponse = await this.apiClient.getProducts();
            if (!productsResponse.success) {
                return;
            }

            const products = productsResponse.data;
            let allReviews = [];

            for (const product of products) {
                try {
                    const reviewsResponse = await this.apiClient.request(`/reviews/product/${product.id}`);
                    if (reviewsResponse.success && reviewsResponse.data.reviews.length > 0) {
                        const reviews = reviewsResponse.data.reviews.map(review => ({
                            ...review,
                            productTitle: product.title,
                            productImage: product.image
                        }));
                        allReviews = allReviews.concat(reviews);
                    }
                } catch (error) {
                    console.error(`Failed to load reviews for product ${product.id}:`, error);
                }
            }

            // Sort by date (newest first)
            allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            this.reviews = allReviews;
            this.displayReviews();
        } catch (error) {
            console.error('Failed to load all reviews:', error);
            this.showError('Failed to load reviews');
        } finally {
            this.showLoading(false);
        }
    }

    displayReviews() {
        const reviewsList = document.getElementById('reviews-list');
        const noReviews = document.getElementById('no-reviews');
        
        if (this.reviews.length === 0) {
            reviewsList.innerHTML = '';
            noReviews.style.display = 'block';
        } else {
            noReviews.style.display = 'none';
            reviewsList.innerHTML = this.reviews.map(review => this.createReviewCard(review)).join('');
        }
    }

    updateReviewStats(data) {
        if (data.totalReviews > 0) {
            this.displayStars('#average-stars', data.averageRating);
            document.getElementById('average-rating').textContent = data.averageRating.toFixed(1);
            document.getElementById('review-stats').textContent = `(${data.totalReviews} review${data.totalReviews !== 1 ? 's' : ''})`;
        } else {
            document.getElementById('average-rating').textContent = '0.0';
            document.getElementById('review-stats').textContent = '(No reviews yet)';
        }
    }

    displayReviews() {
        const reviewsList = document.getElementById('reviews-list');
        const noReviews = document.getElementById('no-reviews');

        if (this.reviews.length === 0) {
            reviewsList.style.display = 'none';
            noReviews.style.display = 'block';
            return;
        }

        reviewsList.style.display = 'block';
        noReviews.style.display = 'none';

        reviewsList.innerHTML = this.reviews.map(review => this.renderReview(review)).join('');
        this.attachReviewEventListeners();
    }

    /**
     * Render a review card with all its components
     * @param {Object} review - Review data object
     * @returns {string} HTML string for the review card
     */
    renderReview(review) {
        const reviewDate = this.formatReviewDate(review.createdAt);
        const permissions = this.getReviewPermissions(review);
        const productInfo = this.renderProductInfo(review);
        const userSection = this.renderUserSection(review, reviewDate, permissions);
        const controlsSection = this.renderControlsSection(review, permissions);
        const contentSection = this.renderContentSection(review);
        const actionsSection = this.renderActionsSection(review);

        return `
            <div class="review-card" data-review-id="${review.id}">
                ${productInfo}
                <div class="review-header">
                    ${userSection}
                    ${controlsSection}
                </div>
                ${contentSection}
                ${actionsSection}
            </div>
        `;
    }

    /**
     * Format review creation date for display
     * @param {string} createdAt - ISO date string
     * @returns {string} Formatted date string
     */
    formatReviewDate(createdAt) {
        return new Date(createdAt).toLocaleDateString();
    }

    /**
     * Get permission flags for current user and review
     * @param {Object} review - Review data object
     * @returns {Object} Permission flags
     */
    getReviewPermissions(review) {
        const isOwner = this.currentUser && this.currentUser.id === review.userId;
        const isAdmin = this.currentUser && this.currentUser.role === 'admin';
        const canEdit = isOwner || isAdmin;
        return { isOwner, isAdmin, canEdit };
    }

    /**
     * Render product information section if available
     * @param {Object} review - Review data object
     * @returns {string} HTML string for product info or empty string
     */
    renderProductInfo(review) {
        if (!review.productTitle) {
            return '';
        }
        
        return `<div class="review-product">
            <img src="${review.productImage || '/images/products/placeholder.jpg'}" 
                 alt="${review.productTitle}" style="width: 40px; height: 40px; border-radius: 5px; margin-right: 10px;">
            <a href="/pages/reviews.html?productId=${review.productId}" style="text-decoration: none; color: var(--primary-color);">
                ${review.productTitle}
            </a>
        </div>`;
    }

    /**
     * Render user information section of review
     * @param {Object} review - Review data object
     * @param {string} reviewDate - Formatted date string
     * @param {Object} permissions - Permission flags
     * @returns {string} HTML string for user section
     */
    renderUserSection(review, reviewDate, permissions) {
        return `<div class="review-user">
            <div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <strong>${review.username}</strong>
                    ${review.verified ? '<span class="verified-badge">Verified Purchase</span>' : ''}
                </div>
                <div class="stars" style="margin-top: 5px;">
                    ${this.renderStars(review.rating)}
                </div>
            </div>
        </div>`;
    }

    /**
     * Render controls section (date and edit/delete buttons)
     * @param {Object} review - Review data object
     * @param {Object} permissions - Permission flags
     * @returns {string} HTML string for controls section
     */
    renderControlsSection(review, permissions) {
        const reviewDate = this.formatReviewDate(review.createdAt);
        const editButton = permissions.isOwner ? 
            `<button class="edit-btn" data-review-id="${review.id}">Edit</button>` : '';
        const deleteButton = permissions.canEdit ? 
            `<button class="delete-btn" data-review-id="${review.id}">Delete</button>` : '';
        
        const controlsHtml = permissions.canEdit ? 
            `<div class="review-controls" style="margin-top: 10px;">
                ${editButton}
                ${deleteButton}
            </div>` : '';

        return `<div style="text-align: right;">
            <div class="review-date">${reviewDate}</div>
            ${controlsHtml}
        </div>`;
    }

    /**
     * Render content section (title and comment)
     * @param {Object} review - Review data object
     * @returns {string} HTML string for content section
     */
    renderContentSection(review) {
        return `<div class="review-title">${review.title}</div>
        <div class="review-comment">${review.comment}</div>`;
    }

    /**
     * Render actions section (helpful button)
     * @param {Object} review - Review data object
     * @returns {string} HTML string for actions section
     */
    renderActionsSection(review) {
        return `<div class="review-actions">
            <button class="helpful-button" data-review-id="${review.id}">
                <span>👍</span>
                <span>Helpful (${review.helpful || 0})</span>
            </button>
        </div>`;
    }

    renderStars(rating) {
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="star ${i <= rating ? 'filled' : ''}">★</span>`;
        }
        return starsHtml;
    }

    displayStars(selector, rating) {
        const container = document.querySelector(selector);
        if (container) {
            container.innerHTML = this.renderStars(Math.round(rating));
        }
    }

    highlightStars(selector, rating, hover = false) {
        const stars = document.querySelectorAll(`${selector} .star`);
        stars.forEach((star, index) => {
            star.classList.remove('filled', 'hover');
            if (index < rating) {
                star.classList.add(hover ? 'hover' : 'filled');
            }
        });
    }

    updateRatingDisplay() {
        this.highlightStars('#rating-input', this.userRating);
    }

    attachReviewEventListeners() {
        // Helpful buttons
        document.querySelectorAll('.helpful-button').forEach(button => {
            button.addEventListener('click', async (e) => {
                if (!this.currentUser) {
                    NotificationSystem.warning('Please login to vote on reviews');
                    return;
                }
                
                const reviewId = e.currentTarget.dataset.reviewId;
                await this.markHelpful(reviewId);
            });
        });

        // Delete buttons
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const reviewId = e.currentTarget.dataset.reviewId;
                if (confirm('Are you sure you want to delete this review?')) {
                    await this.deleteReview(reviewId);
                }
            });
        });

        // Edit buttons
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const reviewId = e.currentTarget.dataset.reviewId;
                this.editReview(reviewId);
            });
        });
    }

    async submitReview() {
        if (!this.currentUser) {
            NotificationSystem.warning('Please login to submit a review');
            return;
        }

        if (!this.currentProductId) {
            NotificationSystem.error('Product ID is required');
            return;
        }

        const formData = new FormData(document.getElementById('review-form'));
        const reviewData = {
            productId: this.currentProductId,
            rating: this.userRating,
            title: formData.get('title').trim(),
            comment: formData.get('comment').trim()
        };

        if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
            NotificationSystem.warning('Please select a rating');
            return;
        }

        if (!reviewData.title || reviewData.title.length < 1) {
            NotificationSystem.warning('Please enter a review title');
            return;
        }

        if (!reviewData.comment || reviewData.comment.length < 1) {
            NotificationSystem.warning('Please enter a review comment');
            return;
        }

        try {
            const response = await this.apiClient.request('/reviews', {
                method: 'POST',
                body: JSON.stringify(reviewData)
            });
            
            if (response.success) {
                document.getElementById('review-form').reset();
                this.userRating = 0;
                this.updateRatingDisplay();
                await this.loadReviews();
                NotificationSystem.success('Review submitted successfully!');
            } else {
                NotificationSystem.error(response.message || 'Failed to submit review');
            }
        } catch (error) {
            console.error('Failed to submit review:', error);
            NotificationSystem.error('Failed to submit review. Please try again.');
        }
    }

    async markHelpful(reviewId) {
        try {
            const response = await this.apiClient.request(`/reviews/${reviewId}/helpful`, {
                method: 'POST'
            });
            
            if (response.success) {
                // Update the helpful count in the UI
                const button = document.querySelector(`[data-review-id="${reviewId}"].helpful-button`);
                if (button) {
                    const span = button.querySelector('span:last-child');
                    span.textContent = `Helpful (${response.data.helpful})`;
                    
                    if (response.data.userVoted) {
                        button.classList.add('voted');
                    } else {
                        button.classList.remove('voted');
                    }
                }
            } else {
                NotificationSystem.error(response.message || 'Failed to vote on review');
            }
        } catch (error) {
            console.error('Failed to mark review as helpful:', error);
            NotificationSystem.error('Failed to vote on review');
        }
    }

    async deleteReview(reviewId) {
        try {
            const response = await this.apiClient.request(`/reviews/${reviewId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                await this.loadReviews();
                NotificationSystem.success('Review deleted successfully');
            } else {
                NotificationSystem.error(response.message || 'Failed to delete review');
            }
        } catch (error) {
            console.error('Failed to delete review:', error);
            NotificationSystem.error('Failed to delete review');
        }
    }

    editReview(reviewId) {
        // For now, just show an alert. In a full implementation, 
        // you'd show an edit form or modal
        NotificationSystem.info('Edit functionality would be implemented here');
    }

    updateUI() {
        const formContainer = document.getElementById('review-form-container');
        const loginPrompt = document.getElementById('login-prompt');

        if (this.currentUser && this.currentProductId) {
            formContainer.style.display = 'block';
            loginPrompt.style.display = 'none';
        } else if (!this.currentUser && this.currentProductId) {
            formContainer.style.display = 'none';
            loginPrompt.style.display = 'block';
        } else {
            formContainer.style.display = 'none';
            loginPrompt.style.display = 'none';
        }
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// ReviewManager class is ready for instantiation  
// Global instance will be initialized by the consuming page