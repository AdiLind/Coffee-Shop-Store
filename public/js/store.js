// Store Manager for Coffee Shop Frontend
class StoreManager {
    constructor() {
        this.apiClient = new APIClient();
        this.products = [];
        this.filteredProducts = [];
        this.currentCategory = '';
        this.currentSearch = '';
        this.init();
    }

    async init() {
        // Wait for auth manager to initialize first
        await this.waitForAuthManager();
        
        // Load products when page loads
        await this.loadProducts();
        this.setupEventListeners();
        this.updateGuestWarning();
    }

    // Wait for auth manager to initialize using shared utility
    async waitForAuthManager() {
        return await waitForAuthManager({
            managerName: 'Store Manager'
        });
    }

    // Load all products from API
    async loadProducts() {
        try {
            showLoading('productsGrid');
            const response = await this.apiClient.getProducts();
            
            if (response.success) {
                this.products = response.data;
                this.filteredProducts = [...this.products];
                this.renderProducts();
            } else {
                throw new Error(response.message || 'Failed to load products');
            }
        } catch (error) {
            console.error('Failed to load products:', error);
            this.showError('Failed to load products. Please refresh the page.');
        } finally {
            hideLoading('productsGrid');
        }
    }

    // Search products
    async searchProducts() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.trim();
        
        if (!query) {
            this.filteredProducts = [...this.products];
            this.renderProducts();
            return;
        }

        try {
            showLoading('productsGrid');
            const response = await this.apiClient.searchProducts(query);
            
            if (response.success) {
                this.filteredProducts = response.data;
                this.currentSearch = query;
                this.renderProducts();
            } else {
                throw new Error(response.message || 'Search failed');
            }
        } catch (error) {
            console.error('Search failed:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            hideLoading('productsGrid');
        }
    }

    // Filter products by category
    async filterByCategory(category) {
        try {
            showLoading('productsGrid');
            
            if (!category) {
                // Show all products
                this.filteredProducts = [...this.products];
                this.currentCategory = '';
            } else {
                const response = await this.apiClient.getProductsByCategory(category);
                
                if (response.success) {
                    this.filteredProducts = response.data;
                    this.currentCategory = category;
                } else {
                    throw new Error(response.message || 'Filter failed');
                }
            }
            
            this.renderProducts();
        } catch (error) {
            console.error('Filter failed:', error);
            this.showError('Failed to filter products. Please try again.');
        } finally {
            hideLoading('productsGrid');
        }
    }

    // Render products in the grid
    renderProducts() {
        const productsGrid = document.getElementById('productsGrid');
        
        if (this.filteredProducts.length === 0) {
            productsGrid.innerHTML = `
                <div class="no-products">
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filter criteria.</p>
                </div>
            `;
            return;
        }

        const productsHTML = this.filteredProducts.map(product => this.createProductCard(product)).join('');
        productsGrid.innerHTML = productsHTML;
    }

    /**
     * Create HTML for a single product card
     * @param {Object} product - Product data object
     * @returns {string} HTML string for the product card
     */
    createProductCard(product) {
        const isAuthenticated = AuthHelper.isAuthenticated();
        
        return this.createProductCardContainer(
            product.id,
            this.createProductImage(product),
            this.createProductCategoryBadge(product),
            this.createProductInfo(product),
            this.createProductActions(product, isAuthenticated),
            this.createOutOfStockBadge(product)
        );
    }

    /**
     * Create the main product card container
     * @param {string} productId - Product ID
     * @param {string} imageHTML - Product image HTML
     * @param {string} badgeHTML - Category badge HTML
     * @param {string} infoHTML - Product info HTML
     * @param {string} actionsHTML - Product actions HTML
     * @param {string} stockHTML - Stock status HTML
     * @returns {string} Complete product card HTML
     */
    createProductCardContainer(productId, imageHTML, badgeHTML, infoHTML, actionsHTML, stockHTML) {
        return `
            <div class="product-card" data-product-id="${productId}">
                ${imageHTML}
                ${badgeHTML}
                ${infoHTML}
                ${actionsHTML}
                ${stockHTML}
            </div>
        `;
    }

    /**
     * Create product image HTML
     * @param {Object} product - Product data object
     * @returns {string} Product image HTML
     */
    createProductImage(product) {
        return `<img src="${product.image || '/images/products/placeholder.jpg'}" 
                     alt="${product.title}" class="product-image">`;
    }

