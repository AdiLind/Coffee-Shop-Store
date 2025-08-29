class WishlistManager {
    constructor() {
        this.wishlist = [];
        this.selectedItems = new Set();
        this.currentUser = null;
    }

    async init() {
        this.currentUser = AuthManager.currentUser;
        
        if (!this.currentUser) {
            this.showLoginPrompt();
            return;
        }

        this.setupEventListeners();
        await this.loadWishlist();
        this.showWishlistContent();
    }

    setupEventListeners() {
        // Select all button
        document.getElementById('select-all-btn').addEventListener('click', () => {
            this.toggleSelectAll();
        });

        // Clear wishlist button
        document.getElementById('clear-wishlist-btn').addEventListener('click', () => {
            this.clearWishlist();
        });

        // Bulk action buttons
        document.getElementById('add-selected-to-cart').addEventListener('click', () => {
            this.addSelectedToCart();
        });

        document.getElementById('remove-selected').addEventListener('click', () => {
            this.removeSelected();
        });

        document.getElementById('clear-selection').addEventListener('click', () => {
            this.clearSelection();
        });
    }

    async loadWishlist() {
        try {
            this.showLoading(true);
            const response = await AuthManager.apiClient.get(`/wishlist/${this.currentUser.id}`);
            
            if (response.success) {
                this.wishlist = response.data.items || [];
                this.updateDisplay();
            } else {
                this.showError('Failed to load wishlist');
            }
        } catch (error) {
            console.error('Failed to load wishlist:', error);
            this.showError('Failed to load wishlist');
        } finally {
            this.showLoading(false);
        }
    }

    updateDisplay() {
        this.displayWishlistItems();
        this.updateStats();
        this.updateWishlistCounter();
    }

    displayWishlistItems() {
        const itemsContainer = document.getElementById('wishlist-items');
        const emptyWishlist = document.getElementById('empty-wishlist');

        if (this.wishlist.length === 0) {
            itemsContainer.style.display = 'none';
            emptyWishlist.style.display = 'block';
            return;
        }

        itemsContainer.style.display = 'grid';
        emptyWishlist.style.display = 'none';

        itemsContainer.innerHTML = this.wishlist.map(item => this.renderWishlistItem(item)).join('');
        this.attachItemEventListeners();
    }

    renderWishlistItem(item) {
        const product = item.product;
        if (!product) return '';

        const addedDate = new Date(item.addedAt).toLocaleDateString();
        const isSelected = this.selectedItems.has(item.id);

        return `
            <div class="wishlist-item" data-item-id="${item.id}">
                <input type="checkbox" class="item-checkbox" data-item-id="${item.id}" ${isSelected ? 'checked' : ''}>
                
                <img src="${product.image || '/images/products/placeholder.jpg'}" 
                     alt="${product.title}" class="wishlist-item-image">
                
                <div class="wishlist-item-content">
                    <h3 class="wishlist-item-title">${product.title}</h3>
                    <div class="wishlist-item-price">$${product.price.toFixed(2)}</div>
                    
                    <div class="wishlist-item-description">
                        ${product.description}
                    </div>
                    
                    ${item.notes ? `
                        <div class="wishlist-item-notes">
                            <strong>Notes:</strong> ${item.notes}
                        </div>
                    ` : ''}
                    
                    <div class="wishlist-item-meta">
                        <span>Added: ${addedDate}</span>
                        <span class="${product.inStock ? 'in-stock' : 'out-of-stock'}">
                            ${product.inStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                    </div>
                    
                    <div class="wishlist-item-actions">
                        <button class="btn-add-cart" data-product-id="${product.id}" 
                                ${!product.inStock ? 'disabled' : ''}>
                            ${!product.inStock ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                        <button class="btn-remove" data-item-id="${item.id}" data-product-id="${product.id}">
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    attachItemEventListeners() {
        // Checkbox events
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemId = e.target.dataset.itemId;
                if (e.target.checked) {
                    this.selectedItems.add(itemId);
                } else {
                    this.selectedItems.delete(itemId);
                }
                this.updateBulkActions();
            });
        });

        // Add to cart buttons
        document.querySelectorAll('.btn-add-cart').forEach(button => {
            button.addEventListener('click', async (e) => {
                const productId = e.target.dataset.productId;
                await this.addToCart(productId);
            });
        });

        // Remove buttons
        document.querySelectorAll('.btn-remove').forEach(button => {
            button.addEventListener('click', async (e) => {
                const itemId = e.target.dataset.itemId;
                const productId = e.target.dataset.productId;
                await this.removeFromWishlist(productId, itemId);
            });
        });
    }

    async addToCart(productId) {
        try {
            // Find the product to add to cart
            const wishlistItem = this.wishlist.find(item => item.product.id === productId);
            if (!wishlistItem) return;

            const product = wishlistItem.product;
            
            // Add to cart
            const cartResponse = await AuthManager.apiClient.post(`/cart/${this.currentUser.id}`, {
                productId: product.id,
                quantity: 1
            });

            if (cartResponse.success) {
                // Optionally remove from wishlist after adding to cart
                if (confirm('Item added to cart! Remove from wishlist?')) {
                    await this.removeFromWishlist(productId, wishlistItem.id);
                }
                
                // Update cart counter
                this.updateCartCounter();
                alert(`${product.title} added to cart!`);
            } else {
                alert(cartResponse.message || 'Failed to add item to cart');
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
            alert('Failed to add item to cart');
        }
    }

    async removeFromWishlist(productId, itemId) {
        try {
            const response = await AuthManager.apiClient.delete(`/wishlist/remove/${productId}`);
            
            if (response.success) {
                // Remove from local state
                this.wishlist = this.wishlist.filter(item => item.id !== itemId);
                this.selectedItems.delete(itemId);
                
                this.updateDisplay();
                this.updateBulkActions();
                
                alert('Item removed from wishlist');
            } else {
                alert(response.message || 'Failed to remove item from wishlist');
            }
        } catch (error) {
            console.error('Failed to remove from wishlist:', error);
            alert('Failed to remove item from wishlist');
        }
    }

    toggleSelectAll() {
        const selectAllBtn = document.getElementById('select-all-btn');
        const checkboxes = document.querySelectorAll('.item-checkbox');
        
        if (this.selectedItems.size === this.wishlist.length) {
            // Deselect all
            this.selectedItems.clear();
            checkboxes.forEach(cb => cb.checked = false);
            selectAllBtn.textContent = 'Select All';
        } else {
            // Select all
            this.selectedItems.clear();
            this.wishlist.forEach(item => this.selectedItems.add(item.id));
            checkboxes.forEach(cb => cb.checked = true);
            selectAllBtn.textContent = 'Deselect All';
        }
        
        this.updateBulkActions();
    }

    async addSelectedToCart() {
        if (this.selectedItems.size === 0) {
            alert('Please select items to add to cart');
            return;
        }

        const selectedProducts = this.wishlist
            .filter(item => this.selectedItems.has(item.id))
            .map(item => item.product.id);

        try {
            // Move items to cart
            const response = await AuthManager.apiClient.post('/wishlist/to-cart', {
                productIds: selectedProducts
            });

            if (response.success) {
                // Remove moved items from wishlist
                this.wishlist = this.wishlist.filter(item => !this.selectedItems.has(item.id));
                this.selectedItems.clear();
                
                this.updateDisplay();
                this.updateBulkActions();
                this.updateCartCounter();
                
                alert(`${response.data.movedCount} item(s) moved to cart!`);
            } else {
                alert(response.message || 'Failed to move items to cart');
            }
        } catch (error) {
            console.error('Failed to move items to cart:', error);
            alert('Failed to move items to cart');
        }
    }

    async removeSelected() {
        if (this.selectedItems.size === 0) {
            alert('Please select items to remove');
            return;
        }

        if (!confirm(`Remove ${this.selectedItems.size} selected item(s) from wishlist?`)) {
            return;
        }

        const selectedProducts = this.wishlist
            .filter(item => this.selectedItems.has(item.id))
            .map(item => item.product.id);

        try {
            // Remove each selected item
            for (const productId of selectedProducts) {
                await AuthManager.apiClient.delete(`/wishlist/remove/${productId}`);
            }

            // Update local state
            this.wishlist = this.wishlist.filter(item => !this.selectedItems.has(item.id));
            this.selectedItems.clear();
            
            this.updateDisplay();
            this.updateBulkActions();
            
            alert('Selected items removed from wishlist');
        } catch (error) {
            console.error('Failed to remove selected items:', error);
            alert('Failed to remove selected items');
        }
    }

    clearSelection() {
        this.selectedItems.clear();
        document.querySelectorAll('.item-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('select-all-btn').textContent = 'Select All';
        this.updateBulkActions();
    }

    async clearWishlist() {
        if (this.wishlist.length === 0) return;

        if (!confirm('Are you sure you want to clear your entire wishlist? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await AuthManager.apiClient.delete('/wishlist/clear');
            
            if (response.success) {
                this.wishlist = [];
                this.selectedItems.clear();
                this.updateDisplay();
                this.updateBulkActions();
                alert('Wishlist cleared successfully');
            } else {
                alert(response.message || 'Failed to clear wishlist');
            }
        } catch (error) {
            console.error('Failed to clear wishlist:', error);
            alert('Failed to clear wishlist');
        }
    }

    updateStats() {
        const totalItems = this.wishlist.length;
        const totalValue = this.wishlist.reduce((sum, item) => sum + (item.product?.price || 0), 0);

        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('total-value').textContent = `$${totalValue.toFixed(2)}`;
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        const selectAllBtn = document.getElementById('select-all-btn');

        selectedCount.textContent = this.selectedItems.size;
        
        if (this.selectedItems.size > 0) {
            bulkActions.classList.add('active');
        } else {
            bulkActions.classList.remove('active');
        }

        // Update select all button text
        if (this.selectedItems.size === this.wishlist.length && this.wishlist.length > 0) {
            selectAllBtn.textContent = 'Deselect All';
        } else {
            selectAllBtn.textContent = 'Select All';
        }
    }

    updateWishlistCounter() {
        const counter = document.getElementById('wishlist-count');
        if (counter) {
            counter.textContent = this.wishlist.length;
        }
    }

    updateCartCounter() {
        // This would typically call the cart manager to update the cart counter
        // For now, we'll just trigger a cart count update
        if (window.CartManager) {
            window.CartManager.updateCartCount();
        }
    }

    showLoginPrompt() {
        document.getElementById('login-prompt').style.display = 'block';
        document.getElementById('wishlist-content').style.display = 'none';
    }

    showWishlistContent() {
        document.getElementById('login-prompt').style.display = 'none';
        document.getElementById('wishlist-content').style.display = 'block';
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    // Static method to add item to wishlist from other pages
    static async addToWishlist(productId, notes = '') {
        try {
            const response = await AuthManager.apiClient.post('/wishlist/add', {
                productId,
                notes
            });

            if (response.success) {
                // Update wishlist counter if on wishlist page
                if (window.WishlistManager && window.WishlistManager.updateWishlistCounter) {
                    window.WishlistManager.updateWishlistCounter();
                }
                return true;
            } else {
                alert(response.message || 'Failed to add to wishlist');
                return false;
            }
        } catch (error) {
            console.error('Failed to add to wishlist:', error);
            alert('Failed to add to wishlist');
            return false;
        }
    }
}

// Global instance
const WishlistManager = new WishlistManager();