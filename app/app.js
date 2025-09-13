// Main application module for the food ordering application

class PaymentManager {
    constructor() {
        this.currentOrder = null;
        this.selectedStore = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Back to cart button
        const backToCart = document.getElementById('backToCart');
        if (backToCart) {
            backToCart.addEventListener('click', () => this.backToCart());
        }

        // Payment simulation button
        const simulatePayment = document.getElementById('simulatePayment');
        if (simulatePayment) {
            simulatePayment.addEventListener('click', () => this.simulatePayment());
        }

        // Success screen buttons
        const newOrder = document.getElementById('newOrder');
        const viewOrders = document.getElementById('viewOrders');

        if (newOrder) {
            newOrder.addEventListener('click', () => this.startNewOrder());
        }

        if (viewOrders) {
            viewOrders.addEventListener('click', () => this.viewOrderHistory());
        }
    }

    loadOrderSummary(cartItems, store) {
        this.currentOrder = cartItems;
        this.selectedStore = store;

        // Update order items display
        const paymentOrderItems = document.getElementById('paymentOrderItems');
        if (paymentOrderItems) {
            paymentOrderItems.innerHTML = cartItems.map(item => `
                <div class="payment-order-item">
                    <div class="item-info">
                        <span class="item-name">${Utils.sanitizeHtml(item.name)}</span>
                        <span class="item-details">${item.quantity} x ${Utils.formatCurrency(item.price)}</span>
                    </div>
                    <div class="item-total">${Utils.formatCurrency(item.price * item.quantity)}</div>
                </div>
            `).join('');
        }

        // Update total amount
        const total = Utils.getCartTotal();
        const paymentTotal = document.getElementById('paymentTotal');
        const finalAmount = document.getElementById('finalAmount');

        if (paymentTotal) paymentTotal.textContent = total;
        if (finalAmount) finalAmount.textContent = total;
    }

    backToCart() {
        Utils.showScreen('studentDashboard');
        if (window.studentManager) {
            window.studentManager.toggleCart();
        }
    }

