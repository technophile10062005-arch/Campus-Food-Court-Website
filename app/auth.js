// Authentication module for the food ordering application

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginFormElement');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Signup form
        const signupForm = document.getElementById('signupFormElement');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Form switching
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        
        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchForm('signup');
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchForm('login');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Role-based field visibility
        const signupRole = document.getElementById('signupRole');
        if (signupRole) {
            signupRole.addEventListener('change', () => this.toggleStudentIdField());
        }
    }

    switchForm(formType) {
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (formType === 'signup') {
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
        } else {
            signupForm.classList.remove('active');
            loginForm.classList.add('active');
        }
    }

    toggleStudentIdField() {
        const role = document.getElementById('signupRole').value;
        const studentIdGroup = document.getElementById('studentIdGroup');
        const studentIdInput = document.getElementById('signupStudentId');

        if (role === 'student') {
            studentIdGroup.style.display = 'block';
            studentIdInput.required = true;
        } else {
            studentIdGroup.style.display = 'none';
            studentIdInput.required = false;
            studentIdInput.value = '';
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        try {
            const formData = Utils.getFormData(event.target);
            
            // Validate form data
            Utils.validateRequired(formData.username, 'Username');
            Utils.validateRequired(formData.password, 'Password');
            Utils.validateRequired(formData.role, 'Role');

            Utils.showLoading();

            // Hash password for comparison
            const hashedPassword = await Utils.hashPassword(formData.password);

            // Find user in database
            const usersResponse = await Utils.getTableData('users', 1, 100);
            const users = usersResponse.data || [];

            const user = users.find(u => 
                u.username === formData.username && 
                u.password === hashedPassword &&
                u.role === formData.role
            );

            if (!user) {
                throw new Error('Invalid username, password, or role');
            }

            // Login successful
            this.setCurrentUser(user);
            Utils.showToast('Login successful!', 'success');
            
            // Redirect based on role
            if (user.role === 'admin') {
                Utils.showScreen('adminDashboard');
                if (window.adminManager) {
                    await window.adminManager.loadData();
                }
            } else {
                Utils.showScreen('studentDashboard');
                if (window.studentManager) {
                    await window.studentManager.loadStores();
                }
            }

        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        
        try {
            const formData = Utils.getFormData(event.target);
            
            // Validate form data
            Utils.validateRequired(formData.name, 'Full name');
            Utils.validateRequired(formData.username, 'Username');
            Utils.validateEmail(formData.email);
            Utils.validatePassword(formData.password);
            Utils.validateRequired(formData.role, 'Account type');

            if (formData.role === 'student') {
                Utils.validateRequired(formData.student_id, 'Student ID');
            }

            Utils.showLoading();

            // Check if username already exists
            const usersResponse = await Utils.getTableData('users', 1, 100);
            const users = usersResponse.data || [];

            const existingUser = users.find(u => 
                u.username === formData.username || u.email === formData.email
            );

            if (existingUser) {
                throw new Error('Username or email already exists');
            }

            // Hash password
            const hashedPassword = await Utils.hashPassword(formData.password);

            // Create new user
            const newUser = {
                id: Utils.generateId(),
                name: formData.name,
                username: formData.username,
                email: formData.email,
                password: hashedPassword,
                role: formData.role,
                student_id: formData.role === 'student' ? formData.student_id : ''
            };

            await Utils.createRecord('users', newUser);

            Utils.showToast('Account created successfully! Please login.', 'success');
            this.switchForm('login');
            
            // Reset signup form
            Utils.resetForm(event.target);

        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading();
        }
    }

    setCurrentUser(user) {
        this.currentUser = user;
        Utils.setCurrentUser(user);
        this.updateUserUI();
    }

    getCurrentUser() {
        if (!this.currentUser) {
            this.currentUser = Utils.getCurrentUser();
        }
        return this.currentUser;
    }

    logout() {
        this.currentUser = null;
        Utils.clearCurrentUser();
        Utils.clearCart();
        this.updateUserUI();
        Utils.showScreen('authScreen');
        Utils.showToast('Logged out successfully', 'success');
    }

    updateUserUI() {
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');

        if (this.currentUser) {
            if (userInfo) userInfo.style.display = 'flex';
            if (userName) userName.textContent = this.currentUser.name;
        } else {
            if (userInfo) userInfo.style.display = 'none';
            if (userName) userName.textContent = '';
        }
    }

    checkAuthState() {
        const user = this.getCurrentUser();
        
        if (user) {
            this.updateUserUI();
            
            // Redirect to appropriate dashboard
            if (user.role === 'admin') {
                Utils.showScreen('adminDashboard');
                // Load admin data if admin manager is available
                if (window.adminManager) {
                    setTimeout(() => window.adminManager.loadData(), 100);
                }
            } else {
                Utils.showScreen('studentDashboard');
                // Load student data if student manager is available
                if (window.studentManager) {
                    setTimeout(() => window.studentManager.loadStores(), 100);
                }
            }
        } else {
            Utils.showScreen('authScreen');
        }
    }

    isLoggedIn() {
        return !!this.getCurrentUser();
    }

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }

    isStudent() {
        const user = this.getCurrentUser();
        return user && user.role === 'student';
    }

    requireAuth() {
        if (!this.isLoggedIn()) {
            Utils.showScreen('authScreen');
            Utils.showToast('Please login to continue', 'warning');
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.requireAuth()) return false;
        
        if (!this.isAdmin()) {
            Utils.showToast('Admin access required', 'error');
            return false;
        }
        return true;
    }

    requireStudent() {
        if (!this.requireAuth()) return false;
        
        if (!this.isStudent()) {
            Utils.showToast('Student access required', 'error');
            return false;
        }
        return true;
    }

    // Create default admin user if none exists
    async createDefaultAdmin() {
        try {
            const usersResponse = await Utils.getTableData('users', 1, 100);
            const users = usersResponse.data || [];
            
            const adminExists = users.some(user => user.role === 'admin');
            
            if (!adminExists) {
                const defaultAdmin = {
                    id: Utils.generateId(),
                    name: 'Administrator',
                    username: 'admin',
                    email: 'admin@foodcourt.com',
                    password: await Utils.hashPassword('admin123'),
                    role: 'admin',
                    student_id: ''
                };

                await Utils.createRecord('users', defaultAdmin);
                console.log('Default admin user created: username: admin, password: admin123');
            }
        } catch (error) {
            console.error('Failed to create default admin:', error);
        }
    }

    // Password reset functionality (simplified for demo)
    async resetPassword(username, email) {
        try {
            const usersResponse = await Utils.getTableData('users', 1, 100);
            const users = usersResponse.data || [];
            
            const user = users.find(u => u.username === username && u.email === email);
            
            if (!user) {
                throw new Error('User not found with provided username and email');
            }

            // Generate new temporary password
            const tempPassword = Math.random().toString(36).substr(2, 8);
            const hashedTempPassword = await Utils.hashPassword(tempPassword);

            // Update user password
            await Utils.patchRecord('users', user.id, { 
                password: hashedTempPassword 
            });

            // In a real app, you would send this via email
            Utils.showToast(`Password reset! New password: ${tempPassword}`, 'success');
            
            return tempPassword;
        } catch (error) {
            Utils.showToast(error.message, 'error');
            throw error;
        }
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            const user = this.getCurrentUser();
            if (!user) {
                throw new Error('User not logged in');
            }

            // Verify current password
            const currentHashedPassword = await Utils.hashPassword(currentPassword);
            if (user.password !== currentHashedPassword) {
                throw new Error('Current password is incorrect');
            }

            // Validate new password
            Utils.validatePassword(newPassword);

            // Hash new password
            const newHashedPassword = await Utils.hashPassword(newPassword);

            // Update user password
            await Utils.patchRecord('users', user.id, { 
                password: newHashedPassword 
            });

            // Update current user object
            user.password = newHashedPassword;
            this.setCurrentUser(user);

            Utils.showToast('Password changed successfully', 'success');
        } catch (error) {
            Utils.showToast(error.message, 'error');
            throw error;
        }
    }
}

// Initialize authentication manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    
    // Create default admin user
    window.authManager.createDefaultAdmin();
});