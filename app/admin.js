// Admin interface module for the food ordering application

class AdminManager {
    constructor() {
        this.currentTab = 'orders';
        this.orders = [];
        this.menuItems = [];
        this.stores = [];
        this.storeItems = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Admin tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('admin-tab')) {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            }
        });

        // Refresh orders button
        const refreshOrders = document.getElementById('refreshOrders');
        if (refreshOrders) {
            refreshOrders.addEventListener('click', () => this.loadOrders());
        }

        // Add menu item button
        const addMenuItem = document.getElementById('addMenuItem');
        if (addMenuItem) {
            addMenuItem.addEventListener('click', () => this.showAddItemModal());
        }

        // Modal controls
        const closeModal = document.getElementById('closeModal');
        const cancelModal = document.getElementById('cancelModal');
        
        if (closeModal) {
            closeModal.addEventListener('click', () => Utils.hideModal());
        }
        
        if (cancelModal) {
            cancelModal.addEventListener('click', () => Utils.hideModal());
        }

        // Menu item form submission
        const menuItemForm = document.getElementById('menuItemForm');
        if (menuItemForm) {
            menuItemForm.addEventListener('submit', (e) => this.handleMenuItemForm(e));
        }

        // Modal overlay click to close
        const modalOverlay = document.getElementById('modalOverlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    Utils.hideModal();
                }
            });
        }

        // Edit and delete menu items
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-item')) {
                const itemId = e.target.closest('.menu-item-row').dataset.itemId;
                this.editMenuItem(itemId);
            }
            
            if (e.target.closest('.delete-item')) {
                const itemId = e.target.closest('.menu-item-row').dataset.itemId;
                this.deleteMenuItem(itemId);
            }
        });

        // Store availability toggles
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('store-availability-toggle')) {
                const storeId = e.target.dataset.storeId;
                const itemId = e.target.dataset.itemId;
                const available = e.target.checked;
                this.updateStoreAvailability(storeId, itemId, available);
            }
        });

        // Order status updates
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('order-status-select')) {
                const orderId = e.target.dataset.orderId;
                const newStatus = e.target.value;
                this.updateOrderStatus(orderId, newStatus);
            }
        });
    }

    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        const tabButtons = document.querySelectorAll('.admin-tab');
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update content visibility
        const tabContents = document.querySelectorAll('.admin-content');
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tab}Tab`);
        });

        // Load data for the current tab
        this.loadTabData(tab);
    }

    async loadTabData(tab) {
        switch (tab) {
            case 'orders':
                await this.loadOrders();
                break;
            case 'menu':
                await this.loadMenuItems();
                break;
            case 'stores':
                await this.loadStoreAvailability();
                break;
        }
    }

    async loadData() {
        try {
            Utils.showLoading();
            
            // Load all necessary data
            await Promise.all([
                this.loadOrders(),
                this.loadMenuItems(),
                this.loadStores(),
                this.loadStoreItems()
            ]);

            // Load initial tab data
            await this.loadTabData(this.currentTab);

        } catch (error) {
            Utils.showToast('Failed to load admin data', 'error');
            console.error('Load admin data error:', error);
        } finally {
            Utils.hideLoading();
        }
    }

    async loadOrders() {
        try {
            const ordersResponse = await Utils.getTableData('orders', 1, 100, '', 'order_date');
            this.orders = ordersResponse.data || [];
            
            // Sort by most recent first
            this.orders.sort((a, b) => new Date(b.order_date || b.created_at) - new Date(a.order_date || a.created_at));
            
            this.renderOrders();
        } catch (error) {
            Utils.showToast('Failed to load orders', 'error');
            console.error('Load orders error:', error);
        }
    }

    renderOrders() {
        const ordersGrid = document.getElementById('ordersGrid');
        if (!ordersGrid) return;

        if (this.orders.length === 0) {
            ordersGrid.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No Orders Yet</h3>
                    <p>Orders will appear here when students place them.</p>
                </div>
            `;
            return;
        }

        ordersGrid.innerHTML = this.orders.map(order => {
            const orderDate = Utils.formatDate(order.order_date || order.created_at);
            const items = Array.isArray(order.items) ? order.items : [];
            
            return `
                <div class="order-card">
                    <div class="order-header">
                        <div class="order-token">${Utils.sanitizeHtml(order.token || order.order_number)}</div>
                        <div class="order-status ${order.payment_status === 'completed' ? 'status-completed' : 'status-pending'}">
                            ${Utils.sanitizeHtml(order.payment_status || 'pending')}
                        </div>
                    </div>
                    
                    <div class="order-info">
                        <p><strong>Student:</strong> ${Utils.sanitizeHtml(order.student_name)}</p>
                        <p><strong>Order #:</strong> ${Utils.sanitizeHtml(order.order_number)}</p>
                        <p><strong>Store:</strong> ${Utils.sanitizeHtml(this.getStoreName(order.store_id))}</p>
                        <p><strong>Date:</strong> ${orderDate}</p>
                        <p><strong>Total:</strong> ${Utils.formatCurrency(order.total_amount || 0)}</p>
                    </div>

                    <div class="order-items">
                        <h4>Items Ordered:</h4>
                        ${items.map(item => `
                            <div class="order-item">
                                <span>${Utils.sanitizeHtml(item.name)} x ${item.quantity}</span>
                                <span>${Utils.formatCurrency((item.price || 0) * (item.quantity || 0))}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div class="order-actions">
                        <label for="status-${order.id}">Order Status:</label>
                        <select class="order-status-select" data-order-id="${order.id}" id="status-${order.id}">
                            <option value="placed" ${order.order_status === 'placed' ? 'selected' : ''}>Placed</option>
                            <option value="preparing" ${order.order_status === 'preparing' ? 'selected' : ''}>Preparing</option>
                            <option value="ready" ${order.order_status === 'ready' ? 'selected' : ''}>Ready</option>
                            <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </div>
                </div>
            `;
        }).join('');
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            await Utils.patchRecord('orders', orderId, { order_status: newStatus });
            
            // Update local data
            const order = this.orders.find(o => o.id === orderId);
            if (order) {
                order.order_status = newStatus;
            }

            Utils.showToast(`Order status updated to ${newStatus}`, 'success');
        } catch (error) {
            Utils.showToast('Failed to update order status', 'error');
            console.error('Update order status error:', error);
        }
    }

    async loadMenuItems() {
        try {
            const menuResponse = await Utils.getTableData('menu_items');
            this.menuItems = menuResponse.data || [];
            this.renderMenuItemsTable();
        } catch (error) {
            Utils.showToast('Failed to load menu items', 'error');
            console.error('Load menu items error:', error);
        }
    }

    renderMenuItemsTable() {
        const menuItemsTable = document.getElementById('menuItemsTable');
        if (!menuItemsTable) return;

        if (this.menuItems.length === 0) {
            menuItemsTable.innerHTML = `
                <div class="no-items">
                    <i class="fas fa-utensils"></i>
                    <h3>No Menu Items</h3>
                    <p>Click "Add Item" to create your first menu item.</p>
                </div>
            `;
            return;
        }

        menuItemsTable.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Calories</th>
                        <th>Available</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.menuItems.map(item => `
                        <tr class="menu-item-row" data-item-id="${item.id}">
                            <td>
                                <strong>${Utils.sanitizeHtml(item.name)}</strong>
                                ${item.description ? `<br><small>${Utils.sanitizeHtml(item.description)}</small>` : ''}
                            </td>
                            <td><span class="category-badge">${Utils.sanitizeHtml(item.category)}</span></td>
                            <td>${Utils.formatCurrency(item.price)}</td>
                            <td>${item.calories} kcal</td>
                            <td>
                                <span class="availability-status ${item.available ? 'available' : 'unavailable'}">
                                    ${item.available ? 'Available' : 'Unavailable'}
                                </span>
                            </td>
                            <td class="actions">
                                <button class="btn-icon edit-item" title="Edit item">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon delete-item" title="Delete item">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    showAddItemModal(item = null) {
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('menuItemForm');
        const editItemId = document.getElementById('editItemId');

        if (item) {
            // Edit mode
            modalTitle.textContent = 'Edit Menu Item';
            editItemId.value = item.id;
            
            // Populate form fields
            document.getElementById('itemName').value = item.name || '';
            document.getElementById('itemCategory').value = item.category || '';
            document.getElementById('itemDescription').value = item.description || '';
            document.getElementById('itemPrice').value = item.price || '';
            document.getElementById('itemCalories').value = item.calories || '';
            document.getElementById('itemCarbs').value = item.carbs || '';
            document.getElementById('itemProtein').value = item.protein || '';
            document.getElementById('itemFat').value = item.fat || '';
        } else {
            // Add mode
            modalTitle.textContent = 'Add Menu Item';
            editItemId.value = '';
            Utils.resetForm(form);
        }

        Utils.showModal('addItemModal');
    }

    async handleMenuItemForm(event) {
        event.preventDefault();
        
        try {
            const formData = Utils.getFormData(event.target);
            const editItemId = document.getElementById('editItemId').value;
            
            // Validate form data
            Utils.validateRequired(formData.name, 'Item name');
            Utils.validateRequired(formData.category, 'Category');
            Utils.validateRequired(formData.price, 'Price');

            const itemData = {
                name: formData.name,
                category: formData.category,
                description: formData.description || '',
                price: parseFloat(formData.price),
                calories: parseInt(formData.calories) || 0,
                carbs: parseFloat(formData.carbs) || 0,
                protein: parseFloat(formData.protein) || 0,
                fat: parseFloat(formData.fat) || 0,
                available: true
            };

            if (editItemId) {
                // Update existing item
                await Utils.updateRecord('menu_items', editItemId, {
                    id: editItemId,
                    ...itemData
                });
                
                // Update local data
                const itemIndex = this.menuItems.findIndex(item => item.id === editItemId);
                if (itemIndex !== -1) {
                    this.menuItems[itemIndex] = { id: editItemId, ...itemData };
                }
                
                Utils.showToast('Menu item updated successfully', 'success');
            } else {
                // Create new item
                const newItem = {
                    id: Utils.generateId(),
                    ...itemData
                };
                
                await Utils.createRecord('menu_items', newItem);
                this.menuItems.push(newItem);
                
                Utils.showToast('Menu item added successfully', 'success');
            }

            // Refresh the table and close modal
            this.renderMenuItemsTable();
            Utils.hideModal();
            Utils.resetForm(event.target);

        } catch (error) {
            Utils.showToast(error.message, 'error');
        }
    }

    editMenuItem(itemId) {
        const item = this.menuItems.find(i => i.id === itemId);
        if (item) {
            this.showAddItemModal(item);
        }
    }

    async deleteMenuItem(itemId) {
        if (!confirm('Are you sure you want to delete this menu item?')) {
            return;
        }

        try {
            await Utils.deleteRecord('menu_items', itemId);
            
            // Remove from local data
            this.menuItems = this.menuItems.filter(item => item.id !== itemId);
            
            // Remove from store associations
            this.storeItems = this.storeItems.filter(si => si.menu_item_id !== itemId);
            
            this.renderMenuItemsTable();
            Utils.showToast('Menu item deleted successfully', 'success');
        } catch (error) {
            Utils.showToast('Failed to delete menu item', 'error');
            console.error('Delete menu item error:', error);
        }
    }

    async loadStores() {
        try {
            const storesResponse = await Utils.getTableData('stores');
            this.stores = storesResponse.data || [];
        } catch (error) {
            console.error('Load stores error:', error);
        }
    }

    async loadStoreItems() {
        try {
            const storeItemsResponse = await Utils.getTableData('store_items');
            this.storeItems = storeItemsResponse.data || [];
        } catch (error) {
            console.error('Load store items error:', error);
        }
    }

    async loadStoreAvailability() {
        try {
            await this.loadMenuItems();
            await this.loadStores();
            await this.loadStoreItems();
            this.renderStoreAvailability();
        } catch (error) {
            Utils.showToast('Failed to load store availability', 'error');
            console.error('Load store availability error:', error);
        }
    }

    renderStoreAvailability() {
        const storeAvailability = document.getElementById('storeAvailability');
        if (!storeAvailability) return;

        if (this.stores.length === 0 || this.menuItems.length === 0) {
            storeAvailability.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-exclamation-circle"></i>
                    <h3>No Data Available</h3>
                    <p>Please add stores and menu items first.</p>
                </div>
            `;
            return;
        }

        storeAvailability.innerHTML = this.stores.map(store => `
            <div class="store-availability-section">
                <h3>${Utils.sanitizeHtml(store.name)}</h3>
                <div class="availability-grid">
                    ${this.menuItems.map(item => {
                        const storeItem = this.storeItems.find(si => 
                            si.store_id === store.id && si.menu_item_id === item.id
                        );
                        const isAvailable = storeItem ? storeItem.available : false;
                        
                        return `
                            <div class="availability-item">
                                <label class="availability-label">
                                    <input type="checkbox" 
                                           class="store-availability-toggle"
                                           data-store-id="${store.id}"
                                           data-item-id="${item.id}"
                                           ${isAvailable ? 'checked' : ''}>
                                    <span class="item-name">${Utils.sanitizeHtml(item.name)}</span>
                                    <span class="item-category">${Utils.sanitizeHtml(item.category)}</span>
                                </label>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `).join('');
    }

    async updateStoreAvailability(storeId, itemId, available) {
        try {
            // Find existing store-item relationship
            let storeItem = this.storeItems.find(si => 
                si.store_id === storeId && si.menu_item_id === itemId
            );

            if (storeItem) {
                // Update existing relationship
                await Utils.patchRecord('store_items', storeItem.id, { available });
                storeItem.available = available;
            } else {
                // Create new relationship
                const newStoreItem = {
                    id: Utils.generateId(),
                    store_id: storeId,
                    menu_item_id: itemId,
                    available: available
                };
                
                await Utils.createRecord('store_items', newStoreItem);
                this.storeItems.push(newStoreItem);
            }

            const storeName = this.getStoreName(storeId);
            const itemName = this.getItemName(itemId);
            const status = available ? 'available' : 'unavailable';
            
            Utils.showToast(`${itemName} is now ${status} in ${storeName}`, 'success');

        } catch (error) {
            Utils.showToast('Failed to update item availability', 'error');
            console.error('Update store availability error:', error);
        }
    }

    getStoreName(storeId) {
        const store = this.stores.find(s => s.id === storeId);
        return store ? store.name : 'Unknown Store';
    }

    getItemName(itemId) {
        const item = this.menuItems.find(i => i.id === itemId);
        return item ? item.name : 'Unknown Item';
    }

    // Analytics and reporting methods
    getOrderStats() {
        const stats = {
            totalOrders: this.orders.length,
            totalRevenue: this.orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
            completedOrders: this.orders.filter(o => o.payment_status === 'completed').length,
            pendingOrders: this.orders.filter(o => o.payment_status === 'pending').length
        };

        return stats;
    }

    getPopularItems() {
        const itemCounts = {};
        
        this.orders.forEach(order => {
            if (Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (itemCounts[item.name]) {
                        itemCounts[item.name] += item.quantity;
                    } else {
                        itemCounts[item.name] = item.quantity;
                    }
                });
            }
        });

        return Object.entries(itemCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
    }

    // Export order data (simplified for demo)
    exportOrders() {
        const csvData = [
            ['Order ID', 'Student Name', 'Store', 'Total Amount', 'Payment Status', 'Order Status', 'Date']
        ];

        this.orders.forEach(order => {
            csvData.push([
                order.order_number,
                order.student_name,
                this.getStoreName(order.store_id),
                order.total_amount,
                order.payment_status,
                order.order_status,
                Utils.formatDate(order.order_date || order.created_at)
            ]);
        });

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        window.URL.revokeObjectURL(url);
        Utils.showToast('Orders exported successfully', 'success');
    }
}

// Initialize admin manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminManager = new AdminManager();
});