    async simulatePayment() {
        try {
            Utils.showLoading();

            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not logged in');
            }

            if (!this.currentOrder || this.currentOrder.length === 0) {
                throw new Error('No items in order');
            }

            if (!this.selectedStore) {
                throw new Error('No store selected');
            }

            // Get next order number
            const ordersResponse = await Utils.getTableData('orders');
            const existingOrders = ordersResponse.data || [];
            const lastOrderNumber = existingOrders.length > 0 
                ? Math.max(...existingOrders.map(o => parseInt(o.order_number) || 0))
                : 0;
            
            const newOrderNumber = Utils.generateOrderNumber(lastOrderNumber);

            // Generate order token
            const orderToken = Utils.generateOrderToken(
                currentUser.name,
                newOrderNumber,
                this.currentOrder
            );

            // Create order object
            const order = {
                id: Utils.generateId(),
                order_number: newOrderNumber,
                student_id: currentUser.id,
                student_name: currentUser.name,
                store_id: this.selectedStore.id,
                items: this.currentOrder.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                total_amount: Utils.getCartTotal(),
                token: orderToken,
                payment_status: 'completed', // Simulate successful payment
                order_status: 'placed',
                order_date: Date.now()
            };

            // Save order to database
            await Utils.createRecord('orders', order);

            // Show success screen with order details
            this.showOrderSuccess(order);

            // Clear cart
            Utils.clearCart();

            Utils.showToast('Payment successful! Order placed.', 'success');

        } catch (error) {
            Utils.showToast(error.message || 'Payment failed. Please try again.', 'error');
            console.error('Payment simulation error:', error);
        } finally {
            Utils.hideLoading();
        }
    }

    showOrderSuccess(order) {
        // Update success screen with order details
        const orderToken = document.getElementById('orderToken');
        const orderNumber = document.getElementById('orderNumber');
        const orderStudentName = document.getElementById('orderStudentName');
        const orderAmount = document.getElementById('orderAmount');
        const orderStore = document.getElementById('orderStore');
        const orderItemsSummary = document.getElementById('orderItemsSummary');

        if (orderToken) orderToken.textContent = order.token;
        if (orderNumber) orderNumber.textContent = order.order_number;
        if (orderStudentName) orderStudentName.textContent = order.student_name;
        if (orderAmount) orderAmount.textContent = order.total_amount;
        if (orderStore) orderStore.textContent = this.selectedStore.name;

        if (orderItemsSummary) {
            orderItemsSummary.innerHTML = `
                <h4>Items Ordered:</h4>
                ${order.items.map(item => `
                    <div class="success-order-item">
                        <span>${Utils.sanitizeHtml(item.name)} x ${item.quantity}</span>
                        <span>${Utils.formatCurrency(item.price * item.quantity)}</span>
                    </div>
                `).join('')}
            `;
        }

        // Show success screen
        Utils.showScreen('successScreen');
    }

    startNewOrder() {
        // Reset order state
        this.currentOrder = null;
        this.selectedStore = null;

        // Navigate back to student dashboard
        Utils.showScreen('studentDashboard');
        
        // Reset store selection
        if (window.studentManager) {
            window.studentManager.changeStore();
        }
    }

    async viewOrderHistory() {
        try {
            const currentUser = window.authManager.getCurrentUser();
            if (!currentUser) return;

            const ordersResponse = await Utils.getTableData('orders');
            const orders = ordersResponse.data || [];
            
            const userOrders = orders.filter(order => order.student_id === currentUser.id)
                                   .sort((a, b) => new Date(b.order_date || b.created_at) - new Date(a.order_date || a.created_at));

            this.showOrderHistoryModal(userOrders);
        } catch (error) {
            Utils.showToast('Failed to load order history', 'error');
        }
    }

    showOrderHistoryModal(orders) {
        // Create and show order history modal (simplified implementation)
        const modalHtml = `
            <div class="modal" id="orderHistoryModal">
                <div class="modal-header">
                    <h3>Order History</h3>
                    <button class="btn-icon" onclick="Utils.hideModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-content">
                    ${orders.length === 0 ? `
                        <div class="no-orders">
                            <i class="fas fa-history"></i>
                            <p>No previous orders found.</p>
                        </div>
                    ` : `
                        <div class="order-history-list">
                            ${orders.slice(0, 10).map(order => `
                                <div class="history-order-item">
                                    <div class="order-summary">
                                        <strong>Order #${order.order_number}</strong>
                                        <span class="order-date">${Utils.formatDate(order.order_date || order.created_at)}</span>
                                    </div>
                                    <div class="order-details">
                                        <span>Total: ${Utils.formatCurrency(order.total_amount)}</span>
                                        <span class="status ${order.order_status}">${order.order_status}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Add modal to overlay and show
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.innerHTML = modalHtml;
            modalOverlay.classList.add('active');
        }
    }
}

// Application initialization and global event handlers
class App {
    constructor() {
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.initializeModules();
    }

    setupGlobalEventListeners() {
        // Handle escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Utils.hideModal();
            }
        });

        // Handle form submissions to prevent default behavior where needed
        document.addEventListener('submit', (e) => {
            // Let specific form handlers manage their own submissions
        });

        // Handle clicks outside modals to close them
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                Utils.hideModal();
            }
        });

        // Handle responsive menu for mobile
        this.setupMobileNavigation();

        // Handle online/offline status
        this.setupOfflineHandling();
    }

    setupMobileNavigation() {
        // Close cart when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (Utils.isMobile()) {
                const cartSidebar = document.getElementById('cartSidebar');
                const cartToggle = document.getElementById('cartToggle');
                
                if (cartSidebar && cartSidebar.classList.contains('open')) {
                    if (!cartSidebar.contains(e.target) && !cartToggle.contains(e.target)) {
                        cartSidebar.classList.remove('open');
                    }
                }
            }
        });
    }

    setupOfflineHandling() {
        // Handle online/offline status
        window.addEventListener('online', () => {
            Utils.showToast('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            Utils.showToast('You are offline. Some features may not work.', 'warning');
        });
    }

    initializeModules() {
        // Initialize payment manager
        window.paymentManager = new PaymentManager();
    }

    // Performance monitoring
    logPerformance() {
        if (window.performance && window.performance.timing) {
            const perfData = window.performance.timing;
            const loadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(`Page load time: ${loadTime}ms`);
        }
    }

    // Error handling
    handleGlobalErrors() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            Utils.showToast('An error occurred. Please refresh the page.', 'error');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            Utils.showToast('A network error occurred. Please try again.', 'error');
        });
    }

    // Service worker registration (for future PWA support)
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Service worker would be implemented for offline support
                console.log('Service Worker support detected');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

// Data initialization helper
class DataInitializer {
    static async initializeDefaultData() {
        try {
            // Check if data already exists
            const [storesResponse, menuResponse] = await Promise.all([
                Utils.getTableData('stores'),
                Utils.getTableData('menu_items')
            ]);

            const stores = storesResponse.data || [];
            const menuItems = menuResponse.data || [];

            // Initialize stores if they don't exist
            if (stores.length === 0) {
                await this.createDefaultStores();
            }

            // Initialize menu items if they don't exist
            if (menuItems.length === 0) {
                await this.createDefaultMenuItems();
            }

            // Initialize store-item relationships
            await this.createStoreItemRelationships();

        } catch (error) {
            console.error('Data initialization error:', error);
        }
    }

    static async createDefaultStores() {
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

        console.log('Default stores created');
    }

    static async createDefaultMenuItems() {
        // This will be implemented in the next task
        console.log('Menu items initialization will be implemented');
    }

    static async createStoreItemRelationships() {
        // This will be implemented in the store availability management task
        console.log('Store item relationships will be initialized');
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main app
    window.app = new App();
    
    // Set up global error handling
    window.app.handleGlobalErrors();
    
    // Initialize default data
    DataInitializer.initializeDefaultData();
    
    // Log performance metrics
    window.addEventListener('load', () => {
        window.app.logPerformance();
    });
    
    console.log('Campus Food Court application initialized');
});

// Export for use in other modules
window.PaymentManager = PaymentManager;
window.App = App;
window.DataInitializer = DataInitializer;