    /**
     * Create product category badge HTML
     * @param {Object} product - Product data object
     * @returns {string} Category badge HTML
     */
    createProductCategoryBadge(product) {
        return `<div class="product-category-badge">${product.category}</div>`;
    }

    /**
     * Create product information HTML (title, description, price)
     * @param {Object} product - Product data object
     * @returns {string} Product info HTML
     */
    createProductInfo(product) {
        return `
                <div class="product-title">${sanitizeHTML(product.title)}</div>
                <div class="product-description">${sanitizeHTML(product.description)}</div>
                <div class="product-price">${formatCurrency(product.price)}</div>
        `;
    }

    /**
     * Create product actions HTML (buttons for cart, wishlist, view)
     * @param {Object} product - Product data object
     * @param {boolean} isAuthenticated - User authentication status
     * @returns {string} Product actions HTML
     */
    createProductActions(product, isAuthenticated) {
        const mainActions = isAuthenticated ?
            this.createAuthenticatedActions(product.id) :
            this.createGuestActions();
        
        return `
                <div class="product-actions">
                    ${mainActions}
                    ${this.createViewDetailsButton(product.id)}
                </div>
        `;
    }

    /**
     * Create actions for authenticated users
     * @param {string} productId - Product ID
     * @returns {string} Authenticated user actions HTML
     */
    createAuthenticatedActions(productId) {
        return `<button class="btn btn-primary" onclick="storeManager.addToCart('${productId}')">
                            Add to Cart
                        </button>
                        <button class="btn btn-outline" onclick="storeManager.addToWishlist('${productId}')" title="Add to Wishlist">
                            ♥
                        </button>`;
    }

    /**
     * Create actions for guest users
     * @returns {string} Guest user actions HTML
     */
    createGuestActions() {
        return `<button class="btn btn-secondary" onclick="authManager.showMessage('Please login to add items to cart', 'warning')">
                            Login to Buy
                        </button>`;
    }

    /**
     * Create view details button
     * @param {string} productId - Product ID
     * @returns {string} View details button HTML
     */
    createViewDetailsButton(productId) {
        return `<button class="btn btn-outline" onclick="storeManager.viewProduct('${productId}')">
                        View Details
                    </button>`;
    }

    /**
     * Create out of stock badge if needed
     * @param {Object} product - Product data object
     * @returns {string} Out of stock HTML or empty string
     */
    createOutOfStockBadge(product) {
        return product.inStock === false ? '<div class="out-of-stock">Out of Stock</div>' : '';
    }

    // Add product to wishlist
    async addToWishlist(productId) {
        if (!AuthHelper.isAuthenticated()) {
            AuthHelper.handleAuthFailure('add items to wishlist');
            return;
        }

        try {
            const user = AuthHelper.getCurrentUser();
            const product = this.products.find(p => p.id === productId);
            
            if (!product) {
                throw new Error('Product not found');
            }

            const response = await window.authManager.apiClient.request('/wishlist/add', {
                method: 'POST',
                body: JSON.stringify({
                    productId: productId
                })
            });
            
            if (response.success) {
                window.authManager.showMessage(`${product.title} added to wishlist!`, 'success');
                
                // Update wishlist counter
                if (window.wishlistManager) {
                    window.wishlistManager.updateWishlistCounter();
                } else {
                    // If wishlist manager isn't available, update counter directly
                    this.updateWishlistCountDirect();
                }
            } else {
                throw new Error(response.message || 'Failed to add to wishlist');
            }
            
        } catch (error) {
            console.error('Failed to add to wishlist:', error);
            window.authManager.showMessage('Failed to add item to wishlist', 'error');
        }
    }

    async updateWishlistCountDirect() {
        try {
            if (!AuthHelper.isAuthenticated()) {
                return;
            }
            
            const user = AuthHelper.getCurrentUser();
            const response = await window.authManager.apiClient.request(`/wishlist/${user.id}`);
            if (response.success) {
                const counter = document.getElementById('wishlist-count');
                if (counter) {
                    counter.textContent = response.data.totalItems || 0;
                }
            }
        } catch (error) {
            console.error('Failed to update wishlist count:', error);
        }
    }

