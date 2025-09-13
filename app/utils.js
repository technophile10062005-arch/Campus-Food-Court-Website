// Utility functions for the food ordering application

class Utils {
    // API helper for making requests to the RESTful Table API
    static async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(`tables/${endpoint}`, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle 204 No Content responses (like DELETE)
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Get all records from a table with pagination
    static async getTableData(tableName, page = 1, limit = 100, search = '', sort = '') {
        let query = `${tableName}?page=${page}&limit=${limit}`;
        if (search) query += `&search=${encodeURIComponent(search)}`;
        if (sort) query += `&sort=${sort}`;
        
        return await this.apiRequest(query);
    }

    // Get single record by ID
    static async getRecord(tableName, id) {
        return await this.apiRequest(`${tableName}/${id}`);
    }

    // Create new record
    static async createRecord(tableName, data) {
        return await this.apiRequest(tableName, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Update entire record
    static async updateRecord(tableName, id, data) {
        return await this.apiRequest(`${tableName}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Partially update record
    static async patchRecord(tableName, id, data) {
        return await this.apiRequest(`${tableName}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // Delete record
    static async deleteRecord(tableName, id) {
        return await this.apiRequest(`${tableName}/${id}`, {
            method: 'DELETE'
        });
    }

    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Format currency
    static formatCurrency(amount) {
        return `₹${amount.toFixed(0)}`;
    }

    // Format date
    static formatDate(date) {
        if (!date) return '';
        return new Intl.DateTimeFormat('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(date));
    }

    // Generate order number (0001, 0002, etc.)
    static generateOrderNumber(lastOrderNumber = 0) {
        const nextNumber = lastOrderNumber + 1;
        return nextNumber.toString().padStart(4, '0');
    }

    // Generate order token
    static generateOrderToken(studentName, orderNumber, items) {
        const itemsText = items.map(item => `${item.name}(${item.quantity})`).join(', ');
        return `${studentName}-${orderNumber}-${itemsText}`.substring(0, 50);
    }

    // Validate email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Hash password (simple client-side hashing - in production use proper server-side hashing)
    static async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Local storage helpers
    static setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    static getStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Failed to read from localStorage:', error);
            return defaultValue;
        }
    }

    static removeStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
        }
    }

    // Session management
    static setCurrentUser(user) {
        this.setStorage('currentUser', user);
    }

    static getCurrentUser() {
        return this.getStorage('currentUser');
    }

    static clearCurrentUser() {
        this.removeStorage('currentUser');
    }

    // Cart management
    static getCart() {
        return this.getStorage('cart', []);
    }

    static setCart(cart) {
        this.setStorage('cart', cart);
        this.updateCartUI();
    }

    static addToCart(item, quantity = 1) {
        const cart = this.getCart();
        const existingItem = cart.find(cartItem => cartItem.id === item.id);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({ ...item, quantity });
        }

        this.setCart(cart);
    }

    static removeFromCart(itemId) {
        const cart = this.getCart();
        const updatedCart = cart.filter(item => item.id !== itemId);
        this.setCart(updatedCart);
    }

    static updateCartQuantity(itemId, quantity) {
        const cart = this.getCart();
        const item = cart.find(cartItem => cartItem.id === itemId);

        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(itemId);
            } else {
                item.quantity = quantity;
                this.setCart(cart);
            }
        }
    }

    static clearCart() {
        this.setCart([]);
    }

    static getCartTotal() {
        const cart = this.getCart();
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    static getCartItemCount() {
        const cart = this.getCart();
        return cart.reduce((count, item) => count + item.quantity, 0);
    }

    // Update cart UI
    static updateCartUI() {
        const cartCount = this.getCartItemCount();
        const cartCountElement = document.getElementById('cartCount');
        const cartToggle = document.getElementById('cartToggle');
        
        if (cartCountElement) {
            cartCountElement.textContent = cartCount;
        }
        
        if (cartToggle) {
            cartToggle.style.display = cartCount > 0 ? 'flex' : 'none';
        }

        // Update cart total
        const cartTotalElement = document.getElementById('cartTotal');
        if (cartTotalElement) {
            cartTotalElement.textContent = this.getCartTotal();
        }

        // Update checkout button state
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.disabled = cartCount === 0;
        }
    }

    // Show toast notification
    static showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span>${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    // Show loading spinner
    static showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
    }

    static hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    // Screen navigation
    static showScreen(screenId) {
        // Hide all screens
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.remove('active'));

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    // Modal management
    static showModal(modalId) {
        const overlay = document.getElementById('modalOverlay');
        const modal = document.getElementById(modalId);
        
        if (overlay && modal) {
            overlay.classList.add('active');
        }
    }

    static hideModal() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    // Form helpers
    static getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    }

    static resetForm(formElement) {
        formElement.reset();
        // Clear any validation states
        const inputs = formElement.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.classList.remove('error', 'success');
        });
    }

    // Validation helpers
    static validateRequired(value, fieldName) {
        if (!value || value.toString().trim() === '') {
            throw new Error(`${fieldName} is required`);
        }
        return true;
    }

    static validateEmail(email) {
        if (!this.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }
        return true;
    }

    static validatePassword(password) {
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }
        return true;
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Sanitize HTML to prevent XSS
    static sanitizeHtml(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Device detection
    static isMobile() {
        return window.innerWidth <= 768;
    }

    // Get nutrition color based on value ranges
    static getNutritionColor(type, value) {
        const ranges = {
            calories: { low: 150, high: 400 },
            carbs: { low: 20, high: 50 },
            protein: { low: 5, high: 15 },
            fat: { low: 5, high: 15 }
        };

        const range = ranges[type];
        if (!range) return '#666';

        if (value <= range.low) return '#48bb78'; // Green - low
        if (value >= range.high) return '#e53e3e'; // Red - high
        return '#ed8936'; // Orange - medium
    }

    // Format nutrition info
    static formatNutrition(calories, carbs, protein, fat) {
        return {
            calories: { label: 'Calories', value: `${calories} kcal`, color: this.getNutritionColor('calories', calories) },
            carbs: { label: 'Carbs', value: `${carbs}g`, color: this.getNutritionColor('carbs', carbs) },
            protein: { label: 'Protein', value: `${protein}g`, color: this.getNutritionColor('protein', protein) },
            fat: { label: 'Fat', value: `${fat}g`, color: this.getNutritionColor('fat', fat) }
        };
    }
}

// Initialize utils when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Update cart UI on page load
    Utils.updateCartUI();
    
    // Hide loading spinner after a short delay
    setTimeout(() => {
        Utils.hideLoading();
    }, 500);
});

// Export for use in other modules
window.Utils = Utils;