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

    // Wait for auth manager to initialize
    async waitForAuthManager() {
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            if (window.authManager && 
                typeof window.authManager.isAuthenticated === 'function') {
                // Auth manager exists and is ready
                console.log('Store Manager - Auth manager ready, attempts:', attempts);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
            attempts++;
        }
        
        console.warn('Store Manager - AuthManager not available after waiting');
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

    // Create HTML for a single product card
    createProductCard(product) {
        const isAuthenticated = window.authManager && window.authManager.isAuthenticated();
        
        return `
            <div class="product-card" data-product-id="${product.id}">
                <div class="product-image-placeholder">
                    <span class="product-category">${product.category}</span>
                </div>
                
                <div class="product-title">${sanitizeHTML(product.title)}</div>
                <div class="product-description">${sanitizeHTML(product.description)}</div>
                <div class="product-price">${formatCurrency(product.price)}</div>
                
                <div class="product-actions">
                    ${isAuthenticated ? 
                        `<button class="btn btn-primary" onclick="storeManager.addToCart('${product.id}')">
                            Add to Cart
                        </button>
                        <button class="btn btn-outline" onclick="storeManager.addToWishlist('${product.id}')" title="Add to Wishlist">
                            ♥
                        </button>` :
                        `<button class="btn btn-secondary" onclick="authManager.showMessage('Please login to add items to cart', 'warning')">
                            Login to Buy
                        </button>`
                    }
                    <button class="btn btn-outline" onclick="storeManager.viewProduct('${product.id}')">
                        View Details
                    </button>
                </div>
                
                ${product.inStock === false ? '<div class="out-of-stock">Out of Stock</div>' : ''}
            </div>
        `;
    }

    // Add product to wishlist
    async addToWishlist(productId) {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            window.authManager.showMessage('Please login to add items to wishlist', 'warning');
            return;
        }

        try {
            const user = window.authManager.currentUser;
            const product = this.products.find(p => p.id === productId);
            
            if (!product) {
                throw new Error('Product not found');
            }

            const response = await window.authManager.apiClient.post('/wishlist/add', {
                userId: user.id,
                productId: productId
            });
            
            if (response.success) {
                window.authManager.showMessage(`${product.title} added to wishlist!`, 'success');
            } else {
                throw new Error(response.message || 'Failed to add to wishlist');
            }
            
        } catch (error) {
            console.error('Failed to add to wishlist:', error);
            window.authManager.showMessage('Failed to add item to wishlist', 'error');
        }
    }

    // Add product to cart
    async addToCart(productId) {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            window.authManager.showMessage('Please login to add items to cart', 'warning');
            return;
        }

        try {
            const user = window.authManager.currentUser;
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
                        <div class="product-image-placeholder large">
                            <span class="product-category">${product.category}</span>
                        </div>
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
                    ${window.authManager && window.authManager.isAuthenticated() ? 
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
            if (!window.authManager.isAuthenticated()) {
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