    // Add product to cart
    async addToCart(productId) {
        if (!AuthHelper.isAuthenticated()) {
            AuthHelper.handleAuthFailure('add items to cart');
            return;
        }

        try {
            const user = AuthHelper.getCurrentUser();
            const product = this.products.find(p => p.id === productId);
            
            if (!product) {
                throw new Error('Product not found');
            }

            // Get current cart
            const cartResponse = await this.apiClient.getCart(user.id);
            const currentCart = cartResponse.success ? cartResponse.data : { items: [] };
            
            // Check if product is already in cart
            const existingItemIndex = currentCart.items.findIndex(item => item.productId === productId);
            
            if (existingItemIndex >= 0) {
                // Update quantity
                currentCart.items[existingItemIndex].quantity += 1;
            } else {
                // Add new item
                currentCart.items.push({
                    productId: productId,
                    title: product.title,
                    price: product.price,
                    quantity: 1
                });
            }
            
            // Update cart on server
            await this.apiClient.updateCart(user.id, currentCart);
            
            // Update cart count in navigation
            if (window.authManager && window.authManager.updateCartCount) {
                await window.authManager.updateCartCount();
            }
            
            window.authManager.showMessage(`${product.title} added to cart!`, 'success');
            
        } catch (error) {
            console.error('Failed to add to cart:', error);
            window.authManager.showMessage('Failed to add item to cart', 'error');
        }
    }

    // View product details
    viewProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Create modal or navigate to product page
        this.showProductModal(product);
    }

    // Show product details modal
    showProductModal(product) {
        const modal = document.createElement('div');
        modal.className = 'product-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${sanitizeHTML(product.title)}</h2>
                    <button class="modal-close" onclick="this.closest('.product-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="product-details">
                        <img src="${product.image || '/images/products/placeholder.jpg'}" 
                             alt="${product.title}" class="product-image large">
                        <div class="product-category-badge">${product.category}</div>
                        <div class="product-info">
                            <p class="product-description">${sanitizeHTML(product.description)}</p>
                            <p class="product-price large">${formatCurrency(product.price)}</p>
                            <p class="product-meta">Category: ${product.category}</p>
                            <p class="product-meta">Added: ${formatDate(product.createdAt)}</p>
                            ${product.inStock === false ? '<p class="out-of-stock">Out of Stock</p>' : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    ${AuthHelper.isAuthenticated() ? 
                        `<button class="btn btn-primary" onclick="storeManager.addToCart('${product.id}'); this.closest('.product-modal').remove();">
                            Add to Cart
                        </button>
                        <button class="btn btn-outline" onclick="window.location.href='/pages/reviews.html?productId=${product.id}'">
                            Write Review
                        </button>` :
                        `<button class="btn btn-secondary" onclick="authManager.showMessage('Please login to add items to cart', 'warning')">
                            Login to Buy
                        </button>`
                    }
                    <a href="/pages/reviews.html?productId=${product.id}" class="btn btn-outline">View Reviews</a>
                    <button class="btn btn-outline" onclick="this.closest('.product-modal').remove()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Setup event listeners
    setupEventListeners() {
        // Search on Enter key
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchProducts();
                }
            });

            // Debounced search as user types
            let searchTimeout;
            searchInput.addEventListener('input', () => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (searchInput.value.trim()) {
                        this.searchProducts();
                    } else {
                        this.filteredProducts = [...this.products];
                        this.renderProducts();
                    }
                }, 300);
            });
        }
    }

    // Update guest warning visibility
    updateGuestWarning() {
        const guestWarning = document.getElementById('guestWarning');
        if (guestWarning && window.authManager) {
            if (!AuthHelper.isAuthenticated()) {
                guestWarning.style.display = 'block';
            } else {
                guestWarning.style.display = 'none';
            }
        }
        
        // Re-render products to update button states when auth status changes
        if (this.filteredProducts.length > 0) {
            console.log('Store Manager - Re-rendering products for auth status change');
            this.renderProducts();
        }
    }

    // Method to refresh auth status and update UI (called from auth manager)
    refreshAuthStatus() {
        console.log('Store Manager - Refreshing auth status');
        this.updateGuestWarning();
    }

    // Show error message
    showError(message) {
        const productsGrid = document.getElementById('productsGrid');
        productsGrid.innerHTML = `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="storeManager.loadProducts()">Try Again</button>
            </div>
        `;
    }
}

// Initialize store manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Store Manager - Initializing...');
    window.storeManager = new StoreManager();
});