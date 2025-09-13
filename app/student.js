// Student interface module for the food ordering application

class StudentManager {
    constructor() {
        this.selectedStore = null;
        this.menuItems = [];
        this.stores = [];
        this.currentCategory = 'all';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Store selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.store-card')) {
                const storeId = e.target.closest('.store-card').dataset.storeId;
                this.selectStore(storeId);
            }
        });

        // Category filtering
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-btn')) {
                const category = e.target.dataset.category;
                this.filterByCategory(category);
            }
        });

        // Add to cart buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart')) {
                const itemId = e.target.closest('.menu-item').dataset.itemId;
                this.addToCart(itemId);
            }
        });

        // Quantity controls
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('quantity-btn')) {
                const action = e.target.dataset.action;
                const itemId = e.target.closest('.menu-item').dataset.itemId;
                this.updateQuantity(itemId, action);
            }
        });

        // Cart controls
        const cartToggle = document.getElementById('cartToggle');
        if (cartToggle) {
            cartToggle.addEventListener('click', () => this.toggleCart());
        }

        const closeCart = document.getElementById('closeCart');
        if (closeCart) {
            closeCart.addEventListener('click', () => this.closeCart());
        }

        // Change store button
        const changeStore = document.getElementById('changeStore');
        if (changeStore) {
            changeStore.addEventListener('click', () => this.changeStore());
        }

        // Checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.proceedToCheckout());
        }

        // Cart quantity controls
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cart-quantity-btn')) {
                const action = e.target.dataset.action;
                const itemId = e.target.closest('.cart-item').dataset.itemId;
                this.updateCartQuantity(itemId, action);
            }
        });

        // Remove from cart
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-from-cart')) {
                const itemId = e.target.closest('.cart-item').dataset.itemId;
                this.removeFromCart(itemId);
            }
        });
    }

    async loadStores() {
        try {
            Utils.showLoading();
            
            // Load stores data
            const storesResponse = await Utils.getTableData('stores');
            this.stores = storesResponse.data || [];
            
            // If no stores exist, create them
            if (this.stores.length === 0) {
                await this.createDefaultStores();
                const storesResponse = await Utils.getTableData('stores');
                this.stores = storesResponse.data || [];
            }

            this.renderStores();
        } catch (error) {
            Utils.showToast('Failed to load stores', 'error');
            console.error('Load stores error:', error);
        } finally {
            Utils.hideLoading();
        }
    }

    async createDefaultStores() {
        const defaultStores = [
            {
                id: 'store-1',
                name: 'Food Court 1',
                description: 'Traditional Indian cuisine with rice, curries, and authentic snacks'
            },
            {
                id: 'store-2',
                name: 'Food Court 2', 
                description: 'Diverse menu with chapati, dal, paneer dishes, and South Indian specialties'
            }
        ];

        for (const store of defaultStores) {
            await Utils.createRecord('stores', store);
        }
    }

    renderStores() {
        const storeCards = document.getElementById('storeCards');
        if (!storeCards) return;

        storeCards.innerHTML = this.stores.map(store => `
            <div class="store-card" data-store-id="${store.id}">
                <div class="store-icon">
                    <i class="fas fa-store"></i>
                </div>
                <h3>${Utils.sanitizeHtml(store.name)}</h3>
                <p>${Utils.sanitizeHtml(store.description)}</p>
                <div class="store-select-btn">
                    <i class="fas fa-arrow-right"></i>
                    Select Store
                </div>
            </div>
        `).join('');
    }

    async selectStore(storeId) {
        try {
            Utils.showLoading();
            
            const store = this.stores.find(s => s.id === storeId);
            if (!store) {
                throw new Error('Store not found');
            }

            this.selectedStore = store;
            
            // Update UI
            const selectedStoreName = document.getElementById('selectedStoreName');
            if (selectedStoreName) {
                selectedStoreName.textContent = store.name;
            }

            // Show menu section
            const menuSection = document.getElementById('menuSection');
            if (menuSection) {
                menuSection.style.display = 'block';
            }

            // Load menu items for this store
            await this.loadMenuItems(storeId);

            // Hide store selector
            const storeSelector = document.querySelector('.store-selector');
            if (storeSelector) {
                storeSelector.style.display = 'none';
            }

            Utils.showToast(`Selected ${store.name}`, 'success');

        } catch (error) {
            Utils.showToast('Failed to select store', 'error');
            console.error('Select store error:', error);
        } finally {
            Utils.hideLoading();
        }
    }

    async loadMenuItems(storeId) {
        try {
            // Load all menu items
            const menuResponse = await Utils.getTableData('menu_items');
            const allMenuItems = menuResponse.data || [];

            // Load store-item relationships
            const storeItemsResponse = await Utils.getTableData('store_items');
            const storeItems = storeItemsResponse.data || [];

            // Filter items available in this store
            const availableItemIds = storeItems
                .filter(si => si.store_id === storeId && si.available)
                .map(si => si.menu_item_id);

            this.menuItems = allMenuItems.filter(item => 
                availableItemIds.includes(item.id) && item.available
            );

            // If no menu items exist, create default ones
            if (allMenuItems.length === 0) {
                await this.createDefaultMenuItems();
                await this.loadMenuItems(storeId);
                return;
            }

            this.renderMenuItems();
        } catch (error) {
            Utils.showToast('Failed to load menu items', 'error');
            console.error('Load menu items error:', error);
        }
    }

    async createDefaultMenuItems() {
        // This will be implemented in the data population task
        // For now, just show a message
        Utils.showToast('Menu items are being set up...', 'info');
    }

    renderMenuItems() {
        const menuGrid = document.getElementById('menuGrid');
        if (!menuGrid) return;

        const filteredItems = this.currentCategory === 'all' 
            ? this.menuItems 
            : this.menuItems.filter(item => item.category === this.currentCategory);

        if (filteredItems.length === 0) {
            menuGrid.innerHTML = `
                <div class="no-items">
                    <i class="fas fa-utensils"></i>
                    <p>No items available in this category</p>
                </div>
            `;
            return;
        }

        menuGrid.innerHTML = filteredItems.map(item => {
            const nutrition = Utils.formatNutrition(item.calories, item.carbs, item.protein, item.fat);
            const cart = Utils.getCart();
            const cartItem = cart.find(ci => ci.id === item.id);
            const quantity = cartItem ? cartItem.quantity : 0;

            return `
                <div class="menu-item" data-item-id="${item.id}">
                    <div class="menu-item-content">
                        <div class="menu-item-header">
                            <div class="item-info">
                                <h3>${Utils.sanitizeHtml(item.name)}</h3>
                                <p class="item-description">${Utils.sanitizeHtml(item.description || '')}</p>
                            </div>
                            <div class="item-price">${Utils.formatCurrency(item.price)}</div>
                        </div>
                        
                        <div class="nutrition-info">
                            <div class="nutrition-item">
                                <span class="nutrition-label">${nutrition.calories.label}</span>
                                <span class="nutrition-value" style="color: ${nutrition.calories.color}">
                                    ${nutrition.calories.value}
                                </span>
                            </div>
                            <div class="nutrition-item">
                                <span class="nutrition-label">${nutrition.carbs.label}</span>
                                <span class="nutrition-value" style="color: ${nutrition.carbs.color}">
                                    ${nutrition.carbs.value}
                                </span>
                            </div>
                            <div class="nutrition-item">
                                <span class="nutrition-label">${nutrition.protein.label}</span>
                                <span class="nutrition-value" style="color: ${nutrition.protein.color}">
                                    ${nutrition.protein.value}
                                </span>
                            </div>
                            <div class="nutrition-item">
                                <span class="nutrition-label">${nutrition.fat.label}</span>
                                <span class="nutrition-value" style="color: ${nutrition.fat.color}">
                                    ${nutrition.fat.value}
                                </span>
                            </div>
                        </div>

                        <div class="item-actions">
                            ${quantity > 0 ? `
                                <div class="quantity-controls">
                                    <button class="quantity-btn" data-action="decrease">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <span class="quantity">${quantity}</span>
                                    <button class="quantity-btn" data-action="increase">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                            ` : `
                                <button class="btn btn-primary add-to-cart">
                                    <i class="fas fa-plus"></i> Add to Cart
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Update cart UI
        Utils.updateCartUI();
    }

    filterByCategory(category) {
        this.currentCategory = category;
        
        // Update category buttons
        const categoryBtns = document.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        this.renderMenuItems();
    }

    addToCart(itemId) {
        if (!window.authManager.requireStudent()) return;

        const item = this.menuItems.find(i => i.id === itemId);
        if (!item) return;

        Utils.addToCart(item, 1);
        this.renderMenuItems();
        Utils.showToast(`Added ${item.name} to cart`, 'success');
    }

    updateQuantity(itemId, action) {
        const cart = Utils.getCart();
        const cartItem = cart.find(ci => ci.id === itemId);
        
        if (!cartItem) return;

        const newQuantity = action === 'increase' 
            ? cartItem.quantity + 1 
            : Math.max(0, cartItem.quantity - 1);

        Utils.updateCartQuantity(itemId, newQuantity);
        this.renderMenuItems();

        if (newQuantity === 0) {
            const item = this.menuItems.find(i => i.id === itemId);
            Utils.showToast(`Removed ${item?.name} from cart`, 'success');
        }
    }

    toggleCart() {
        const cartSidebar = document.getElementById('cartSidebar');
        if (cartSidebar) {
            cartSidebar.classList.toggle('open');
            if (cartSidebar.classList.contains('open')) {
                this.renderCart();
            }
        }
    }

    closeCart() {
        const cartSidebar = document.getElementById('cartSidebar');
        if (cartSidebar) {
            cartSidebar.classList.remove('open');
        }
    }

    renderCart() {
        const cartItems = document.getElementById('cartItems');
        if (!cartItems) return;

        const cart = Utils.getCart();

        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Your cart is empty</p>
                    <p>Add some delicious items to get started!</p>
                </div>
            `;
            return;
        }

        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-info">
                    <h4>${Utils.sanitizeHtml(item.name)}</h4>
                    <p class="item-price">${Utils.formatCurrency(item.price)} each</p>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn cart-quantity-btn" data-action="decrease">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn cart-quantity-btn" data-action="increase">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn-icon remove-from-cart" title="Remove item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateCartQuantity(itemId, action) {
        const cart = Utils.getCart();
        const cartItem = cart.find(ci => ci.id === itemId);
        
        if (!cartItem) return;

        const newQuantity = action === 'increase' 
            ? cartItem.quantity + 1 
            : Math.max(0, cartItem.quantity - 1);

        Utils.updateCartQuantity(itemId, newQuantity);
        this.renderCart();
    }

    removeFromCart(itemId) {
        Utils.removeFromCart(itemId);
        this.renderCart();
        this.renderMenuItems(); // Update menu item display
        Utils.showToast('Item removed from cart', 'success');
    }

    changeStore() {
        // Clear cart when changing stores
        Utils.clearCart();
        
        // Reset state
        this.selectedStore = null;
        this.menuItems = [];
        this.currentCategory = 'all';

        // Update UI
        const menuSection = document.getElementById('menuSection');
        if (menuSection) {
            menuSection.style.display = 'none';
        }

        const storeSelector = document.querySelector('.store-selector');
        if (storeSelector) {
            storeSelector.style.display = 'block';
        }

        // Reset category filter
        const categoryBtns = document.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'all');
        });

        this.closeCart();
        Utils.showToast('Please select a store', 'info');
    }

    proceedToCheckout() {
        if (!window.authManager.requireStudent()) return;

        const cart = Utils.getCart();
        if (cart.length === 0) {
            Utils.showToast('Your cart is empty', 'warning');
            return;
        }

        if (!this.selectedStore) {
            Utils.showToast('Please select a store first', 'warning');
            return;
        }

        // Close cart
        this.closeCart();

        // Navigate to payment screen
        Utils.showScreen('paymentScreen');
        
        // Load payment screen with order details
        if (window.paymentManager) {
            window.paymentManager.loadOrderSummary(cart, this.selectedStore);
        }
    }

    // Get order history for current student
    async getOrderHistory() {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) return [];

            const ordersResponse = await Utils.getTableData('orders');
            const orders = ordersResponse.data || [];

            return orders.filter(order => order.student_id === currentUser.id)
                        .sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        } catch (error) {
            console.error('Failed to load order history:', error);
            return [];
        }
    }

    // Search menu items
    searchMenuItems(query) {
        if (!query.trim()) {
            this.renderMenuItems();
            return;
        }

        const searchResults = this.menuItems.filter(item => 
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.category.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredItems(searchResults);
    }

    renderFilteredItems(items) {
        const menuGrid = document.getElementById('menuGrid');
        if (!menuGrid) return;

        // Use the same rendering logic as renderMenuItems but with filtered items
        // Implementation would be similar to renderMenuItems but with the filtered array
    }
}

// Initialize student manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.studentManager = new StudentManager();
});