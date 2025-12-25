// ===== STARCITY SHOP MANAGEMENT SYSTEM =====
const TEST_MODE = false; // Set to false to activate login menu later

class StarcityApp {
    constructor() {
        this.currentUser = null;
        this.currentScreen = 'login';
        this.currency = 'Rs.';

        this.initSettings();
        this.initData();

        // Track active views to optimize rendering
        this.activeManagerView = 'dashboard';
        this.activeTechView = 'dashboard';

        // Finalize app assignment early for global access
        window.app = this;

        this.initEventListeners();
        this.loadSampleData();

        // Apply settings to UI
        this.applySettings();

        // Bypass login if in test mode
        if (TEST_MODE) {
            setTimeout(() => this.bypassLogin(), 500);
        }
    }

    // ===== TEST MODE BYPASS =====
    bypassLogin() {
        const adminUser = this.users.find(u => u.username === 'manager');
        if (adminUser) {
            this.currentUser = adminUser;
            this.showScreen('manager');
            this.render();
            this.showToast('TEST MODE: Automatically logged in as Manager');
        } else {
            // Fallback if manager missing in test mode? 
            // Ideally we shouldn't be here if initData works, but let's be safe
            console.warn("Test mode failed: Manager user not found");
        }
    }

    // ===== SETTINGS INITIALIZATION =====
    initSettings() {
        const defaultSettings = {
            shopName: 'Starcity',
            shopPhone: '077 123 4567',
            currency: 'Rs.',
            lowStockLevel: 5,
            defaultCommission: 10
        };

        try {
            this.settings = JSON.parse(localStorage.getItem('starcity_settings')) || defaultSettings;
        } catch (e) {
            this.settings = defaultSettings;
        }

        this.currency = this.settings.currency || 'Rs.';
        this.shopEmail = this.settings.shopEmail || '';
        this.shopAddress = this.settings.shopAddress || '';
    }

    applySettings() {
        this.currency = this.settings.currency || 'Rs.';
        // Update all shop names in UI
        document.querySelectorAll('.shop-name, .app-title').forEach(el => {
            el.textContent = this.settings.shopName;
        });

        // Update all logos
        if (this.settings.logo) {
            document.querySelectorAll('.shop-logo, .logo').forEach(el => {
                el.innerHTML = `<img src="${this.settings.logo}" alt="Logo">`;
            });
            const preview = document.getElementById('shopLogoPreview');
            if (preview) {
                preview.innerHTML = `<img src="${this.settings.logo}" alt="Preview">`;
            }
        }

        // Update currency display on forms
        document.querySelectorAll('label').forEach(label => {
            if (label.textContent.includes('(Rs.)')) {
                label.textContent = label.textContent.replace('(Rs.)', `(${this.settings.currency})`);
            }
        });
    }

    // ===== DATA INITIALIZATION =====
    initData() {
        const load = (key, fallback = []) => {
            try {
                const data = localStorage.getItem(key);
                return data ? JSON.parse(data) : fallback;
            } catch (e) {
                console.warn(`Error loading ${key}:`, e);
                return fallback;
            }
        };

        this.users = load('starcity_users');
        this.stock = load('starcity_stock');
        this.sales = load('starcity_sales');
        this.repairJobs = load('starcity_repairs');
        this.vendors = load('starcity_vendors');
        this.purchases = load('starcity_purchases');
        this.customerCredits = load('starcity_customer_credits');
        this.vendorCredits = load('starcity_vendor_credits');
        this.vendorDebt = load('starcity_vendor_debt');
        this.expenses = load('starcity_expenses');
        this.warrantyJobs = load('starcity_warranty');
        this.dailyCash = load('starcity_dailyCash');

        // Ensure all are arrays (fixes possible data corruption)
        if (!Array.isArray(this.users)) this.users = [];
        if (!Array.isArray(this.stock)) this.stock = [];
        if (!Array.isArray(this.sales)) this.sales = [];
        if (!Array.isArray(this.repairJobs)) this.repairJobs = [];
        if (!Array.isArray(this.vendors)) this.vendors = [];
        if (!Array.isArray(this.purchases)) this.purchases = [];
        if (!Array.isArray(this.warrantyJobs)) this.warrantyJobs = [];

        // Create default users if none exist OR if manager is missing
        const managerExists = this.users.some(u => u.username === 'manager');

        if (this.users.length === 0 || !managerExists) {
            if (!managerExists) {
                this.users.push({ userid: 1, username: 'manager', password: 'admin123', fullname: 'Shop Manager', role: 'manager', active: true });
            }

            // If completely empty, add others too
            if (this.users.length === 1) {
                this.users.push(
                    { userid: 2, username: 'tech1', password: 'tech123', fullname: 'Kamal Silva', role: 'technician', active: true },
                    { userid: 3, username: 'tech2', password: 'tech123', fullname: 'Nimal Perera', role: 'technician', active: true }
                );
            }

            this.saveData('users');
            // Force save other empty arrays to clean up potential bad state
            this.saveData('stock');
            this.saveData('sales');
            this.saveData('repairs');
            this.saveData('vendors');
            this.saveData('purchases');
        }
    }

    // Helper to reload data from localStorage
    loadData(key, fallback = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            console.warn(`Error loading ${key}:`, e);
            return fallback;
        }
    }

    // Helper to save data to localStorage (triggers cloud sync via storageAdapter)
    saveData(dataType) {
        const dataMap = {
            'users': 'starcity_users',
            'stock': 'starcity_stock',
            'sales': 'starcity_sales',
            'repairs': 'starcity_repairs',
            'warranty': 'starcity_warranty',
            'vendors': 'starcity_vendors',
            'purchases': 'starcity_purchases',
            'expenses': 'starcity_expenses',
            'customer_credits': 'starcity_customer_credits',
            'vendor_credits': 'starcity_vendor_credits'
        };

        const key = dataMap[dataType];
        if (!key) {
            console.warn('Unknown data type:', dataType);
            return;
        }

        const dataArrayMap = {
            'starcity_users': this.users,
            'starcity_stock': this.stock,
            'starcity_sales': this.sales,
            'starcity_repairs': this.repairJobs,
            'starcity_warranty': this.warrantyJobs,
            'starcity_vendors': this.vendors,
            'starcity_purchases': this.purchases,
            'starcity_expenses': this.expenses,
            'starcity_customer_credits': this.customerCredits,
            'starcity_vendor_credits': this.vendorCredits
        };

        const data = dataArrayMap[key];
        if (data) {
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`✓ Saved ${dataType} (${data.length} items) - syncing to cloud...`);
        }
    }

    // ===== SAMPLE DATA =====
    loadSampleData() {
        if (this.stock.length === 0) {
            this.stock = [
                { id: 1, name: 'iPhone 15 Pro', category: 'Phones', brand: 'Apple', quantity: 8, minQuantity: 3, cost: 390000, price: 450000 },
                { id: 2, name: 'Samsung Galaxy S24', category: 'Phones', brand: 'Samsung', quantity: 12, minQuantity: 5, cost: 320000, price: 380000 },
                { id: 3, name: 'Redmi Note 13 Pro', category: 'Phones', brand: 'Xiaomi', quantity: 15, minQuantity: 5, cost: 95000, price: 115000 },
                { id: 4, name: 'AirPods Pro 2', category: 'Accessories', brand: 'Apple', quantity: 20, minQuantity: 10, cost: 85000, price: 98000 },
                { id: 5, name: 'Phone Case Premium', category: 'Accessories', brand: 'Generic', quantity: 45, minQuantity: 20, cost: 1500, price: 2500 },
                { id: 6, name: 'Screen Protector', category: 'Accessories', brand: 'Generic', quantity: 60, minQuantity: 30, cost: 300, price: 800 },
                { id: 7, name: 'iPhone Screen', category: 'Parts', brand: 'Apple', quantity: 5, minQuantity: 10, cost: 25000, price: 35000 },
                { id: 8, name: 'Battery Pack', category: 'Parts', brand: 'Generic', quantity: 15, minQuantity: 10, cost: 3500, price: 6000 }
            ];
            this.saveData('stock');
        }

        if (this.sales.length === 0) {
            const now = new Date();
            for (let i = 0; i < 7; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const count = Math.floor(Math.random() * 3) + 1;
                for (let j = 0; j < count; j++) {
                    const product = this.stock[Math.floor(Math.random() * 3)];
                    this.sales.push({
                        id: Date.now() + i * 1000 + j,
                        date: date.toISOString(),
                        product: product.name,
                        quantity: 1,
                        price: product.price,
                        total: product.price,
                        customer: 'Customer ' + (i + j),
                        phone: '077' + Math.floor(Math.random() * 10000000),
                        payment: ['Cash', 'Card', 'Digital'][Math.floor(Math.random() * 3)],
                        employee: 'Shop Staff'
                    });
                }
            }
            this.saveData('sales');
        }

        if (this.repairJobs.length === 0) {
            const now = new Date();
            const techs = this.users.filter(u => u.role === 'technician');
            for (let i = 0; i < 5; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const tech = techs[i % techs.length];
                const statuses = ['Pending', 'Completed', 'Completed', 'Approved'];
                const status = statuses[Math.floor(Math.random() * statuses.length)];

                this.repairJobs.push({
                    id: 1000 + i,
                    dateSubmitted: date.toISOString(),
                    technician: tech.name,
                    customer: 'Customer ' + (i + 1),
                    phone: '077' + Math.floor(Math.random() * 10000000),
                    brand: ['Apple', 'Samsung', 'Xiaomi'][i % 3],
                    model: ['iPhone 14', 'Galaxy S23', 'Redmi Note 12'][i % 3],
                    problem: ['Screen broken', 'Battery issue', 'Water damage', 'Speaker not working'][i % 4],
                    cost: [15000, 8000, 25000, 5000][i % 4],
                    parts: ['Screen', 'Battery', 'Motherboard', 'Speaker'][i % 4],
                    status: status,
                    dateCompleted: status !== 'Pending' ? date.toISOString() : null,
                    approvedBy: status === 'Approved' ? 'Manager' : null,
                    approvalDate: status === 'Approved' ? date.toISOString() : null,
                    commission: status === 'Approved' ? [1500, 800, 2500, 500][i % 4] : 0
                });
            }
            this.saveData('repairs');
        }

        if (this.vendors.length === 0) {
            this.vendors = [
                { id: 1, name: 'Singer Lanka PLC', contact: 'Mr. Fernando', phone: '0112345678', creditLimit: 500000, balance: 125000 },
                { id: 2, name: 'Abans Electronics', contact: 'Ms. Silva', phone: '0112876543', creditLimit: 300000, balance: 0 },
                { id: 3, name: 'Direct Import Co', contact: 'Mr. Perera', phone: '0777654321', creditLimit: 1000000, balance: 350000 }
            ];
            this.saveData('vendors');
        }

        if (this.warrantyJobs.length === 0) {
            const now = new Date();
            this.warrantyJobs = [
                {
                    id: 'war_1001',
                    customer: 'Saman Kumara',
                    phone: '0771122334',
                    brand: 'Samsung',
                    model: 'Galaxy A54',
                    problem: 'Display flickering',
                    repName: 'Kamal',
                    status: 'Delivered',
                    collectedDate: new Date(now.getTime() - 10 * 86400000).toISOString(),
                    deliveryDate: new Date(now.getTime() - 2 * 86400000).toISOString(),
                    history: []
                },
                {
                    id: 'war_1002',
                    customer: 'Nimali Perera',
                    phone: '0712233445',
                    brand: 'Xiaomi',
                    model: 'Redmi Note 12',
                    problem: 'Charging port issue',
                    repName: 'Nimal',
                    status: 'Sent to SC',
                    collectedDate: new Date(now.getTime() - 5 * 86400000).toISOString(),
                    history: []
                },
                {
                    id: 'war_1003',
                    customer: 'John Doe',
                    phone: '0763344556',
                    brand: 'Apple',
                    model: 'iPhone 13',
                    problem: 'FaceID not working',
                    repName: 'Kamal',
                    status: 'Collected',
                    collectedDate: new Date(now.getTime() - 1 * 86400000).toISOString(),
                    history: []
                }
            ];
            this.saveData('warranty');
        }
    }

    // ===== EVENT LISTENERS =====
    initEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Manager logout
        document.getElementById('managerLogoutBtn')?.addEventListener('click', () => this.logout());
        document.getElementById('techLogoutBtn')?.addEventListener('click', () => this.logout());

        // Notification buttons
        document.getElementById('managerNotificationBtn')?.addEventListener('click', () => {
            this.switchManagerView('approvals');
        });
        document.getElementById('techNotificationBtn')?.addEventListener('click', () => {
            this.switchTechView('earnings');
        });

        // Manager sales form
        document.getElementById('mgrSalesForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleManagerSale();
        });

        document.getElementById('mgrSaleQty')?.addEventListener('input', () => this.updateManagerSaleTotal());
        document.getElementById('mgrSalePrice')?.addEventListener('input', () => this.updateManagerSaleTotal());

        // Manager product selection
        document.getElementById('mgrSaleProduct')?.addEventListener('change', (e) => {
            const product = this.stock.find(p => p.name === e.target.value);
            if (product) {
                document.getElementById('mgrSalePrice').value = product.price;
                this.updateManagerSaleTotal();
            }
        });

        // Manager add product
        document.getElementById('mgrAddProductBtn')?.addEventListener('click', () => {
            this.showAddProductModal();
        });

        document.getElementById('addProductForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddProduct();
        });

        // Image upload preview
        document.getElementById('productImageInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('imagePreview').src = e.target.result;
                    document.getElementById('imagePreview').style.display = 'block';
                    document.getElementById('imagePreviewText').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });

        // Manager reports
        const now = new Date();
        const monthInput = document.getElementById('mgrReportMonth');
        if (monthInput) {
            monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        document.getElementById('mgrGenerateReport')?.addEventListener('click', () => {
            this.generateManagerReport();
        });

        // Toggle Stock Value Report details
        document.getElementById('btnShowStockReport')?.addEventListener('click', (e) => {
            const container = document.getElementById('mgrStockReportContainer');
            if (container) {
                const isHidden = container.style.display === 'none';
                container.style.display = isHidden ? 'block' : 'none';
                e.target.textContent = isHidden ? 'Hide Details' : 'Show Details';
                if (isHidden) {
                    this.renderStockValueReport();
                }
            }
        });

        // Settings form
        document.getElementById('settingsForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveSettings();
        });

        // Data tools removed

        // Backup & Restore
        document.getElementById('exportDataBtn')?.addEventListener('click', () => this.handleExportData());

        document.getElementById('restoreDataInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    try {
                        const data = JSON.parse(re.target.result);
                        this.handleImportData(data);
                    } catch (err) {
                        this.showToast('Error: Invalid backup file');
                    }
                };
                reader.readAsText(file);
            }
        });

        // Logo upload
        document.getElementById('shopLogoInput')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    this.settings.logo = re.target.result;
                    this.saveSettings();
                    this.applySettings();
                };
                reader.readAsDataURL(file);
            }
        });

        // User management form
        document.getElementById('userForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserSubmit();
        });

        // Technician new job form
        document.getElementById('techNewJobForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewRepairJob();
        });

        document.getElementById('mgrExpenseForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleExpenseSubmit();
        });

        document.getElementById('manualCreditForm')?.addEventListener('submit', (e) => this.handleManualCreditSubmit(e));

        // Credit Management forms
        document.getElementById('addVendorForm')?.addEventListener('submit', (e) => this.handleVendorSubmit(e));
        document.getElementById('vendorPurchaseForm')?.addEventListener('submit', (e) => this.handleVendorPurchase(e));
        document.getElementById('customerPaymentForm')?.addEventListener('submit', (e) => this.handleCustomerPayment(e));
        document.getElementById('vendorPaymentForm')?.addEventListener('submit', (e) => this.handleVendorPayment(e));

        // Stock Search
        document.getElementById('mgrStockSearch')?.addEventListener('input', (e) => {
            this.renderManagerStock(e.target.value);
        });

        // Delegated Navigation Listeners
        document.querySelectorAll('.bottom-nav').forEach(nav => {
            nav.addEventListener('click', (e) => {
                const navItem = e.target.closest('.nav-item');
                if (!navItem) return;

                const view = navItem.dataset.view;
                if (this.currentScreen === 'manager') {
                    this.switchManagerView(view);
                } else if (this.currentScreen === 'technician') {
                    this.switchTechView(view);
                }
            });
        });

        // Listen for cloud data loaded event to refresh user data
        window.addEventListener('cloudDataLoaded', () => {
            console.log('Cloud data loaded - refreshing app data');
            // Reload all data from localStorage (which now has fresh cloud data)
            this.users = this.loadData('starcity_users');
            this.stock = this.loadData('starcity_stock');
            this.sales = this.loadData('starcity_sales');
            this.repairJobs = this.loadData('starcity_repairs');
            this.vendors = this.loadData('starcity_vendors');
            this.purchases = this.loadData('starcity_purchases');
            this.expenses = this.loadData('starcity_expenses');
            this.customerCredits = this.loadData('starcity_customer_credits');
            this.vendorCredits = this.loadData('starcity_vendor_credits');
            this.warrantyJobs = this.loadData('starcity_warranty');
            console.log(`✓ App data refreshed - ${this.users.length} users loaded`);
        });
    }

    // ===== AUTHENTICATION =====
    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const user = this.users.find(u => u.username === username && u.password === password && u.active);

        if (user) {
            this.currentUser = user;
            this.showScreen(user.role === 'manager' ? 'manager' : 'technician');
            this.render();
            this.showToast(`Welcome back, ${user.fullname}!`);
        } else {
            this.showToast('Invalid username or password');
        }
    }

    logout() {
        this.currentUser = null;
        this.showScreen('login');
        document.getElementById('loginForm').reset();
        this.showToast('Logged out successfully');
    }

    // ===== SCREEN MANAGEMENT =====
    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        if (screenName === 'login') {
            document.getElementById('loginScreen').classList.add('active');
        } else if (screenName === 'manager') {
            document.getElementById('managerScreen').classList.add('active');
            document.getElementById('managerName').textContent = this.currentUser.name;
        } else if (screenName === 'technician') {
            document.getElementById('technicianScreen').classList.add('active');
            document.getElementById('techName').textContent = this.currentUser.name;
        }
        this.currentScreen = screenName;
    }

    // ===== MANAGER VIEW SWITCHING =====
    switchManagerView(viewName) {
        if (!viewName) return;
        const name = viewName.toLowerCase();
        if (this.activeManagerView === name && document.querySelector('#managerContent .view.active')) {
            console.log('Already on view:', name);
            return;
        }

        console.log('Switching to manager view:', name);

        const viewMapping = {
            'dashboard': 'managerDashboardView',
            'approvals': 'managerApprovalsView',
            'stock': 'managerStockView',
            'sales': 'managerSalesView',
            'settings': 'managerSettingsView',
            'warranty': 'managerWarrantyView',
            'reports': 'managerReportsView',
            'users': 'managerUsersView',
            'credits': 'managerCreditsView'
        };

        const viewId = viewMapping[name] || `manager${viewName.charAt(0).toUpperCase() + viewName.slice(1)}View`;
        const targetView = document.getElementById(viewId);

        if (!targetView) {
            console.error(`View not found: ${viewId}`);
            return;
        }

        const views = document.querySelectorAll('#managerContent .view');
        views.forEach(v => v.classList.remove('active'));
        targetView.classList.add('active');

        this.activeManagerView = name;

        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === name);
        });

        if (name === 'reports') {
            this.generateManagerReport();
        }

        if (name === 'warranty') {
            this.populateBrandDropdown();
            this.populateModelDropdown();
            this.populateProblemDropdown();
        }

        if (name === 'users') {
            this.renderUsers();
        }

        if (name === 'credits') {
            this.renderManagerCredits();
            this.switchCreditTab('customer'); // Set initial total
        }

        if (name === 'sales') {
            this.switchFinanceTab('stock');
        }

        if (name === 'stock') {
            this.filterStockByCategory('all');
        }
        this.render();
    }

    // ===== TECHNICIAN VIEW SWITCHING =====
    switchTechView(viewName) {
        if (!viewName) return;
        const name = viewName.toLowerCase();
        if (this.activeTechView === name && document.querySelector('#techContent .view.active')) {
            return;
        }

        // Normalize view name for ID lookup
        const normalizedViewName = name === 'newjob' ? 'NewJob' : name.charAt(0).toUpperCase() + name.slice(1);
        const viewId = `tech${normalizedViewName}View`;
        const targetView = document.getElementById(viewId);

        if (!targetView) {
            console.error(`View not found: ${viewId}`);
            return;
        }

        const views = document.querySelectorAll('#techContent .view');
        views.forEach(v => v.classList.remove('active'));
        targetView.classList.add('active');

        this.activeTechView = name;

        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === name);
        });

        this.render();
    }

    // ===== RENDERING (Optimized) =====
    render() {
        if (this.currentScreen === 'login') return;

        const renderTask = (name, fn) => {
            try {
                fn();
            } catch (e) {
                console.error(`Render error in ${name}:`, e);
            }
        };

        if (this.currentScreen === 'manager') {
            // Logic only for the active view
            const view = this.activeManagerView;
            if (view === 'dashboard') renderTask('Dashboard', () => this.renderManagerDashboard());
            if (view === 'approvals') renderTask('Approvals', () => this.renderManagerApprovals());
            if (view === 'stock') renderTask('Stock', () => this.renderManagerStock());
            if (view === 'sales') renderTask('Sales', () => this.renderManagerSales());
            if (view === 'settings') renderTask('Settings', () => this.renderManagerSettings());
            if (view === 'warranty') renderTask('Warranty', () => this.renderManagerWarranty());
            if (view === 'users') renderTask('Users', () => this.renderManagerUsers());
            if (view === 'credits') renderTask('Credits', () => this.renderManagerCredits());
            if (view === 'reports') renderTask('Reports', () => this.generateManagerReport());

            // Background tasks
            renderTask('ProductList', () => this.populateProductList());
        } else if (this.currentScreen === 'technician') {
            const view = this.activeTechView;
            if (view === 'dashboard') renderTask('TechDashboard', () => this.renderTechDashboard());
            if (view === 'jobs') renderTask('TechJobs', () => this.renderTechJobs());
            if (view === 'earnings') renderTask('TechEarnings', () => this.renderTechEarnings());
        }
    }

    // ===== MANAGER DASHBOARD =====
    renderManagerDashboard() {
        const todaySales = this.getSalesToday();
        const monthlySales = this.getSalesThisMonth();
        const monthlyRepairs = this.getRepairRevenueThisMonth();
        const pendingApprovals = this.getPendingApprovals().length;
        const vendorDues = this.getVendorDues();
        const customerDues = this.getCustomerDues();

        document.getElementById('mgrTodaySales').textContent = this.formatCurrency(todaySales);
        document.getElementById('mgrMonthlyRevenue').textContent = this.formatCurrency(monthlySales + monthlyRepairs);
        document.getElementById('mgrPendingApprovals').textContent = pendingApprovals;
        document.getElementById('mgrVendorDues').textContent = this.formatCurrency(vendorDues);
        if (document.getElementById('mgrCustomerDues')) {
            document.getElementById('mgrCustomerDues').textContent = this.formatCurrency(customerDues);
        }

        // Update badges
        document.getElementById('approvalsBadge').textContent = pendingApprovals;
        document.getElementById('approvalsNavBadge').textContent = pendingApprovals;
        document.getElementById('managerNotificationBadge').textContent = pendingApprovals;

        // Recent repairs
        const recentRepairs = [...this.repairJobs]
            .sort((a, b) => new Date(b.dateSubmitted) - new Date(a.dateSubmitted))
            .slice(0, 5);

        const repairsHtml = recentRepairs.length === 0 ?
            '<div class="empty-state"><div class="empty-state-icon">🔧</div><p>No repair jobs yet</p></div>' :
            recentRepairs.map(job => this.renderJobCard(job)).join('');

        document.getElementById('mgrRecentRepairs').innerHTML = repairsHtml;

        // Recent sales
        const recentSales = [...this.sales]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

        const salesHtml = recentSales.length === 0 ?
            '<div class="empty-state"><p>No sales yet</p></div>' :
            recentSales.map(sale => `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${sale.product}</span>
                        <strong>${this.formatCurrency(sale.total)}</strong>
                    </div>
                    <div class="list-item-meta">
                        <span>${this.formatDate(new Date(sale.date))} • ${sale.customer}</span>
                    </div>
                </div>
            `).join('');

        const salesDash = document.getElementById('mgrRecentSalesDash');
        if (salesDash) salesDash.innerHTML = salesHtml;
    }

    // ===== MANAGER APPROVALS =====
    renderManagerApprovals() {
        try {
            const pending = this.getPendingApprovals() || [];

            const html = pending.length === 0 ?
                '<div class="empty-state"><div class="empty-state-icon">✅</div><p>No pending approvals</p></div>' :
                pending.map(job => `
                <div class="approval-card">
                    <div class="approval-header">
                        <div class="approval-info">
                            <h4>Job #${job.id}</h4>
                            <p style="color: var(--text-muted); font-size: 0.9rem;">
                                ${job.customer} - ${job.brand} ${job.model}
                            </p>
                            <p style="margin-top: 0.5rem;">
                                <strong>Problem:</strong> ${job.problem}<br>
                                <strong>Technician:</strong> ${job.technician}<br>
                                <strong>Repair Cost:</strong> ${this.formatCurrency(job.cost)}
                            </p>
                        </div>
                        <span class="badge badge-completed">${job.status}</span>
                    </div>
                    <div class="commission-input">
                        <label>Commission (Rs.):</label>
                        <input type="number" id="commission_${job.id}" value="${Math.round(job.cost * 0.1)}" step="1">
                    </div>
                    <div class="approval-actions">
                        <button class="btn btn-success" onclick="app.approveJob(${job.id})">
                            ✓ Approve
                        </button>
                        <button class="btn btn-danger" onclick="app.rejectJob(${job.id})">
                            ✗ Reject
                        </button>
                    </div>
                </div>
            `).join('');

            const container = document.getElementById('approvalsList');
            if (container) container.innerHTML = html;
        } catch (e) {
            console.error('Error rendering approvals:', e);
        }
    }

    approveJob(jobId) {
        const job = this.repairJobs.find(j => j.id === jobId);
        if (!job) return;

        const commissionInput = document.getElementById(`commission_${jobId}`);
        const commission = parseFloat(commissionInput.value) || 0;

        job.status = 'Approved';
        job.approvedBy = this.currentUser.name;
        job.approvalDate = new Date().toISOString();
        job.commission = commission;

        this.saveData('repairs');
        this.showToast(`✅ Job #${jobId} approved!\nCommission: ${this.formatCurrency(commission)}`, 'success', true);
        this.render();
    }

    rejectJob(jobId) {
        const job = this.repairJobs.find(j => j.id === jobId);
        if (!job) return;

        job.status = 'Pending';
        job.approvedBy = null;
        job.approvalDate = null;
        job.commission = 0;

        this.saveData('repairs');
        this.showToast(`⚠️ Job #${jobId} rejected - sent back to technician`, 'warning', true);
        this.render();
    }

    // ===== APPROVALS TAB SWITCHING =====
    switchApprovalsTab(tab) {
        // Update tab button states
        const btnApprovalsTab = document.getElementById('btnApprovalsTab');
        const btnCommissionsTab = document.getElementById('btnCommissionsTab');
        const pendingSection = document.getElementById('pendingApprovalsSection');
        const commissionsSection = document.getElementById('commissionsSection');

        if (tab === 'pending') {
            btnApprovalsTab.classList.add('active');
            btnCommissionsTab.classList.remove('active');
            pendingSection.style.display = 'block';
            commissionsSection.style.display = 'none';
        } else {
            btnApprovalsTab.classList.remove('active');
            btnCommissionsTab.classList.add('active');
            pendingSection.style.display = 'none';
            commissionsSection.style.display = 'block';
            this.renderTechnicianCommissions();
        }
    }

    // ===== TECHNICIAN COMMISSIONS =====
    renderTechnicianCommissions() {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Get approved jobs only
        const approvedJobs = this.repairJobs.filter(j => j.status === 'Approved' && j.commission > 0);

        // Calculate this month total
        const thisMonthTotal = approvedJobs
            .filter(j => new Date(j.approvalDate) >= thisMonthStart)
            .reduce((sum, j) => sum + (j.commission || 0), 0);

        // Calculate last month total
        const lastMonthTotal = approvedJobs
            .filter(j => {
                const date = new Date(j.approvalDate);
                return date >= lastMonthStart && date <= lastMonthEnd;
            })
            .reduce((sum, j) => sum + (j.commission || 0), 0);

        // Update summary stats
        document.getElementById('commissionsThisMonth').textContent = this.formatCurrency(thisMonthTotal);
        document.getElementById('commissionsLastMonth').textContent = this.formatCurrency(lastMonthTotal);

        // Get all technicians
        const technicians = this.users.filter(u => u.role === 'technician');

        // Calculate commissions per technician
        const techCommissions = technicians.map(tech => {
            const techJobs = approvedJobs.filter(j => j.technician === tech.name);

            const thisMonth = techJobs
                .filter(j => new Date(j.approvalDate) >= thisMonthStart)
                .reduce((sum, j) => sum + (j.commission || 0), 0);

            const lastMonth = techJobs
                .filter(j => {
                    const date = new Date(j.approvalDate);
                    return date >= lastMonthStart && date <= lastMonthEnd;
                })
                .reduce((sum, j) => sum + (j.commission || 0), 0);

            const allTime = techJobs.reduce((sum, j) => sum + (j.commission || 0), 0);

            return {
                name: tech.name,
                thisMonth,
                lastMonth,
                allTime,
                jobsThisMonth: techJobs.filter(j => new Date(j.approvalDate) >= thisMonthStart).length,
                jobsLastMonth: techJobs.filter(j => {
                    const date = new Date(j.approvalDate);
                    return date >= lastMonthStart && date <= lastMonthEnd;
                }).length
            };
        });

        // Render commission list
        const container = document.getElementById('commissionsList');
        if (!container) return;

        const html = techCommissions.length === 0 ?
            '<div class="empty-state"><p>No technicians found</p></div>' :
            techCommissions.map(tech => `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${tech.name}</span>
                        <strong style="color: var(--success);">${this.formatCurrency(tech.thisMonth)}</strong>
                    </div>
                    <div class="list-item-meta">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem; font-size: 0.85rem;">
                            <div>
                                <span style="color: var(--text-muted);">This Month:</span>
                                <strong style="color: var(--success);"> ${this.formatCurrency(tech.thisMonth)}</strong>
                                <span style="color: var(--text-muted);"> (${tech.jobsThisMonth} jobs)</span>
                            </div>
                            <div>
                                <span style="color: var(--text-muted);">Last Month:</span>
                                <strong style="color: var(--warning);"> ${this.formatCurrency(tech.lastMonth)}</strong>
                                <span style="color: var(--text-muted);"> (${tech.jobsLastMonth} jobs)</span>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; font-size: 0.85rem;">
                            <div>
                                <span style="color: var(--text-muted);">All Time Total:</span>
                                <strong> ${this.formatCurrency(tech.allTime)}</strong>
                            </div>
                            <button class="btn btn-info btn-sm" onclick="app.showTechnicianHistory('${tech.name}')">
                                📜 View History
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

        container.innerHTML = html;
    }

    // ===== SHOW TECHNICIAN HISTORY =====
    showTechnicianHistory(technicianName) {
        // Get all approved jobs for this technician, sorted newest to oldest
        const techJobs = this.repairJobs
            .filter(j => j.technician === technicianName && j.status === 'Approved' && j.commission > 0)
            .sort((a, b) => new Date(b.approvalDate) - new Date(a.approvalDate));

        // Hide commissions section, show history section
        document.getElementById('pendingApprovalsSection').style.display = 'none';
        document.getElementById('commissionsSection').style.display = 'none';
        document.getElementById('technicianHistorySection').style.display = 'block';

        // Update header
        document.getElementById('techHistoryName').textContent = `${technicianName} - Commission History`;

        // Render job list
        const listContainer = document.getElementById('techHistoryList');
        if (techJobs.length === 0) {
            listContainer.innerHTML = '<div class="empty-state"><p>No commission history yet</p></div>';
        } else {
            const html = techJobs.map(job => `
                <div class="list-item" style="padding: 0.625rem; margin-bottom: 0.5rem;">
                    <div class="list-item-header">
                        <span class="list-item-title" style="font-size: 0.9rem;">Job #${job.id} - ${job.customer}</span>
                        <strong style="color: var(--success); font-size: 0.9rem;">${this.formatCurrency(job.commission)}</strong>
                    </div>
                    <div class="list-item-meta" style="font-size: 0.8rem;">
                        <div style="margin-top: 0.25rem; line-height: 1.5;">
                            <strong>Device:</strong> ${job.brand} ${job.model}<br>
                            <strong>Problem:</strong> ${job.problem}<br>
                            <strong>Repair Cost:</strong> ${this.formatCurrency(job.cost)}<br>
                            <strong>Approved:</strong> ${new Date(job.approvalDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })}<br>
                            <strong>Approved By:</strong> ${job.approvedBy}
                        </div>
                    </div>
                </div>
            `).join('');
            listContainer.innerHTML = html;
        }

        // Render summary
        const summaryContainer = document.getElementById('techHistorySummary');
        const totalCommission = techJobs.reduce((sum, j) => sum + (j.commission || 0), 0);
        summaryContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 1rem; font-weight: 600;">Total Commission:</span>
                <strong style="font-size: 1.125rem; color: var(--success);">
                    ${this.formatCurrency(totalCommission)}
                </strong>
            </div>
            <div style="margin-top: 0.375rem; color: var(--text-muted); font-size: 0.85rem;">
                Total Jobs: ${techJobs.length}
            </div>
        `;
    }

    backToCommissions() {
        // Hide history section, show commissions section
        document.getElementById('technicianHistorySection').style.display = 'none';
        document.getElementById('pendingApprovalsSection').style.display = 'none';
        document.getElementById('commissionsSection').style.display = 'block';

        // Re-render commissions to refresh data
        this.renderTechnicianCommissions();
    }

    closeTechHistoryModal() {
        // Legacy function - now redirects to back button
        this.backToCommissions();
    }

    //===== TAB SWITCHING FUNCTIONS =====
    switchFinanceTab(tab) {
        // Update button states
        const btnStockTab = document.getElementById('btnStockTab');
        const btnSalesTab = document.getElementById('btnSalesTab');
        const btnHistoryTab = document.getElementById('btnHistoryTab');
        const stockSection = document.getElementById('financeStockSection');
        const salesSection = document.getElementById('financeSalesSection');
        const historySection = document.getElementById('financeHistorySection');

        // Hide all sections first
        if (stockSection) stockSection.style.display = 'none';
        salesSection.style.display = 'none';
        if (historySection) historySection.style.display = 'none';

        // Remove active from all buttons
        if (btnStockTab) btnStockTab.classList.remove('active');
        btnSalesTab.classList.remove('active');
        btnHistoryTab.classList.remove('active');

        // Show selected section and activate button
        if (tab === 'stock') {
            if (stockSection) {
                stockSection.style.display = 'block';
                btnStockTab.classList.add('active');
                this.filterStockByCategory('all');
            }
        } else if (tab === 'sales') {
            salesSection.style.display = 'block';
            btnSalesTab.classList.add('active');
        } else if (tab === 'history') {
            if (historySection) {
                historySection.style.display = 'block';
                btnHistoryTab.classList.add('active');
            }
        }
    }

    switchCreditTab(tab) {
        // Update button states  
        const btnCustomerTab = document.getElementById('btnCustomerTab');
        const btnVendorTab = document.getElementById('btnVendorTab');
        const customerSection = document.getElementById('customerCreditsSection');
        const vendorSection = document.getElementById('vendorCreditsSection');
        const expensesSection = document.getElementById('expensesSection');

        // Hide expenses if it's showing
        if (expensesSection) expensesSection.style.display = 'none';

        // Hide all credit sections
        customerSection.style.display = 'none';
        vendorSection.style.display = 'none';

        // Remove active from all buttons
        btnCustomerTab.classList.remove('active');
        btnVendorTab.classList.remove('active');

        // Show selected section and activate button
        if (tab === 'customer') {
            customerSection.style.display = 'block';
            btnCustomerTab.classList.add('active');
            this.renderCustomerCredits();
        } else if (tab === 'vendor') {
            vendorSection.style.display = 'block';
            btnVendorTab.classList.add('active');
            this.renderVendorCredits();
        }
    }

    showExpensesView() {
        // Hide customer and vendor sections
        document.getElementById('customerCreditsSection').style.display = 'none';
        document.getElementById('vendorCreditsSection').style.display = 'none';

        // Remove active from credit tabs
        document.getElementById('btnCustomerTab').classList.remove('active');
        document.getElementById('btnVendorTab').classList.remove('active');

        // Show expenses section
        document.getElementById('expensesSection').style.display = 'block';

        // Render expenses
        this.renderExpenses();
    }

    hideExpensesView() {
        // Hide expenses and show customers
        document.getElementById('expensesSection').style.display = 'none';
        this.switchCreditTab('customer');
    }

    renderExpenses() {
        const container = document.getElementById('mgrExpensesList');
        if (!container) return;

        if (this.expenses.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No expenses recorded yet</p></div>';
            return;
        }

        const html = this.expenses
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(expense => `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${expense.category} - ${expense.reason}</span>
                        <strong>${this.formatCurrency(expense.amount)}</strong>
                    </div>
                    <div class="list-item-meta">
                        <span>${new Date(expense.date).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');

        container.innerHTML = html;
    }

    showAddExpenseModal() {
        // Clear form
        document.getElementById('expAmount').value = '';
        document.getElementById('expCategory').value = 'Rent';
        document.getElementById('expReason').value = '';

        // Show modal
        this.showModal('addExpenseModal');
    }

    addExpense() {
        const amount = parseFloat(document.getElementById('expAmount').value);
        const category = document.getElementById('expCategory').value;
        const reason = document.getElementById('expReason').value;

        if (!amount || amount <= 0) {
            this.showToast('Please enter a valid amount');
            return;
        }

        if (!reason.trim()) {
            this.showToast('Please enter a reason');
            return;
        }

        const expense = {
            id: Date.now(),
            amount: amount,
            category: category,
            reason: reason,
            date: new Date().toISOString()
        };

        this.expenses.push(expense);
        this.saveData('expenses');

        // Close modal and refresh
        this.closeModal('addExpenseModal');
        this.renderExpenses();
        this.showToast(`✓ Expense added: ${this.formatCurrency(amount)}`);
    }

    // ===== REPORTS & ANALYTICS =====
    toggleReportMode(mode) {
        const monthlyInputs = document.getElementById('monthlyModeInputs');
        const dateRangeInputs = document.getElementById('dateRangeModeInputs');

        if (mode === 'monthly') {
            monthlyInputs.style.display = 'flex';
            dateRangeInputs.style.display = 'none';
        } else if (mode === 'dateRange') {
            monthlyInputs.style.display = 'none';
            dateRangeInputs.style.display = 'flex';
        }
    }

    generateReport() {
        const mode = document.querySelector('input[name="reportMode"]:checked').value;

        if (mode === 'monthly') {
            this.generateMonthlyReport();
        } else {
            this.generateDateRangeReport();
        }
    }

    generateMonthlyReport() {
        const monthInput = document.getElementById('mgrReportMonth').value;
        if (!monthInput) {
            this.showToast('Please select a month');
            return;
        }

        const [year, month] = monthInput.split('-');
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        this.calculateAndDisplayReport(startDate, endDate);
    }

    generateDateRangeReport() {
        const fromDate = document.getElementById('reportFromDate').value;
        const toDate = document.getElementById('reportToDate').value;

        if (!fromDate || !toDate) {
            this.showToast('Please select both From and To dates');
            return;
        }

        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59);

        if (endDate < startDate) {
            this.showToast('End date must be after start date');
            return;
        }

        this.calculateAndDisplayReport(startDate, endDate);
    }

    calculateAndDisplayReport(startDate, endDate) {
        // Filter sales
        const filteredSales = this.sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return saleDate >= startDate && saleDate <= endDate;
        });

        // Filter approved repairs
        const filteredRepairs = this.repairJobs.filter(job => {
            if (job.status !== 'Approved' || !job.approvalDate) return false;
            const approvalDate = new Date(job.approvalDate);
            return approvalDate >= startDate && approvalDate <= endDate;
        });

        // Filter expenses
        const filteredExpenses = this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= startDate && expenseDate <= endDate;
        });

        // Calculate totals
        const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const totalRepairs = filteredRepairs.reduce((sum, job) => sum + (job.cost || 0), 0);
        const totalCommissions = filteredRepairs.reduce((sum, job) => sum + (job.commission || 0), 0);
        const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        const netRevenue = totalSales + totalRepairs - totalCommissions - totalExpenses;

        // Update UI
        document.getElementById('mgrReportSales').textContent = this.formatCurrency(totalSales);
        document.getElementById('mgrReportRepairs').textContent = this.formatCurrency(totalRepairs);
        document.getElementById('mgrReportCommissions').textContent = this.formatCurrency(totalCommissions);
        document.getElementById('mgrReportExpenses').textContent = this.formatCurrency(totalExpenses);
        document.getElementById('mgrReportNet').textContent = this.formatCurrency(netRevenue);

        // Render technician performance details
        this.renderTechnicianPerformance(filteredRepairs);

        this.showToast('✓ Report generated successfully');
    }

    renderTechnicianPerformance(filteredRepairs) {
        const container = document.getElementById('mgrTechCommissions');
        if (!container) return;

        // Group by technician
        const techData = {};
        filteredRepairs.forEach(job => {
            if (!techData[job.technician]) {
                techData[job.technician] = {
                    jobs: 0,
                    totalCommission: 0
                };
            }
            techData[job.technician].jobs++;
            techData[job.technician].totalCommission += (job.commission || 0);
        });

        if (Object.keys(techData).length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No technician activity in selected period</p></div>';
            return;
        }

        const html = Object.entries(techData)
            .sort((a, b) => b[1].totalCommission - a[1].totalCommission)
            .map(([name, data]) => `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${name}</span>
                        <strong style="color: var(--success);">${this.formatCurrency(data.totalCommission)}</strong>
                    </div>
                    <div class="list-item-meta">
                        <span>${data.jobs} job${data.jobs > 1 ? 's' : ''} completed</span>
                    </div>
                </div>
            `).join('');

        container.innerHTML = html;
    }

    toggleShopProfile() {
        const section = document.getElementById('shopProfileSection');
        if (section) {
            if (section.style.display === 'none') {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        }
    }

    // ===== MANAGER STOCK =====
    renderManagerStock(searchTerm = '') {
        try {
            const container = document.getElementById('mgrStockList');
            if (!container) return;

            let stockToShow = this.stock || [];
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                stockToShow = stockToShow.filter(item =>
                    item.name.toLowerCase().includes(term) ||
                    item.category.toLowerCase().includes(term) ||
                    item.brand.toLowerCase().includes(term)
                );
            }

            // Show empty state if no products
            if (stockToShow.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 3rem 1rem;">
                        <div class="empty-state-icon" style="font-size: 4rem; margin-bottom: 1rem;">📦</div>
                        <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Products Found</h3>
                        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Your inventory is empty. Add your first product!</p>
                        <button class="btn btn-primary" onclick="app.showAddProductModal()">+ Add Product</button>
                    </div>
                `;
                return;
            }

            const html = stockToShow.map(item => {
                const isLow = item.quantity <= item.minQuantity;
                return `
                <div class="stock-card" onclick="app.showProductDetail(${item.id})">
                    ${isLow ? '<span class="stock-low-badge">LOW</span>' : ''}
                    <div class="stock-image-container">
                        ${item.image ? `<img src="${item.image}" class="stock-image" alt="${item.name}">` : '<div class="stock-placeholder">📦</div>'}
                    </div>
                    <div class="stock-card-name" title="${item.name}">${item.name}</div>
                    <div class="stock-card-price">${this.formatCurrency(item.price)}</div>
                    <div class="stock-card-qty">
                        <span class="stock-card-qty-badge">${item.quantity}</span>
                        <span>in stock</span>
                    </div>
                </div>
            `;
            }).join('');

            if (container) container.innerHTML = html;
        } catch (e) {
            console.error('Error rendering stock:', e);
        }
    }

    // Current category filter state
    currentCategoryFilter = 'all';

    filterStockByCategory(category, searchTerm = '') {
        // If searchTerm is provided but no category, use current filter
        if (category === null) {
            category = this.currentCategoryFilter;
        } else {
            this.currentCategoryFilter = category;
        }

        // Update button active states (both containers if they exist)
        const buttons = document.querySelectorAll('#categoryFilters .category-btn, #categoryFilters2 .category-btn');
        buttons.forEach(btn => {
            const btnCategory = btn.dataset.category;
            if (btnCategory === category) {
                btn.style.background = 'var(--primary)';
                btn.style.color = 'white';
                btn.classList.add('active');
            } else {
                btn.style.background = 'var(--bg-secondary)';
                btn.style.color = 'var(--text-primary)';
                btn.classList.remove('active');
            }
        });

        // Get search term from inputs if not provided explicitly
        if (!searchTerm) {
            const searchInput1 = document.getElementById('mgrStockSearch');
            const searchInput2 = document.getElementById('mgrStockSearch2');
            searchTerm = (searchInput2 && searchInput2.value) || (searchInput1 && searchInput1.value) || '';
        }

        // Get all possible containers
        const containers = ['mgrStockList', 'mgrStockList2']
            .map(id => document.getElementById(id))
            .filter(el => el !== null);

        if (containers.length === 0) return;

        let stockToShow = this.stock || [];

        // Apply category filter
        if (category && category !== 'all') {
            stockToShow = stockToShow.filter(item =>
                item.category && item.category.toLowerCase() === category.toLowerCase()
            );
        }

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            stockToShow = stockToShow.filter(item =>
                item.name.toLowerCase().includes(term) ||
                (item.brand && item.brand.toLowerCase().includes(term))
            );
        }

        // Prepare HTML content
        let htmlContent = "";
        if (stockToShow.length === 0) {
            htmlContent = `
                <div class="empty-state" style="text-align: center; padding: 3rem 1rem;">
                    <div class="empty-state-icon" style="font-size: 4rem; margin-bottom: 1rem;">📦</div>
                    <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No Products Found</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${category !== 'all' ? `No products in "${category}" category` : 'Your inventory is empty. Add your first product!'}</p>
                    <button class="btn btn-primary" onclick="app.showAddProductModal()">+ Add Product</button>
                </div>
            `;
        } else {
            htmlContent = stockToShow.map(item => {
                const isLow = item.quantity <= item.minQuantity;
                return `
                <div class="stock-card" onclick="app.showProductDetail(${item.id})">
                    ${isLow ? '<span class="stock-low-badge">LOW</span>' : ''}
                    <div class="stock-image-container">
                        ${item.image ? `<img src="${item.image}" class="stock-image" alt="${item.name}">` : '<div class="stock-placeholder">📦</div>'}
                    </div>
                    <div class="stock-card-name" title="${item.name}">${item.name}</div>
                    <div class="stock-card-price">${this.formatCurrency(item.price)}</div>
                    <div class="stock-card-qty">
                        <span class="stock-card-qty-badge">${item.quantity}</span>
                        <span>in stock</span>
                    </div>
                </div>
            `;
            }).join('');
        }

        // Update all containers
        containers.forEach(container => {
            container.innerHTML = htmlContent;
        });
    }

    // ===== PRODUCT MODAL MANAGEMENT =====
    showAddProductModal() {
        document.getElementById('addProductModalTitle').textContent = 'Add New Product';
        document.getElementById('addProductSubmitBtn').textContent = 'Add Product';
        document.getElementById('addProductForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('imagePreviewText').style.display = 'block';
        this.showModal('addProductModal');
    }

    editStockItem(productId) {
        const product = this.stock.find(p => p.id === productId);
        if (!product) return;

        document.getElementById('addProductModalTitle').textContent = 'Edit Product';
        document.getElementById('addProductSubmitBtn').textContent = 'Update Product';

        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productBrand').value = product.brand || '';
        document.getElementById('productQty').value = product.quantity;
        document.getElementById('productMinQty').value = product.minQuantity;
        document.getElementById('productCost').value = product.cost;
        document.getElementById('productPrice').value = product.price;

        if (product.image) {
            document.getElementById('imagePreview').src = product.image;
            document.getElementById('imagePreview').style.display = 'block';
            document.getElementById('imagePreviewText').style.display = 'none';
        } else {
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('imagePreviewText').style.display = 'block';
        }

        this.showModal('addProductModal');
    }

    handleAddProduct(e) {
        if (e) e.preventDefault();

        const productId = document.getElementById('productId').value;
        const name = document.getElementById('productName').value;
        const category = document.getElementById('productCategory').value;
        const brand = document.getElementById('productBrand').value;
        const quantity = parseInt(document.getElementById('productQty').value);
        const minQuantity = parseInt(document.getElementById('productMinQty').value);
        const cost = parseFloat(document.getElementById('productCost').value);
        const price = parseFloat(document.getElementById('productPrice').value);
        const description = document.getElementById('productDescription')?.value || '';
        const imageInput = document.getElementById('productImageInput');

        if (!name || !category || quantity < 0 || cost < 0 || price < 0) {
            this.showToast('Please fill all required fields');
            return;
        }

        const processProduct = (imageData) => {
            if (productId) {
                // Update existing product
                const product = this.stock.find(p => p.id == productId);
                if (product) {
                    product.name = name;
                    product.category = category;
                    product.brand = brand;
                    product.quantity = quantity;
                    product.minQuantity = minQuantity;
                    product.cost = cost;
                    product.price = price;
                    product.description = description;
                    if (imageData) product.image = imageData;

                    this.saveData('stock');
                    this.showToast('✓ Product updated successfully');
                    this.closeModal('addProductModal');
                    this.renderManagerStock();
                }
            } else {
                // Add new product
                const newProduct = {
                    id: Date.now(),
                    name,
                    category,
                    brand,
                    quantity,
                    minQuantity,
                    cost,
                    price,
                    description,
                    image: imageData || null
                };

                this.stock.push(newProduct);
                this.saveData('stock');
                this.showToast('✓ Product added successfully');
                this.closeModal('addProductModal');
                this.renderManagerStock();
            }
        };

        // Handle image if uploaded
        if (imageInput.files && imageInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => processProduct(e.target.result);
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            processProduct(null);
        }
    }

    // ===== PRODUCT DETAIL VIEW =====
    showProductDetail(productId) {
        const product = this.stock.find(p => p.id === productId);
        if (!product) return;

        // Store the current product ID for edit button
        this.currentDetailProductId = productId;

        const isLow = product.quantity <= product.minQuantity;

        const content = `
            <div style="text-align: center; margin-bottom: 0.75rem;">
                ${product.image ?
                `<img src="${product.image}" style="max-width: 100%; max-height: 180px; border-radius: var(--radius-md); object-fit: cover;">` :
                '<div style="font-size: 3rem; opacity: 0.3;">📦</div>'
            }
            </div>
            
            <div style="background: var(--bg-secondary); padding: 0.75rem; border-radius: var(--radius-md);">
                <h2 style="margin: 0 0 0.4rem 0; font-size: 1.25rem;">${product.name}</h2>
                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                    <span class="badge" style="background: var(--primary); color: white; font-size: 0.65rem;">${product.category}</span>
                    ${product.brand ? `<span class="badge" style="background: var(--accent); color: white; font-size: 0.65rem;">${product.brand}</span>` : ''}
                    ${isLow ? '<span class="badge badge-pending" style="font-size: 0.65rem;">Low Stock</span>' : ''}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                <div style="background: var(--bg-secondary); padding: 0.6rem; border-radius: var(--radius-md); text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.2rem;">Price</div>
                    <div style="font-size: 1.1rem; font-weight: 700; color: var(--success);">${this.formatCurrency(product.price)}</div>
                </div>
                <div style="background: var(--bg-secondary); padding: 0.6rem; border-radius: var(--radius-md); text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.2rem;">Cost</div>
                    <div style="font-size: 1.1rem; font-weight: 700;">${this.formatCurrency(product.cost)}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                <div style="background: var(--bg-secondary); padding: 0.6rem; border-radius: var(--radius-md); text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.2rem;">In Stock</div>
                    <div style="font-size: 1.3rem; font-weight: 700;">${product.quantity}</div>
                </div>
                <div style="background: var(--bg-secondary); padding: 0.6rem; border-radius: var(--radius-md); text-align: center;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.2rem;">Min. Quantity</div>
                    <div style="font-size: 1.3rem; font-weight: 700;">${product.minQuantity}</div>
                </div>
            </div>

            <div style="background: var(--bg-secondary); padding: 0.6rem; border-radius: var(--radius-md);">
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.2rem;">Profit Margin</div>
                <div style="font-size: 1rem; font-weight: 600; color: var(--success);">
                    ${this.formatCurrency(product.price - product.cost)} 
                    <span style="font-size: 0.8rem; color: var(--text-muted);">
                        (${product.cost > 0 ? Math.round(((product.price - product.cost) / product.cost) * 100) : 0}%)
                    </span>
                </div>
            </div>
        `;

        document.getElementById('productDetailContent').innerHTML = content;
        this.showModal('productDetailModal');
    }

    editFromDetail() {
        this.closeModal('productDetailModal');
        if (this.currentDetailProductId) {
            this.editStockItem(this.currentDetailProductId);
        }
    }

    // ===== MANAGER FINANCE (SALES & EXPENSES) =====
    switchFinanceTab(tab) {
        document.getElementById('financeSalesSection').style.display = tab === 'sales' ? 'block' : 'none';
        document.getElementById('financeExpensesSection').style.display = tab === 'expenses' ? 'block' : 'none';
        document.getElementById('financeHistorySection').style.display = tab === 'history' ? 'block' : 'none';

        document.getElementById('btnSalesTab').classList.toggle('active', tab === 'sales');
        document.getElementById('btnExpensesTab').classList.toggle('active', tab === 'expenses');
        document.getElementById('btnHistoryTab').classList.toggle('active', tab === 'history');

        const activeStyle = { background: 'var(--primary)', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
        const inactiveStyle = { background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' };

        Object.assign(document.getElementById('btnSalesTab').style, tab === 'sales' ? activeStyle : inactiveStyle);
        Object.assign(document.getElementById('btnExpensesTab').style, tab === 'expenses' ? activeStyle : inactiveStyle);
        Object.assign(document.getElementById('btnHistoryTab').style, tab === 'history' ? activeStyle : inactiveStyle);
    }

    renderManagerSales() {
        this.renderManagerSalesHistory();
        this.renderManagerExpenses();

        // Populate all product dropdowns
        const optionsHtml = this.getProductOptionsHtml();
        document.querySelectorAll('.item-product').forEach(select => {
            if (select.innerHTML.trim() === '<option value="">-- Select Product --</option>') {
                select.innerHTML = optionsHtml;
            }
        });
    }

    handleExpenseSubmit() {
        const amount = parseFloat(document.getElementById('expAmount').value);
        const category = document.getElementById('expCategory').value;
        const reason = document.getElementById('expReason').value;

        if (amount > 0) {
            const expense = {
                id: 'exp_' + Date.now(),
                date: new Date().toISOString(),
                category: category,
                reason: reason,
                amount: amount
            };

            this.expenses.push(expense);
            this.saveData('expenses');
            this.showToast('✓ Expense recorded');
            document.getElementById('mgrExpenseForm').reset();
            this.renderManagerExpenses();
        }
    }

    renderManagerExpenses() {
        const container = document.getElementById('mgrExpensesList');
        if (!container) return;

        const sorted = [...this.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
        const html = sorted.map(exp => `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="list-item-title">${exp.category}: ${exp.reason}</span>
                    <strong style="color: var(--danger);">${this.formatCurrency(exp.amount)}</strong>
                </div>
                <div class="list-item-meta">
                    <span>${new Date(exp.date).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html || '<div class="empty-state">No expenses found</div>';
    }

    renderManagerSalesHistory() {
        try {
            const sortedSales = [...this.sales].sort((a, b) => new Date(b.date) - new Date(a.date));
            const recentSales = sortedSales.slice(0, 10);

            const html = recentSales.length === 0 ?
                '<div class="empty-state"><p>No sales recorded yet</p></div>' :
                recentSales.map(sale => `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${sale.product}</span>
                        <strong>${this.formatCurrency(sale.total)}</strong>
                    </div>
                    <div class="list-item-meta">
                        <span>${this.formatDate(new Date(sale.date))} • ${sale.quantity} unit(s)</span>
                        <span>${sale.customer}</span>
                    </div>
                </div>
            `).join('');

            const container = document.getElementById('mgrSalesHistory');
            if (container) container.innerHTML = html;
        } catch (e) {
            console.error('Error rendering sales history:', e);
        }
    }

    // Multi-Product Sale Management
    getProductOptionsHtml() {
        const sortedStock = [...this.stock].sort((a, b) => a.name.localeCompare(b.name));
        return `
            <option value="">-- Select Product --</option>
            ${sortedStock.map(p => `<option value="${p.name}">${p.name} (${this.formatCurrency(p.price)}) - Qty: ${p.quantity}</option>`).join('')}
        `;
    }

    addNewSaleRow() {
        const container = document.getElementById('saleItemRows');
        const row = document.createElement('div');
        row.className = 'sale-item-row card';
        row.style = 'background: var(--bg-tertiary); padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border); position: relative;';
        row.innerHTML = `
            <button type="button" class="btn btn-danger btn-sm" style="position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem 0.5rem;" onclick="app.removeSaleRow(this)">✕</button>
            <div class="form-group">
                <label>Product</label>
                <select class="item-product" required onchange="app.autoFillPrice(this)">
                    ${this.getProductOptionsHtml()}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Quantity</label>
                    <input type="number" class="item-qty" min="1" value="1" required oninput="app.calculateGrandTotal()">
                </div>
                <div class="form-group">
                    <label>Price (Rs.)</label>
                    <input type="number" class="item-price" step="0.01" required oninput="app.calculateGrandTotal()">
                </div>
            </div>
        `;
        container.appendChild(row);
    }

    removeSaleRow(btn) {
        const rows = document.querySelectorAll('.sale-item-row');
        if (rows.length > 1) {
            btn.parentElement.remove();
            this.calculateGrandTotal();
        } else {
            this.showToast('At least one item is required');
        }
    }

    autoFillPrice(input) {
        const row = input.parentElement.parentElement;
        const productName = input.value;
        const product = this.stock.find(p => p.name === productName);
        if (product) {
            row.querySelector('.item-price').value = product.price;
            this.calculateGrandTotal();
        }
    }

    calculateGrandTotal() {
        let total = 0;
        const rows = document.querySelectorAll('.sale-item-row');
        rows.forEach(row => {
            const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            total += qty * price;
        });
        document.getElementById('mgrSaleTotal').textContent = this.formatCurrency(total);
        return total;
    }

    handleManagerSale() {
        const rows = document.querySelectorAll('.sale-item-row');
        const customer = document.getElementById('mgrSaleCustomer').value;
        const phone = document.getElementById('mgrSalePhone').value;
        const payment = document.getElementById('mgrSalePayment').value;
        const transactionId = 'TXN-' + Date.now();
        const date = new Date().toISOString();

        let grandTotal = 0;
        const items = [];

        // Validate and Collect
        for (const row of rows) {
            const productName = row.querySelector('.item-product').value;
            const qty = parseInt(row.querySelector('.item-qty').value);
            const price = parseFloat(row.querySelector('.item-price').value);

            if (!productName || qty <= 0 || price <= 0) {
                this.showToast('Please fill all item details correctly');
                return;
            }

            const product = this.stock.find(p => p.name === productName);
            if (product && product.quantity < qty) {
                this.showToast(`Insufficient stock for ${productName}`);
                return;
            }

            const total = qty * price;
            grandTotal += total;
            items.push({ productName, qty, price, total });
        }

        // Process Sales
        items.forEach(item => {
            const sale = {
                id: Date.now() + Math.random(),
                transactionId,
                date,
                product: item.productName,
                quantity: item.qty,
                price: item.price,
                total: item.total,
                customer,
                phone,
                payment,
                employee: this.currentUser.name
            };

            // Update local stock
            const product = this.stock.find(p => p.name === item.productName);
            if (product) {
                product.quantity -= item.qty;
            }

            this.sales.push(sale);
        });

        if (payment === 'Credit') {
            this.addCustomerCredit(customer, phone, grandTotal);
        }

        this.saveData('sales');
        this.saveData('stock');

        this.showToast('✓ Sale completed successfully!');

        // Reset form
        document.getElementById('mgrSalesForm').reset();
        const rowsContainer = document.getElementById('saleItemRows');
        rowsContainer.innerHTML = `
            <div class="sale-item-row card" style="background: var(--bg-tertiary); padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--border);">
                <div class="form-group">
                    <label>Product</label>
                    <select class="item-product" required onchange="app.autoFillPrice(this)">
                        ${this.getProductOptionsHtml()}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Quantity</label>
                        <input type="number" class="item-qty" min="1" value="1" required oninput="app.calculateGrandTotal()">
                    </div>
                    <div class="form-group">
                        <label>Price (Rs.)</label>
                        <input type="number" class="item-price" step="0.01" required oninput="app.calculateGrandTotal()">
                    </div>
                </div>
            </div>
        `;
        this.calculateGrandTotal();
        this.render();
    }


    showAddProductModal() {
        document.getElementById('addProductModalTitle').textContent = 'Add New Product';
        document.getElementById('productId').value = '';
        document.getElementById('addProductForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('imagePreviewText').style.display = 'block';
        document.getElementById('addProductSubmitBtn').textContent = 'Add Product';
        this.showModal('addProductModal');
    }

    handleAddProduct() {
        const fileInput = document.getElementById('productImageInput');
        const file = fileInput.files[0];

        const saveProduct = (imageData) => {
            const id = document.getElementById('productId').value;
            const productData = {
                name: document.getElementById('productName').value,
                category: document.getElementById('productCategory').value,
                brand: document.getElementById('productBrand').value,
                quantity: parseInt(document.getElementById('productQty').value),
                minQuantity: parseInt(document.getElementById('productMinQty').value),
                cost: parseFloat(document.getElementById('productCost').value),
                price: parseFloat(document.getElementById('productPrice').value),
                image: imageData || (id ? this.stock.find(p => String(p.id) === String(id))?.image : null)
            };

            if (id) {
                const index = this.stock.findIndex(p => String(p.id) === String(id));
                if (index !== -1) {
                    this.stock[index] = { ...this.stock[index], ...productData };
                }
            } else {
                this.stock.push({ id: Date.now(), ...productData });
            }

            this.saveData('stock');
            this.closeModal('addProductModal');
            document.getElementById('addProductForm').reset();
            this.showToast(`✓ Product ${id ? 'updated' : 'added'} successfully!`);
            this.render();
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => saveProduct(e.target.result);
            reader.readAsDataURL(file);
        } else {
            saveProduct(null);
        }
    }

    editStockItem(id) {
        const item = this.stock.find(p => String(p.id) === String(id));
        if (!item) return;

        document.getElementById('addProductModalTitle').textContent = 'Edit Product';
        document.getElementById('productId').value = item.id;
        document.getElementById('productName').value = item.name;
        document.getElementById('productCategory').value = item.category;
        document.getElementById('productBrand').value = item.brand;
        document.getElementById('productQty').value = item.quantity;
        document.getElementById('productMinQty').value = item.minQuantity;
        document.getElementById('productCost').value = item.cost;
        document.getElementById('productPrice').value = item.price;

        if (item.image) {
            document.getElementById('imagePreview').src = item.image;
            document.getElementById('imagePreview').style.display = 'block';
            document.getElementById('imagePreviewText').style.display = 'none';
        } else {
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('imagePreviewText').style.display = 'block';
        }

        document.getElementById('addProductSubmitBtn').textContent = 'Save Changes';
        this.showModal('addProductModal');
    }

    // ===== MANAGER REPORTS =====
    generateManagerReport() {
        const monthInput = document.getElementById('mgrReportMonth').value;
        if (!monthInput) {
            this.showToast('Please select a month first');
            return;
        }
        const [year, month] = monthInput.split('-').map(Number);

        const monthSales = this.sales.filter(s => {
            const d = new Date(s.date);
            return d.getFullYear() === year && d.getMonth() + 1 === month;
        });

        const monthJobs = this.repairJobs.filter(j => {
            const d = new Date(j.dateSubmitted);
            return d.getFullYear() === year && d.getMonth() + 1 === month;
        });

        const totalSales = monthSales.reduce((sum, s) => sum + s.total, 0);
        const totalRepairs = monthJobs.reduce((sum, j) => sum + j.cost, 0);
        const totalCommissions = monthJobs.filter(j => j.status === 'Approved').reduce((sum, j) => sum + j.commission, 0);

        const monthExpenses = this.expenses.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() + 1 === month;
        });
        const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

        const netRevenue = totalSales + totalRepairs - totalCommissions - totalExpenses;

        document.getElementById('mgrReportSales').textContent = this.formatCurrency(totalSales);
        document.getElementById('mgrReportRepairs').textContent = this.formatCurrency(totalRepairs);
        document.getElementById('mgrReportCommissions').textContent = this.formatCurrency(totalCommissions);
        document.getElementById('mgrReportExpenses').textContent = this.formatCurrency(totalExpenses);

        // Technician commissions
        const techCommissions = {};
        this.users.filter(u => u.role === 'technician').forEach(tech => {
            const jobs = monthJobs.filter(j => j.technician === tech.name && j.status === 'Approved');
            techCommissions[tech.name] = {
                count: jobs.length,
                total: jobs.reduce((sum, j) => sum + j.commission, 0),
                jobs: jobs.map(j => ({ id: j.id, model: j.model, cost: j.cost, commission: j.commission }))
            };
        });

        const techHtml = Object.entries(techCommissions).map(([name, data]) => `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="list-item-title">${name}</span>
                    <strong>${this.formatCurrency(data.total)}</strong>
                </div>
                <div class="list-item-meta">
                    <span>${data.count} Approved Jobs</span>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; border-top: 1px dashed var(--border); padding-top: 0.5rem;">
                        ${data.jobs.map(j => `
                            <div style="display: flex; justify-content: space-between;">
                                <span>#${j.id} ${j.model}</span>
                                <span>Comm: ${this.formatCurrency(j.commission)}</span>
                            </div>
                        `).join('') || 'No job details'}
                    </div>
                </div>
            </div>
        `).join('');

        document.getElementById('mgrTechCommissions').innerHTML = techHtml || '<div class="empty-state"><p>No commissions this month</p></div>';

        // Render charts
        this.renderCommissionCharts(year, month);
    }

    renderCommissionCharts(year, month) {
        // --- 1. Daily Data (Selected Month) ---
        const daysInMonth = new Date(year, month, 0).getDate();
        const labelsDaily = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
        const techs = this.users.filter(u => u.role === 'technician');

        const datasetsDaily = techs.map((tech, index) => {
            const h = (index * 137) % 360;
            const color = `hsl(${h}, 70%, 50%)`;
            const data = Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                return this.repairJobs
                    .filter(j => {
                        const d = new Date(j.dateSubmitted);
                        return j.technician === tech.name &&
                            j.status === 'Approved' &&
                            d.getFullYear() === year &&
                            d.getMonth() + 1 === month &&
                            d.getDate() === day;
                    })
                    .reduce((sum, j) => sum + j.commission, 0);
            });

            return {
                label: tech.name,
                data: data,
                borderColor: color,
                backgroundColor: color.replace('50%)', '50%, 0.1)'),
                tension: 0.4,
                fill: true
            };
        });

        // --- 2. Monthly Data (Last 6 Months) ---
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(year, month - 1 - i, 1);
            last6Months.push({
                year: d.getFullYear(),
                month: d.getMonth() + 1,
                label: d.toLocaleString('default', { month: 'short', year: '2-digit' })
            });
        }

        const labelsMonthly = last6Months.map(m => m.label);
        const datasetsMonthly = techs.map((tech, index) => {
            const h = (index * 137) % 360;
            const color = `hsl(${h}, 70%, 50%)`;
            const data = last6Months.map(m => {
                return this.repairJobs
                    .filter(j => {
                        const d = new Date(j.dateSubmitted);
                        return j.technician === tech.name &&
                            j.status === 'Approved' &&
                            d.getFullYear() === m.year &&
                            d.getMonth() + 1 === m.month;
                    })
                    .reduce((sum, j) => sum + j.commission, 0);
            });

            return {
                label: tech.name,
                data: data,
                backgroundColor: color,
                borderRadius: 5
            };
        });

        // --- 3. Render Daily Chart ---
        const ctxDaily = document.getElementById('commissionDailyChart')?.getContext('2d');
        if (ctxDaily) {
            if (this.dailyChart) this.dailyChart.destroy();
            this.dailyChart = new Chart(ctxDaily, {
                type: 'line',
                data: { labels: labelsDaily, datasets: datasetsDaily },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // --- 4. Render Monthly Chart ---
        const ctxMonthly = document.getElementById('commissionMonthlyChart')?.getContext('2d');
        if (ctxMonthly) {
            if (this.monthlyChart) this.monthlyChart.destroy();
            this.monthlyChart = new Chart(ctxMonthly, {
                type: 'bar',
                data: { labels: labelsMonthly, datasets: datasetsMonthly },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    renderStockValueReport() {
        let totalValue = 0;
        const html = this.stock.map(item => {
            const val = item.price * item.quantity;
            totalValue += val;
            return `
                <tr>
                    <td style="padding: 1rem; border-bottom: 1px solid var(--border);">${item.name}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid var(--border);">${this.formatCurrency(item.price)}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid var(--border);">${item.quantity}</td>
                    <td style="padding: 1rem; border-bottom: 1px solid var(--border); text-align: right;">${this.formatCurrency(val)}</td>
                </tr>
            `;
        }).join('');

        const table = document.getElementById('mgrStockReportTable');
        const totalDisplay = document.getElementById('mgrTotalStockValue');

        if (table) table.innerHTML = html || '<tr><td colspan="4" class="empty-state">No stock found</td></tr>';
        if (totalDisplay) totalDisplay.textContent = 'Total: ' + this.formatCurrency(totalValue);
    }

    // ===== MANAGER SETTINGS =====
    renderManagerSettings() {
        const form = document.getElementById('settingsForm');
        if (!form) return;

        document.getElementById('setShopName').value = this.settings.shopName || '';
        document.getElementById('setShopPhone').value = this.settings.shopPhone || '';
        document.getElementById('setShopEmail').value = this.settings.shopEmail || '';
        document.getElementById('setShopAddress').value = this.settings.shopAddress || '';
        document.getElementById('setCurrency').value = this.settings.currency || 'Rs.';
        document.getElementById('setLowStock').value = this.settings.lowStockLevel || 5;
        document.getElementById('setCommission').value = this.settings.defaultCommission || 10;
    }

    handleSaveSettings() {
        this.settings = {
            ...this.settings,
            shopName: document.getElementById('setShopName').value,
            shopPhone: document.getElementById('setShopPhone').value,
            shopEmail: document.getElementById('setShopEmail').value,
            shopAddress: document.getElementById('setShopAddress').value,
            currency: document.getElementById('setCurrency').value,
            lowStockLevel: parseInt(document.getElementById('setLowStock').value),
            defaultCommission: parseFloat(document.getElementById('setCommission').value)
        };

        this.saveSettings();
        this.applySettings();
        this.showToast('✓ Settings saved successfully');
    }

    // ===== MANAGER WARRANTY =====
    // ===== MANAGER WARRANTY =====
    renderManagerWarranty(searchTerm = '') {
        const activeContainer = document.getElementById('mgrWarrantyList');
        if (!activeContainer) return;

        let activeJobs = this.warrantyJobs.filter(j => j.status !== 'Delivered');

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            activeJobs = activeJobs.filter(j =>
                j.customer.toLowerCase().includes(term) ||
                j.brand.toLowerCase().includes(term) ||
                j.model.toLowerCase().includes(term) ||
                (j.imei && j.imei.toLowerCase().includes(term)) ||
                (j.repName && j.repName.toLowerCase().includes(term))
            );
        }

        const html = activeJobs.length === 0 ?
            '<div class="empty-state">No active warranty jobs found</div>' :
            activeJobs.map(job => {
                // Determine status badge
                let statusBadge = '';
                switch (job.status) {
                    case 'Collected':
                        statusBadge = '<span class="badge badge-pending">📦 Collected</span>';
                        break;
                    case 'Sent to SC':
                        statusBadge = '<span class="badge badge-warning">🚚 Sent to SC</span>';
                        break;
                    case 'Back from SC':
                        statusBadge = '<span class="badge badge-success">✅ Back from SC</span>';
                        break;
                    default:
                        statusBadge = `<span class="badge badge-secondary">${job.status}</span>`;
                }

                return `
                <div class="list-item" style="padding: 0.5rem;">
                    <div class="list-item-header" style="margin-bottom: 0.4rem;">
                        <span class="list-item-title" style="font-size: 0.9rem;">${job.brand} ${job.model} - ${job.customer}</span>
                        ${statusBadge}
                    </div>
                    
                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 0.3rem; flex-wrap: wrap; margin-bottom: 0.4rem;">
                        ${job.status === 'Collected' ? `<button class="btn btn-info btn-sm" onclick="app.confirmWarrantyStatus('${job.id}', 'Sent to SC')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">🚚 Send to SC</button>` : ''}
                        ${job.status === 'Sent to SC' ? `<button class="btn btn-purple btn-sm" onclick="app.confirmWarrantyStatus('${job.id}', 'Back from SC')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">📩 Mark Back</button>` : ''}
                        ${job.status === 'Back from SC' ? `<button class="btn btn-primary btn-sm" onclick="app.confirmWarrantyStatus('${job.id}', 'Delivered')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">🤝 Deliver</button>` : ''}
                        <button class="btn btn-outline btn-sm" onclick="app.editWarrantyRecord('${job.id}')" title="Edit Details" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">✏️</button>
                        ${job.status === 'Sent to SC' && job.repName ? `<button class="btn btn-warning btn-sm" onclick="app.sendWarrantyWhatsAppNotification('${job.id}')" title="Send WhatsApp notification to rep" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">💬 Rep</button>` : ''}
                        ${job.status === 'Back from SC' ? `<button class="btn btn-success btn-sm" onclick="app.notifyCustomerDeviceReady('${job.id}')" title="Notify customer device is ready" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">💬 Customer</button>` : ''}
                        <button class="btn btn-danger btn-sm" onclick="if(confirm('Delete this warranty record?')) app.deleteWarrantyRecord('${job.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">🗑️</button>
                    </div>
                    
                    <!-- Details Section -->
                    <div class="list-item-meta" style="font-size: 0.8rem; line-height: 1.3;">
                        <!-- IMEI and Problem - Full Width -->
                        <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.2rem 0.4rem; color: var(--text-secondary); margin-bottom: 0.2rem;">
                            <span style="font-weight: 600;">IMEI:</span>
                            <span>${job.imei || 'N/A'}</span>
                            <span style="font-weight: 600;">Problem:</span>
                            <span>${job.problem}</span>
                        </div>
                        <!-- Rep and Date - Same Row -->
                        <div style="display: flex; gap: 1rem; color: var(--text-secondary);">
                            ${job.repName ? `
                            <div style="display: flex; gap: 0.4rem;">
                                <span style="font-weight: 600;">Rep:</span>
                                <span>${job.repName}${job.repPhone ? ` (${job.repPhone})` : ''}</span>
                            </div>
                            ` : '<div></div>'}
                            <div style="display: flex; gap: 0.4rem;">
                                <span style="font-weight: 600;">Date:</span>
                                <span>${new Date(job.collectedDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }).join('');

        activeContainer.innerHTML = html;

        // Also refresh history if visible
        if (document.getElementById('warrantyHistorySection') && document.getElementById('warrantyHistorySection').style.display !== 'none') {
            this.renderManagerWarrantyHistory();
        }
    }

    handleWarrantySubmit() {
        const jobId = document.getElementById('warJobId').value;
        const isEdit = !!jobId;

        // Get brand from dropdown or custom input
        const brandSelect = document.getElementById('warBrandSelect');
        const brandCustom = document.getElementById('warBrandCustom');
        let brandName = '';

        if (brandSelect.value === '__other__') {
            brandName = brandCustom.value.trim();
            if (!brandName) {
                this.showToast('⚠️ Please enter brand name');
                return;
            }
        } else {
            brandName = brandSelect.value;
        }

        // Get model from dropdown or custom input
        const modelSelect = document.getElementById('warModelSelect');
        const modelCustom = document.getElementById('warModelCustom');
        let modelName = '';

        if (modelSelect.value === '__other__') {
            modelName = modelCustom.value.trim();
            if (!modelName) {
                this.showToast('⚠️ Please enter model name');
                return;
            }
        } else {
            modelName = modelSelect.value;
        }

        // Get problem description from dropdown or custom input
        const problemSelect = document.getElementById('warProblemSelect');
        const problemCustom = document.getElementById('warProblemCustom');
        let problemDesc = '';

        if (problemSelect.value === '__other__') {
            problemDesc = problemCustom.value.trim();
            if (!problemDesc) {
                this.showToast('⚠️ Please enter problem description');
                return;
            }
        } else {
            problemDesc = problemSelect.value;
        }

        if (isEdit) {
            // Update existing job
            const job = this.warrantyJobs.find(j => j.id === jobId);
            if (job) {
                job.customer = document.getElementById('warCustName').value;
                job.phone = document.getElementById('warCustPhone').value;
                job.brand = brandName;
                job.model = modelName;
                job.imei = document.getElementById('warIMEI').value;
                job.problem = problemDesc;

                this.saveData('warranty');
                this.showToast('✓ Warranty record updated!');
            }
        } else {
            // Create new job
            const job = {
                id: 'war_' + Date.now(),
                customer: document.getElementById('warCustName').value,
                phone: document.getElementById('warCustPhone').value,
                brand: brandName,
                model: modelName,
                imei: document.getElementById('warIMEI').value,
                problem: problemDesc,
                repName: '',
                repPhone: '',
                status: 'Collected',
                collectedDate: new Date().toISOString(),
                history: []
            };

            this.warrantyJobs.push(job);
            this.saveData('warranty');
            this.showToast('✓ Device collected and recorded!');
        }

        // Reset form
        document.getElementById('mgrWarrantyForm').reset();
        document.getElementById('warJobId').value = ''; // Clear ID
        document.getElementById('warSubmitBtn').textContent = 'Collect & Record'; // Reset button text
        document.getElementById('warProblemCustomContainer').style.display = 'none';
        document.getElementById('warBrandModelCustomContainer').style.display = 'none';

        this.populateBrandDropdown(); // Refresh brand dropdown
        this.populateModelDropdown(); // Refresh model dropdown
        this.populateProblemDropdown(); // Refresh problem dropdown
        this.renderManagerWarranty();
    }

    editWarrantyRecord(id) {
        const job = this.warrantyJobs.find(j => j.id === id);
        if (!job) return;

        // Populate form fields
        document.getElementById('warJobId').value = job.id;
        document.getElementById('warCustName').value = job.customer;
        document.getElementById('warCustPhone').value = job.phone;
        document.getElementById('warIMEI').value = job.imei || '';

        // Handle Brand
        this.populateBrandDropdown();
        const brandSelect = document.getElementById('warBrandSelect');
        const existingBrand = Array.from(brandSelect.options).find(o => o.value === job.brand);
        if (existingBrand) {
            brandSelect.value = job.brand;
            this.toggleWarrantyBrandInput(brandSelect);
        } else {
            brandSelect.value = '__other__';
            this.toggleWarrantyBrandInput(brandSelect);
            document.getElementById('warBrandCustom').value = job.brand;
        }

        // Handle Model
        this.populateModelDropdown();
        const modelSelect = document.getElementById('warModelSelect');
        const existingModel = Array.from(modelSelect.options).find(o => o.value === job.model);
        if (existingModel) {
            modelSelect.value = job.model;
            this.toggleWarrantyModelInput(modelSelect);
        } else {
            modelSelect.value = '__other__';
            this.toggleWarrantyModelInput(modelSelect);
            document.getElementById('warModelCustom').value = job.model;
        }

        // Handle Problem
        this.populateProblemDropdown();
        const problemSelect = document.getElementById('warProblemSelect');
        const existingProblem = Array.from(problemSelect.options).find(o => o.value === job.problem);
        if (existingProblem) {
            problemSelect.value = job.problem;
            this.toggleWarrantyProblemInput(problemSelect);
        } else {
            problemSelect.value = '__other__';
            this.toggleWarrantyProblemInput(problemSelect);
            document.getElementById('warProblemCustom').value = job.problem;
        }

        // Provide feedback and scroll to form
        document.getElementById('warSubmitBtn').textContent = 'Update Record';
        document.getElementById('mgrWarrantyForm').scrollIntoView({ behavior: 'smooth' });
        this.showToast('📝 Editing record...');
    }

    updateWarrantyStatus(id, newStatus) {
        const job = this.warrantyJobs.find(j => j.id === id);
        if (!job) return;

        // If status is being changed to "Sent to SC" and rep not assigned, show modal
        if (newStatus === 'Sent to SC' && !job.repName) {
            document.getElementById('repAssignWarrantyId').value = id;
            document.getElementById('warRepNameInput').value = '';
            document.getElementById('warRepPhoneInput').value = '';
            // Store the pending status for after rep assignment
            this.pendingWarrantyStatusChange = { id, newStatus };
            this.showModal('warrantyRepModal');
            return;
        }

        job.status = newStatus;
        job.history.push({ status: newStatus, date: new Date().toISOString() });

        if (newStatus === 'Delivered') {
            job.deliveryDate = new Date().toISOString();
        }

        this.saveData('warranty');
        this.showToast(`✓ Status updated: ${newStatus}`);
        this.renderManagerWarranty();
    }

    deleteWarrantyRecord(id) {
        if (!confirm('Are you sure you want to delete this warranty record?')) return;
        this.warrantyJobs = this.warrantyJobs.filter(j => j.id !== id);
        this.saveData('warranty');
        this.renderManagerWarranty();
    }

    // Toggle problem description input based on dropdown selection
    toggleWarrantyProblemInput(selectElement) {
        const customContainer = document.getElementById('warProblemCustomContainer');
        const customInput = document.getElementById('warProblemCustom');

        if (selectElement.value === '__other__') {
            customContainer.style.display = 'block';
            customInput.required = true;
        } else {
            customContainer.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    // Toggle brand custom input
    toggleWarrantyBrandInput(selectElement) {
        const mainContainer = document.getElementById('warBrandModelCustomContainer');
        const customContainer = document.getElementById('warBrandCustomContainer');
        const customInput = document.getElementById('warBrandCustom');

        if (selectElement.value === '__other__') {
            mainContainer.style.display = 'flex';
            customContainer.style.display = 'block';
            customInput.required = true;
        } else {
            const modelSelect = document.getElementById('warModelSelect');
            if (modelSelect.value !== '__other__') {
                mainContainer.style.display = 'none';
            }
            customContainer.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    // Toggle model custom input
    toggleWarrantyModelInput(selectElement) {
        const mainContainer = document.getElementById('warBrandModelCustomContainer');
        const customContainer = document.getElementById('warModelCustomContainer');
        const customInput = document.getElementById('warModelCustom');

        if (selectElement.value === '__other__') {
            mainContainer.style.display = 'flex';
            customContainer.style.display = 'block';
            customInput.required = true;
        } else {
            const brandSelect = document.getElementById('warBrandSelect');
            if (brandSelect.value !== '__other__') {
                mainContainer.style.display = 'none';
            }
            customContainer.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    // Get unique problem descriptions from warranty history
    getProblemHistory() {
        const problems = this.warrantyJobs
            .map(j => j.problem)
            .filter(p => p && p.trim() !== '');
        return [...new Set(problems)].sort();
    }

    // Get unique brands from warranty history
    getBrandHistory() {
        const brands = this.warrantyJobs
            .map(j => j.brand)
            .filter(b => b && b.trim() !== '');
        return [...new Set(brands)].sort();
    }

    // Get unique models from warranty history
    getModelHistory() {
        const models = this.warrantyJobs
            .map(j => j.model)
            .filter(m => m && m.trim() !== '');
        return [...new Set(models)].sort();
    }

    // Populate brand dropdown with historical brands
    populateBrandDropdown() {
        const select = document.getElementById('warBrandSelect');
        if (!select) return;

        const brands = this.getBrandHistory();

        let optionsHTML = '<option value="">-- Select Brand --</option>';
        brands.forEach(brand => {
            optionsHTML += `<option value="${brand}">${brand}</option>`;
        });
        optionsHTML += '<option value="__other__">🆕 Other (type new)</option>';

        select.innerHTML = optionsHTML;
    }

    // Populate model dropdown with historical models
    populateModelDropdown() {
        const select = document.getElementById('warModelSelect');
        if (!select) return;

        const models = this.getModelHistory();

        let optionsHTML = '<option value="">-- Select Model --</option>';
        models.forEach(model => {
            optionsHTML += `<option value="${model}">${model}</option>`;
        });
        optionsHTML += '<option value="__other__">🆕 Other (type new)</option>';

        select.innerHTML = optionsHTML;
    }

    // Populate problem dropdown with historical problems
    populateProblemDropdown() {
        const select = document.getElementById('warProblemSelect');
        if (!select) return;

        const problems = this.getProblemHistory();

        // Keep the default and "Other" options, insert history in between
        let optionsHTML = '<option value="">-- Select Problem --</option>';

        problems.forEach(problem => {
            optionsHTML += `<option value="${problem}">${problem}</option>`;
        });

        optionsHTML += '<option value="__other__">🆕 Other (type new)</option>';

        select.innerHTML = optionsHTML;
    }

    // Save warranty rep info from modal
    saveWarrantyRepInfo() {
        const id = document.getElementById('repAssignWarrantyId').value;
        const repName = document.getElementById('warRepNameInput').value.trim();
        const repPhone = document.getElementById('warRepPhoneInput').value.trim();

        if (!repName || !repPhone) {
            this.showToast('⚠️ Please fill all rep details');
            return;
        }

        const job = this.warrantyJobs.find(j => j.id === id);
        if (!job) return;

        job.repName = repName;
        job.repPhone = repPhone;

        this.closeModal('warrantyRepModal');

        // Now proceed with the status change
        if (this.pendingWarrantyStatusChange) {
            const { newStatus } = this.pendingWarrantyStatusChange;
            job.status = newStatus;
            job.history.push({ status: newStatus, date: new Date().toISOString() });
            this.pendingWarrantyStatusChange = null;
        }

        this.saveData('warranty');
        this.showToast('✓ Rep assigned and status updated!');
        this.renderManagerWarranty();
    }

    // Send WhatsApp notification to rep
    sendWarrantyWhatsAppNotification(id) {
        const job = this.warrantyJobs.find(j => j.id === id);
        if (!job || !job.repPhone) return;

        // Format phone number (remove leading 0, add 94 for Sri Lanka)
        let phone = job.repPhone.replace(/\D/g, ''); // Remove non-digits
        if (phone.startsWith('0')) {
            phone = '94' + phone.substring(1);
        }

        // Calculate days since sent to SC
        const sentHistory = job.history.find(h => h.status === 'Sent to SC');
        let daysCount = 0;
        if (sentHistory) {
            const sentDate = new Date(sentHistory.date);
            const today = new Date();
            const diffTime = Math.abs(today - sentDate);
            daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const message = `Hi ${job.repName}, device ${job.brand} ${job.model} for customer ${job.customer} has been sent to service center.

IMEI: ${job.imei}
Problem: ${job.problem}
Days at SC: ${daysCount} day${daysCount !== 1 ? 's' : ''}

We'll notify you when it's back.`;

        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    // Notify customer that device is ready for collection
    notifyCustomerDeviceReady(id) {
        const job = this.warrantyJobs.find(j => j.id === id);
        if (!job || !job.phone) return;

        // Format phone number (remove leading 0, add 94 for Sri Lanka)
        let phone = job.phone.replace(/\D/g, ''); // Remove non-digits
        if (phone.startsWith('0')) {
            phone = '94' + phone.substring(1);
        }

        const message = `Hi ${job.customer}, your device ${job.brand} ${job.model} is back from service center and ready for collection!

IMEI: ${job.imei}
Problem: ${job.problem}

Please visit our shop to collect your device.
Thank you!`;

        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    confirmWarrantyStatus(id, newStatus) {
        const job = this.warrantyJobs.find(j => j.id === id);
        if (!job) return;

        // Special handling for "Sent to SC" - check if rep is assigned
        if (newStatus === 'Sent to SC' && !job.repName) {
            // Show rep assignment modal directly
            document.getElementById('repAssignWarrantyId').value = id;
            document.getElementById('warRepNameInput').value = '';
            document.getElementById('warRepPhoneInput').value = '';
            this.pendingWarrantyStatusChange = { id, newStatus };
            this.showModal('warrantyRepModal');
            return;
        }

        // Standard confirmation for other status changes
        document.getElementById('pendingWarrantyId').value = id;
        document.getElementById('pendingWarrantyStatus').value = newStatus;
        document.getElementById('warrantyStatusMsg').textContent = `Are you sure you want to update status to "${newStatus}"?`;
        this.showModal('warrantyStatusModal');
    }

    processWarrantyStatusUpdate() {
        const id = document.getElementById('pendingWarrantyId').value;
        const newStatus = document.getElementById('pendingWarrantyStatus').value;

        if (id && newStatus) {
            this.updateWarrantyStatus(id, newStatus);
            this.closeModal('warrantyStatusModal');
        }
    }

    // ===== DATA BACKUP & RESTORE =====
    handleExportData() {
        const data = {
            settings: this.settings,
            users: this.users,
            stock: this.stock,
            sales: this.sales,
            repairs: this.repairJobs,
            vendors: this.vendors,
            purchases: this.purchases,
            expenses: this.expenses,
            customerCredits: this.customerCredits,
            vendorDebt: this.vendorDebt,
            warrantyJobs: this.warrantyJobs,
            exportDate: new Date().toISOString(),
            version: '1.2.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `starcity_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast('✓ Backup file created');
    }

    handleImportData(data) {
        if (!data.settings || !data.stock || !data.users) {
            this.showToast('Error: Incompatible backup file');
            return;
        }

        if (confirm('Importing will overwrite all current data. Proceed?')) {
            localStorage.setItem('starcity_settings', JSON.stringify(data.settings));
            localStorage.setItem('starcity_users', JSON.stringify(data.users));
            localStorage.setItem('starcity_stock', JSON.stringify(data.stock));
            localStorage.setItem('starcity_sales', JSON.stringify(data.sales || []));
            localStorage.setItem('starcity_repairs', JSON.stringify(data.repairs || data.repairJobs || []));
            localStorage.setItem('starcity_vendors', JSON.stringify(data.vendors || []));
            localStorage.setItem('starcity_purchases', JSON.stringify(data.purchases || []));
            localStorage.setItem('starcity_expenses', JSON.stringify(data.expenses || []));
            localStorage.setItem('starcity_customer_credits', JSON.stringify(data.customerCredits || []));
            localStorage.setItem('starcity_vendor_debt', JSON.stringify(data.vendorDebt || []));

            this.showToast('✓ Data restored successfully! Reloading...');
            setTimeout(() => window.location.reload(), 1500);
        }
    }


    saveSettings() {
        localStorage.setItem('starcity_settings', JSON.stringify(this.settings));
    }

    handlePasswordChange() {
        const oldPass = document.getElementById('oldPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        if (oldPass !== this.currentUser.password) {
            this.showToast('❌ Current password incorrect');
            return;
        }

        if (newPass !== confirmPass) {
            this.showToast('❌ New passwords do not match');
            return;
        }

        if (newPass.length < 4) {
            this.showToast('❌ Password too short (min 4 chars)');
            return;
        }

        // Update in users array
        const user = this.users.find(u => u.id === this.currentUser.id);
        if (user) {
            user.password = newPass;
            this.currentUser.password = newPass;
            this.saveData('users');
            document.getElementById('passwordForm').reset();
            this.showToast('✓ Password changed successfully!');
        }
    }

    // ===== MANAGER USER MANAGEMENT =====
    renderManagerUsers() {
        const container = document.getElementById('mgrUsersList');
        if (!container) return;

        const html = this.users.map(user => {
            const isSelf = this.currentUser && this.currentUser.id === user.id;
            return `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${user.name} ${isSelf ? '(You)' : ''}</span>
                        <span class="badge ${user.active ? 'badge-approved' : 'badge-pending'}">${user.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div class="list-item-meta">
                        <span>@${user.username} • Role: ${user.role}</span>
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button class="btn btn-outline btn-sm" onclick="app.editUser('${user.id}')">✏️ Edit</button>
                            ${!isSelf ? `<button class="btn ${user.active ? 'btn-outline' : 'btn-success'} btn-sm" onclick="app.toggleUserStatus('${user.id}')">
                                ${user.active ? '🔒 Deactivate' : '🔓 Activate'}
                            </button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html || '<div class="empty-state"><p>No users found</p></div>';
    }

    // ===== CREDIT MANAGEMENT =====
    switchCreditTab(tab) {
        document.getElementById('customerCreditsSection').style.display = tab === 'customer' ? 'block' : 'none';
        document.getElementById('vendorCreditsSection').style.display = tab === 'vendor' ? 'block' : 'none';

        document.getElementById('btnCustomerTab').classList.toggle('active', tab === 'customer');
        document.getElementById('btnVendorTab').classList.toggle('active', tab === 'vendor');

        const activeStyle = { background: 'var(--primary)', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
        const inactiveStyle = { background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' };

        Object.assign(document.getElementById('btnCustomerTab').style, tab === 'customer' ? activeStyle : inactiveStyle);
        Object.assign(document.getElementById('btnVendorTab').style, tab === 'vendor' ? activeStyle : inactiveStyle);
    }

    renderManagerCredits() {
        this.renderCustomerCredits();
        this.renderVendorCredits();

        // Calculate customer total
        const customerTotal = this.customerCredits.reduce((sum, c) => sum + (c.balance || 0), 0);

        // Calculate vendor total
        let vendorTotal = 0;
        this.vendors.forEach(vendor => {
            const debtEntries = this.vendorDebt.filter(d => String(d.vendorId) === String(vendor.id));
            const activeDebtTotal = debtEntries.reduce((sum, d) => sum + d.amount, 0);
            vendorTotal += (vendor.balance || 0) + activeDebtTotal;
        });

        // Update customer total badge
        const customerBadge = document.getElementById('customerTotalBadge');
        if (customerBadge) {
            customerBadge.textContent = this.formatCurrency(customerTotal);
            customerBadge.className = customerTotal > 0 ? 'badge badge-success' : 'badge badge-approved';
            customerBadge.style.fontSize = '0.85rem';
        }

        // Update vendor total badge
        const vendorBadge = document.getElementById('vendorTotalBadge');
        if (vendorBadge) {
            vendorBadge.textContent = this.formatCurrency(vendorTotal);
            vendorBadge.className = vendorTotal > 0 ? 'badge badge-warning' : 'badge badge-approved';
            vendorBadge.style.fontSize = '0.85rem';
        }
    }

    renderCustomerCredits() {
        const container = document.getElementById('mgrCustomerCreditsList');
        if (!container) return;

        const html = this.customerCredits.map(credit => `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="list-item-title">${credit.customerName}</span>
                    <span class="badge ${credit.balance > 0 ? 'badge-pending' : 'badge-approved'}">
                        ${credit.balance > 0 ? 'Owes ' + this.formatCurrency(credit.balance) : 'Paid'}
                    </span>
                </div>
                <div class="list-item-meta">
                    <span>${credit.phone || 'No phone'} • Last activity: ${credit.lastUpdated ? new Date(credit.lastUpdated).toLocaleDateString() : 'N/A'}</span>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <button class="btn btn-info btn-sm" onclick='app.showCreditHistory(${JSON.stringify(credit).replace(/'/g, "&#39;")}, "${credit.customerName}")'>📜 History</button>
                        <button class="btn btn-primary btn-sm" onclick="app.showCustomerPaymentModal('${credit.id}')">💸 Record Payment</button>
                        ${credit.phone ? `<button class="btn btn-warning btn-sm" onclick='app.sendCreditWhatsApp("${credit.id}", "customer")'>💬 Remind</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html || '<div class="empty-state">No customer credits yet</div>';
    }

    renderVendorCredits() {
        const container = document.getElementById('mgrVendorCreditsList');
        if (!container) return;

        if (this.vendors.length === 0) {
            container.innerHTML = '<div class="empty-state">No vendors found. Add a vendor to track credits.</div>';
            return;
        }

        const html = this.vendors.map(vendor => {
            // Debt is sum of initial vendor balance + added vendor debt entries
            const debtEntries = this.vendorDebt.filter(d => String(d.vendorId) === String(vendor.id));
            const activeDebtTotal = debtEntries.reduce((sum, d) => sum + d.amount, 0);
            const totalDebt = (vendor.balance || 0) + activeDebtTotal;

            return `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${vendor.name}</span>
                        <span class="badge ${totalDebt > 0 ? 'badge-pending' : 'badge-approved'}">
                            ${totalDebt > 0 ? 'Balance: ' + this.formatCurrency(totalDebt) : 'Clear'}
                        </span>
                    </div>
                    <div class="list-item-meta">
                        <span>${vendor.phone || 'No phone'} • ${vendor.contact || ''}</span>
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <button class="btn btn-info btn-sm" onclick="app.showVendorHistory('${vendor.id}')">📜 History</button>
                            <button class="btn btn-outline btn-sm" onclick="app.showVendorPurchaseModal('${vendor.id}')">➕ Purchase</button>
                            ${totalDebt > 0 ? `<button class="btn btn-success btn-sm" onclick="app.showVendorPaymentModal('${vendor.id}')">💳 Pay Vendor</button>` : ''}
                            ${vendor.phone ? `<button class="btn btn-warning btn-sm" onclick="app.sendCreditWhatsApp('${vendor.id}', 'vendor')">💬 Notify</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    showVendorHistory(vendorId) {
        const vendor = this.vendors.find(v => String(v.id) === String(vendorId));
        if (!vendor) return;

        const debtEntries = this.vendorDebt.filter(d => String(d.vendorId) === String(vendorId));

        // Construct history object compatible with showCreditHistory
        const historyData = {
            history: debtEntries.map(d => ({
                date: d.date,
                type: d.product || (d.amount < 0 ? 'Payment' : 'Purchase'),
                amount: d.amount
            }))
        };

        this.showCreditHistory(historyData, vendor.name);
    }

    showManualCreditModal() {
        this.showModal('manualCreditModal');
    }

    handleManualCreditSubmit(e) {
        e.preventDefault();
        const name = document.getElementById('manCredName').value;
        const phone = document.getElementById('manCredPhone').value;
        const amount = parseFloat(document.getElementById('manCredAmount').value);
        const reason = document.getElementById('manCredReason').value || 'Manual Entry';

        if (amount > 0) {
            this.addCustomerCredit(name, phone, amount, reason);
            this.showToast('✓ Customer credit recorded!');
            this.closeModal('manualCreditModal');
            document.getElementById('manualCreditForm').reset();
            this.render();
        }
    }

    addCustomerCredit(name, phone, amount, reason = 'Credit Sale') {
        let credit = this.customerCredits.find(c => c.customerName === name);
        if (!credit) {
            credit = { id: 'debt_' + Date.now(), customerName: name, phone: phone, balance: 0, history: [] };
            this.customerCredits.push(credit);
        }
        credit.balance += amount;
        credit.history.push({ date: new Date().toISOString(), type: reason, amount: amount });
        credit.lastUpdated = new Date().toISOString();
        this.saveData('customer_credits');
    }

    showCustomerPaymentModal(id) {
        document.getElementById('paymentCustomerId').value = id;
        this.showModal('customerPaymentModal');
    }

    handleCustomerPayment(e) {
        if (e) e.preventDefault();
        const id = document.getElementById('paymentCustomerId').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const credit = this.customerCredits.find(c => c.id === id);

        if (credit && amount > 0) {
            credit.balance -= amount;
            credit.history.push({ date: new Date().toISOString(), type: 'Payment Received', amount: -amount });
            credit.lastUpdated = new Date().toISOString();
            this.saveData('customer_credits');
            this.closeModal('customerPaymentModal');
            this.showToast('✓ Payment recorded');
            this.renderManagerCredits();
        }
    }

    showVendorPurchaseModal(id) {
        document.getElementById('purchaseVendorId').value = id;
        this.showModal('addVendorPurchaseModal');
    }

    handleVendorPurchase(e) {
        if (e) e.preventDefault();
        const vendorId = document.getElementById('purchaseVendorId').value;
        const product = document.getElementById('purchaseProduct').value;
        const amount = parseFloat(document.getElementById('purchaseAmount').value);
        const date = document.getElementById('purchaseDate').value;

        if (amount > 0) {
            this.vendorDebt.push({
                id: 'vd_' + Date.now(),
                vendorId: vendorId,
                product: product,
                amount: amount,
                dueDate: date,
                date: new Date().toISOString()
            });
            this.saveData('vendor_debt');
            this.closeModal('addVendorPurchaseModal');
            this.showToast('✓ Purchase recorded on credit');
            this.renderManagerCredits();
        }
    }

    showVendorPaymentModal(id) {
        document.getElementById('vPaymentVendorId').value = id;
        this.showModal('vendorPaymentModal');
    }

    handleVendorPayment(e) {
        if (e) e.preventDefault();
        const vendorId = document.getElementById('vPaymentVendorId').value;
        const amount = parseFloat(document.getElementById('vPaymentAmount').value);

        if (amount > 0) {
            // Subtract from total debt (simplified for this app)
            this.vendorDebt.push({
                id: 'vp_' + Date.now(),
                vendorId: vendorId,
                product: 'Payment to Vendor',
                amount: -amount,
                date: new Date().toISOString()
            });
            this.saveData('vendor_debt');
            this.closeModal('vendorPaymentModal');
            this.showToast('✓ Payment to vendor recorded');
            this.renderManagerCredits();
        }
    }

    handleVendorSubmit(e) {
        if (e) e.preventDefault();
        const name = document.getElementById('vendorName').value;
        const phone = document.getElementById('vendorPhone').value;

        this.vendors.push({
            id: 'v_' + Date.now(),
            name: name,
            phone: phone
        });
        this.saveData('vendors');
        this.closeModal('addVendorModal');
        this.showToast('✓ Vendor added');
        this.renderManagerCredits();
    }

    // ===== WARRANTY MANAGEMENT =====
    switchWarrantyTab(tab) {
        document.getElementById('warrantyActiveSection').style.display = tab === 'active' ? 'block' : 'none';
        document.getElementById('warrantyHistorySection').style.display = tab === 'history' ? 'block' : 'none';

        document.getElementById('btnWarrantyActiveTab').classList.toggle('active', tab === 'active');
        document.getElementById('btnWarrantyHistoryTab').classList.toggle('active', tab === 'history');

        const activeStyle = { background: 'var(--primary)', color: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };
        const inactiveStyle = { background: 'transparent', color: 'var(--text-muted)', boxShadow: 'none' };

        Object.assign(document.getElementById('btnWarrantyActiveTab').style, tab === 'active' ? activeStyle : inactiveStyle);
        Object.assign(document.getElementById('btnWarrantyHistoryTab').style, tab === 'history' ? activeStyle : inactiveStyle);

        if (tab === 'history') {
            this.renderManagerWarrantyHistory();
        }
    }

    renderManagerWarrantyHistory() {
        const container = document.getElementById('mgrWarrantyHistoryList');
        if (!container) return;

        // Show all warranty jobs, sorted by most recent first
        const sortedJobs = [...this.warrantyJobs]
            .sort((a, b) => new Date(b.collectedDate) - new Date(a.collectedDate));

        const html = sortedJobs.length === 0 ?
            '<div class="empty-state">No warranty history found</div>' :
            sortedJobs.map(job => {
                const statusBadges = {
                    'Collected': 'badge-pending',
                    'Sent to SC': 'badge-warning',
                    'Back from SC': 'badge-primary',
                    'Delivered': 'badge-success'
                };
                const badgeClass = statusBadges[job.status] || 'badge-pending';

                return `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${job.customer} - ${job.brand} ${job.model}</span>
                        <span class="badge ${badgeClass}">${job.status}</span>
                    </div>
                    <div class="list-item-meta">
                        <div style="margin-bottom: 0.25rem;">
                            <strong>IMEI:</strong> ${job.imei || 'N/A'}
                        </div>
                        <div style="margin-bottom: 0.25rem;">
                            <strong>Problem:</strong> ${job.problem}
                        </div>
                        <div style="margin-bottom: 0.25rem;">
                            <strong>Collected:</strong> ${new Date(job.collectedDate).toLocaleDateString()}
                        </div>
                        ${job.deliveryDate ? `<div style="margin-bottom: 0.25rem;">
                            <strong>Delivered:</strong> ${new Date(job.deliveryDate).toLocaleDateString()}
                        </div>` : ''}
                        ${job.repName ? `<div style="font-size: 0.85rem; color: var(--text-muted);">
                            Rep: ${job.repName}
                        </div>` : ''}
                    </div>
                </div>
            `}).join('');

        container.innerHTML = html;
    }

    openUserModal(userId = null) {
        const modal = document.getElementById('userModal');
        const title = document.getElementById('userModalTitle');
        const form = document.getElementById('userForm');
        const passwordInput = document.getElementById('userPassword');

        form.reset();
        document.getElementById('editUserId').value = '';
        passwordInput.required = true; // Reset to required

        if (userId) {
            const user = this.users.find(u => u.userid === userId || u.username === userId);
            if (user) {
                title.textContent = 'Edit User';
                document.getElementById('editUserId').value = user.userid || user.username;
                document.getElementById('userUsername').value = user.username;
                document.getElementById('userName').value = user.fullname;
                document.getElementById('userRole').value = user.role;
                document.getElementById('userPhone').value = user.phone || '';
                // Make password optional when editing
                passwordInput.required = false;
                passwordInput.placeholder = 'Leave blank to keep existing password';
            }
        } else {
            title.textContent = 'Add New User';
            passwordInput.placeholder = 'Enter password';
        }

        this.showModal('userModal');
    }

    handleUserSubmit() {
        const editId = document.getElementById('editUserId').value;
        const password = document.getElementById('userPassword').value;

        const userData = {
            fullname: document.getElementById('userName').value,
            username: document.getElementById('userUsername').value,
            role: document.getElementById('userRole').value,
            phone: document.getElementById('userPhone').value,
            active: true
        };

        if (editId) {
            // Editing existing user
            const index = this.users.findIndex(u => u.userid === editId || u.username === editId);
            if (index !== -1) {
                // Keep existing ID and password if not changed
                userData.userid = this.users[index].userid;
                userData.password = password ? password : this.users[index].password;

                // Update current user if editing self
                if (this.currentUser && (this.currentUser.userid === editId || this.currentUser.username === editId)) {
                    Object.assign(this.currentUser, userData);
                }
                this.users[index] = userData;
                this.showToast('✓ User updated successfully!');
            }
        } else {
            // Adding new user
            if (this.users.some(u => u.username === userData.username)) {
                this.showToast('❌ Username already exists!');
                return;
            }
            if (!password) {
                this.showToast('❌ Password is required for new users!');
                return;
            }
            userData.userid = 'user_' + Date.now();
            userData.password = password;
            this.users.push(userData);
            this.showToast('✓ User created successfully!');
        }

        this.saveData('users');
        this.closeModal('userModal');
        this.renderUsers();
    }

    renderUsers() {
        const container = document.getElementById('mgrUsersList');
        if (!container) return;

        const html = this.users.length === 0 ?
            '<div class="empty-state">No users found</div>' :
            this.users.map(user => {
                const roleBadge = user.role === 'manager' ?
                    '<span class="badge badge-primary">Manager</span>' :
                    '<span class="badge badge-info" style="background: #3b82f6;">Technician</span>';

                const statusBadge = user.active ?
                    '<span class="badge badge-success">Active</span>' :
                    '<span class="badge" style="background: #6b7280; color: white;">Inactive</span>';

                return `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${user.fullname} (@${user.username})</span>
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            ${roleBadge}
                            ${statusBadge}
                        </div>
                    </div>
                    <div class="list-item-meta">
                        <div style="margin-bottom: 0.5rem; color: var(--text-primary);">
                            ${user.phone ? `📱 ${user.phone}` : ''}
                        </div>
                        <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                            <button class="btn btn-info btn-sm" onclick="app.openUserModal('${user.userid || user.username}')">✏️ Edit</button>
                            <button class="btn ${user.active ? 'btn-warning' : 'btn-success'} btn-sm" 
                                onclick="app.toggleUserStatus('${user.userid || user.username}')">
                                ${user.active ? '🚫 Deactivate' : '✅ Activate'}
                            </button>
                        </div>
                    </div>
                </div>
            `}).join('');

        container.innerHTML = html;
    }

    editUser(userId) {
        this.openUserModal(userId);
    }

    toggleUserStatus(userId) {
        const user = this.users.find(u => String(u.userid) === String(userId));
        if (user) {
            user.active = !user.active;
            this.saveData('users');
            this.render();
            this.showToast(`User ${user.active ? 'activated' : 'deactivated'}`);
        }
    }

    // ===== END OF CLASS =====
    showAddVendorModal() {
        document.getElementById('addVendorForm').reset();
        this.showModal('addVendorModal');
    }


    sendCreditWhatsApp(id, type) {
        const isCustomer = type === 'customer';
        let record, name, phone, balance;
        let lastPaymentInfo = 'No payments recorded yet';

        if (isCustomer) {
            record = this.customerCredits?.find(c => c.id === id);
            if (!record) return;
            name = record.customerName;
            phone = record.phone;
            balance = this.formatCurrency(record.balance);

            const lastPayment = record.history?.slice().reverse().find(h =>
                h.type === 'Payment Received' || h.type === 'Payment Made'
            );
            if (lastPayment) {
                lastPaymentInfo = `Last Payment: ${this.formatCurrency(Math.abs(lastPayment.amount))} on ${new Date(lastPayment.date).toLocaleDateString()}`;
            }
        } else {
            // Vendor logic
            record = this.vendors?.find(v => String(v.id) === String(id));
            if (!record) return;
            name = record.name;
            phone = record.phone;

            // Calculate balance from vendorDebt
            const debtEntries = this.vendorDebt.filter(d => String(d.vendorId) === String(id));
            const activeDebtTotal = debtEntries.reduce((sum, d) => sum + d.amount, 0);
            const totalDebt = (record.balance || 0) + activeDebtTotal;
            balance = this.formatCurrency(totalDebt);

            // Find last payment
            // payments are negative amounts or type 'payment'
            const payments = debtEntries.filter(d => d.amount < 0 || d.type === 'payment').sort((a, b) => new Date(b.date) - new Date(a.date));
            if (payments.length > 0) {
                const lastPayment = payments[0];
                lastPaymentInfo = `Last Payment: ${this.formatCurrency(Math.abs(lastPayment.amount))} on ${new Date(lastPayment.date).toLocaleDateString()}`;
            }
        }

        if (!phone) {
            this.showToast('❌ No phone number available');
            return;
        }

        // Format phone number
        let phoneNum = phone.replace(/\D/g, '');
        if (phoneNum.startsWith('0')) phoneNum = '94' + phoneNum.substring(1);

        const message = isCustomer ?
            `Dear ${name},%0A%0A` +
            `This is a friendly reminder about your pending balance at ${this.settings.shopName}.%0A%0A` +
            `💳 Current Balance: ${balance}%0A` +
            `📅 ${lastPaymentInfo}%0A%0A` +
            `Please arrange payment at your earliest convenience.%0A%0A` +
            `Thank you!%0A${this.settings.shopName}` :
            `Dear ${name},%0A%0A` +
            `Payment notification from ${this.settings.shopName}:%0A%0A` +
            `💰 Amount Owed: ${balance}%0A` +
            `📅 ${lastPaymentInfo}%0A%0A` +
            `We will arrange payment soon.%0A%0A` +
            `Thank you!`;

        window.open(`https://wa.me/${phoneNum}?text=${message}`, '_blank');
    }

    // ===== TECHNICIAN DASHBOARD =====
    renderTechDashboard() {
        const myJobs = this.repairJobs.filter(j => j.technician === this.currentUser.name);
        const thisMonth = myJobs.filter(j => {
            const d = new Date(j.dateSubmitted);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const pending = myJobs.filter(j => j.status === 'Completed').length;
        const approved = thisMonth.filter(j => j.status === 'Approved');
        const totalCommission = approved.reduce((sum, j) => sum + j.commission, 0);

        document.getElementById('techMonthlyJobs').textContent = thisMonth.length;
        document.getElementById('techPendingJobs').textContent = pending;
        document.getElementById('techCommission').textContent = this.formatCurrency(totalCommission);
        document.getElementById('techApprovedJobs').textContent = approved.length;
        document.getElementById('techNotificationBadge').textContent = approved.filter(j => !j.seenByTech).length;

        // Recent jobs
        const recent = [...myJobs].sort((a, b) => new Date(b.dateSubmitted) - new Date(a.dateSubmitted)).slice(0, 5);
        const jobsHtml = recent.length === 0 ?
            '<div class="empty-state"><div class="empty-state-icon">🔧</div><p>No jobs yet</p></div>' :
            recent.map(job => this.renderJobCard(job)).join('');

        document.getElementById('techRecentJobs').innerHTML = jobsHtml;
    }

    renderTechJobs() {
        const myJobs = this.repairJobs.filter(j => j.technician === this.currentUser.name);
        const sorted = [...myJobs].sort((a, b) => new Date(b.dateSubmitted) - new Date(a.dateSubmitted));

        const html = sorted.length === 0 ?
            '<div class="empty-state"><div class="empty-state-icon">🔧</div><p>No jobs yet</p></div>' :
            sorted.map(job => this.renderJobCard(job, true)).join('');

        document.getElementById('techAllJobs').innerHTML = html;
    }

    filterTechJobs(filter) {
        const buttons = document.querySelectorAll('#techJobsView .filter-btn');
        buttons.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const myJobs = this.repairJobs.filter(j => j.technician === this.currentUser.name);
        const filtered = filter === 'all' ? myJobs : myJobs.filter(j => j.status === filter);
        const sorted = [...filtered].sort((a, b) => new Date(b.dateSubmitted) - new Date(a.dateSubmitted));

        const html = sorted.length === 0 ?
            '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No jobs found</p></div>' :
            sorted.map(job => this.renderJobCard(job, true)).join('');

        document.getElementById('techAllJobs').innerHTML = html;
    }

    renderJobCard(job, showDetails = false) {
        const statusClass = job.status === 'Approved' ? 'approved' : job.status === 'Completed' ? 'completed' : 'pending';
        const isTechView = this.currentScreen === 'technician';
        const isMyJob = isTechView && job.technician === this.currentUser.name;
        const canMarkCompleted = isMyJob && job.status === 'Pending';

        return `
            <div class="job-card">
                <div class="job-header">
                    <div>
                        <div class="job-title">Job #${job.id}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">
                            ${job.customer} - ${job.phone}
                        </div>
                    </div>
                    <span class="badge badge-${statusClass}">${job.status}</span>
                </div>
                <div class="job-meta">
                    <span>${job.brand} ${job.model}</span>
                    <span>${this.formatDate(new Date(job.dateSubmitted))}</span>
                </div>
                ${showDetails ? `
                    <div class="job-details">
                        <p><strong>Problem:</strong> ${job.problem}</p>
                        <p><strong>Cost:</strong> ${this.formatCurrency(job.cost)}</p>
                        ${job.status === 'Approved' ? `<p><strong>Commission:</strong> <span style="color: var(--success);">${this.formatCurrency(job.commission)}</span></p>` : ''}
                    </div>
                ` : ''}
                ${canMarkCompleted ? `
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                        <button class="btn btn-success btn-sm btn-block" onclick="app.markJobCompleted(${job.id})">
                            ✓ Mark as Completed
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    handleNewRepairJob() {
        const job = {
            id: Date.now(),
            dateSubmitted: new Date().toISOString(),
            technician: this.currentUser.name,
            customer: document.getElementById('techJobCustomer').value,
            phone: document.getElementById('techJobPhone').value,
            brand: document.getElementById('techJobBrand').value,
            model: document.getElementById('techJobModel').value,
            problem: document.getElementById('techJobProblem').value,
            cost: parseFloat(document.getElementById('techJobCost').value),
            parts: document.getElementById('techJobParts').value,
            status: document.getElementById('techJobStatus').value,
            dateCompleted: document.getElementById('techJobStatus').value === 'Completed' ? new Date().toISOString() : null,
            approvedBy: null,
            approvalDate: null,
            commission: 0
        };

        this.repairJobs.push(job);
        this.saveData('repairs');

        this.showToast(`✓ Job #${job.id} submitted successfully!`);
        document.getElementById('techNewJobForm').reset();
        this.render();
    }

    markJobCompleted(jobId) {
        const job = this.repairJobs.find(j => j.id === jobId);
        if (!job) return;

        // Only allow technicians to mark their own pending jobs as completed
        if (this.currentScreen === 'technician' && job.technician === this.currentUser.name && job.status === 'Pending') {
            job.status = 'Completed';
            job.dateCompleted = new Date().toISOString();
            this.saveData('repairs');
            this.showToast(`✅ Job #${jobId} marked as completed!\nNow awaiting manager approval.`, 'success', true);
            this.render();
        }
    }

    renderTechEarnings() {
        const myJobs = this.repairJobs.filter(j => j.technician === this.currentUser.name);
        const thisMonth = myJobs.filter(j => {
            const d = new Date(j.dateSubmitted);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const approved = thisMonth.filter(j => j.status === 'Approved');
        const pending = thisMonth.filter(j => j.status === 'Completed').length;
        const totalCommission = approved.reduce((sum, j) => sum + j.commission, 0);

        document.getElementById('techTotalCommission').textContent = this.formatCurrency(totalCommission);
        document.getElementById('techApprovedCount').textContent = approved.length;
        document.getElementById('techPendingCount').textContent = pending;

        const html = approved.length === 0 ?
            '<div class="empty-state"><p>No approved jobs this month</p></div>' :
            approved.map(job => this.renderJobCard(job, true)).join('');

        document.getElementById('techApprovedJobsList').innerHTML = html;
    }

    // ===== UTILITY FUNCTIONS =====
    getPendingApprovals() {
        return (this.repairJobs || []).filter(j => j.status === 'Completed');
    }

    getSalesToday() {
        return this.sales.filter(s => this.isSameDay(new Date(s.date), new Date())).reduce((sum, s) => sum + s.total, 0);
    }

    getSalesThisMonth() {
        const now = new Date();
        return this.sales.filter(s => {
            const d = new Date(s.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce((sum, s) => sum + s.total, 0);
    }

    getRepairRevenueThisMonth() {
        const now = new Date();
        return this.repairJobs.filter(j => {
            const d = new Date(j.dateSubmitted);
            return j.status === 'Approved' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce((sum, j) => sum + j.cost, 0);
    }

    getVendorDues() {
        let total = 0;
        this.vendors.forEach(v => {
            const activeDebtTotal = this.vendorDebt.filter(d => String(d.vendorId) === String(v.id)).reduce((sum, d) => sum + d.amount, 0);
            total += (v.balance || 0) + activeDebtTotal;
        });
        return total;
    }

    getCustomerDues() {
        return this.customerCredits.reduce((sum, c) => sum + (c.balance || 0), 0);
    }

    isSameDay(d1, d2) {
        return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
    }

    formatCurrency(amount) {
        const val = parseFloat(amount) || 0;
        return `${this.currency} ${val.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }

    formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    populateProductList() {
        const html = this.stock.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
        const list = document.getElementById('mgrProductList');
        if (list) list.innerHTML = html;
    }

    showModal(id) {
        document.getElementById(id).classList.add('active');
    }

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    }

    showToast(message, type = 'default', premium = false) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} ${premium ? 'toast-premium' : ''}`;

        // Add icon based on type
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️',
            default: '📌'
        };

        if (premium) {
            // Premium multi-line layout
            toast.innerHTML = `
                <div class="toast-icon">${icons[type] || icons.default}</div>
                <div class="toast-content">${message.replace(/\n/g, '<br>')}</div>
            `;
        } else {
            toast.textContent = message;
        }

        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);

        if (navigator.vibrate) navigator.vibrate(50);
    }

    toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.active = !user.active;
            this.saveData('users');
            this.showToast(`✓ User ${user.active ? 'activated' : 'deactivated'}`);
            this.renderManagerUsers();
        }
    }

    editUser(userId) {
        this.openUserModal(userId);
    }

    // ===== DAILY CASH MANAGEMENT =====
    initDailyCash() {
        const today = new Date().toISOString().split('T')[0];
        let todaysEntry = this.dailyCash.find(c => c.date === today);

        if (!todaysEntry) {
            // Get yesterday's closing balance
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayDate = yesterday.toISOString().split('T')[0];
            const yesterdayEntry = this.dailyCash.find(c => c.date === yesterdayDate);

            todaysEntry = {
                id: 'cash_' + today,
                date: today,
                openingBalance: yesterdayEntry ? yesterdayEntry.closingBalance : 0,
                income: { sales: 0, service: 0, external: 0, total: 0 },
                expenses: [],
                totalExpenses: 0,
                closingBalance: yesterdayEntry ? yesterdayEntry.closingBalance : 0,
                lastUpdated: new Date().toISOString()
            };
            this.dailyCash.push(todaysEntry);
            this.saveData('dailyCash');
        }
        return todaysEntry;
    }

    getTodaysCash() {
        const today = new Date().toISOString().split('T')[0];
        return this.dailyCash.find(c => c.date === today) || this.initDailyCash();
    }

    // ===== CUSTOM DROPDOWN MANAGEMENT =====
    toggleCustomIncomeType(select) {
        const customDiv = document.getElementById('customIncomeTypeDiv');
        const customInput = document.getElementById('customIncomeType');

        if (select.value === '__custom__') {
            customDiv.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customDiv.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    toggleCustomExpenseCategory(select) {
        const customDiv = document.getElementById('customExpenseCategoryDiv');
        const customInput = document.getElementById('customExpenseCategory');

        if (select.value === '__custom__') {
            customDiv.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customDiv.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    loadCustomDropdownOptions() {
        // Load custom income types
        const customIncomeTypes = JSON.parse(localStorage.getItem('starcity_customIncomeTypes')) || [];
        const incomeSelect = document.getElementById('incomeType');

        if (incomeSelect && customIncomeTypes.length > 0) {
            // Remove existing custom options (except __custom__)
            const existingOptions = Array.from(incomeSelect.options);
            existingOptions.forEach(opt => {
                if (opt.value !== 'sales' && opt.value !== 'service' && opt.value !== 'external' && opt.value !== '__custom__') {
                    opt.remove();
                }
            });

            // Add custom types before the "Add New" option
            const addNewOption = incomeSelect.querySelector('option[value="__custom__"]');
            customIncomeTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.value;
                option.textContent = `${type.icon || '💼'} ${type.label}`;
                incomeSelect.insertBefore(option, addNewOption);
            });
        }

        // Load custom expense categories
        const customExpenseCategories = JSON.parse(localStorage.getItem('starcity_customExpenseCategories')) || [];
        const expenseSelect = document.getElementById('expenseCategory');

        if (expenseSelect && customExpenseCategories.length > 0) {
            // Remove existing custom options (except __custom__)
            const existingOptions = Array.from(expenseSelect.options);
            existingOptions.forEach(opt => {
                if (!['labour', 'meals', 'rent', 'utilities', 'transport', 'other', '__custom__'].includes(opt.value)) {
                    opt.remove();
                }
            });

            // Add custom categories before the "Add New" option
            const addNewOption = expenseSelect.querySelector('option[value="__custom__"]');
            customExpenseCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.value;
                option.textContent = `${cat.icon || '📌'} ${cat.label}`;
                expenseSelect.insertBefore(option, addNewOption);
            });
        }
    }

    addCustomIncomeType(name) {
        const customTypes = JSON.parse(localStorage.getItem('starcity_customIncomeTypes')) || [];
        const value = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        // Check if already exists
        if (customTypes.some(t => t.value === value)) {
            return value;
        }

        customTypes.push({
            value: value,
            label: name,
            icon: '💼'
        });

        localStorage.setItem('starcity_customIncomeTypes', JSON.stringify(customTypes));
        this.loadCustomDropdownOptions();

        return value;
    }

    addCustomExpenseCategory(name) {
        const customCategories = JSON.parse(localStorage.getItem('starcity_customExpenseCategories')) || [];
        const value = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        // Check if already exists
        if (customCategories.some(c => c.value === value)) {
            return value;
        }

        customCategories.push({
            value: value,
            label: name,
            icon: '📌'
        });

        localStorage.setItem('starcity_customExpenseCategories', JSON.stringify(customCategories));
        this.loadCustomDropdownOptions();

        return value;
    }


    handleIncomeSubmit() {
        let type = document.getElementById('incomeType').value;
        const amount = parseFloat(document.getElementById('incomeAmount').value);
        const note = document.getElementById('incomeNote').value;

        if (!amount || amount <= 0) {
            this.showToast('❌ Please enter a valid amount');
            return;
        }

        // Handle custom income type
        if (type === '__custom__') {
            const customName = document.getElementById('customIncomeType').value.trim();
            if (!customName) {
                this.showToast('❌ Please enter a name for the new income type');
                return;
            }
            type = this.addCustomIncomeType(customName);
            this.showToast(`✅ New income type "${customName}" added!`, 'success');
        }

        this.recordIncome(type, amount, note);
        document.getElementById('cashIncomeForm').reset();
        document.getElementById('customIncomeTypeDiv').style.display = 'none';

        const typeNames = {
            sales: 'Sales Income',
            service: 'Service Income',
            external: 'External Savings'
        };

        const displayName = typeNames[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        this.showToast(`✅ ${displayName} added: ${this.formatCurrency(amount)}`, 'success');
    }

    recordIncome(type, amount, note = '') {
        const todayCash = this.getTodaysCash();

        // Initialize custom income type if it doesn't exist
        if (todayCash.income[type] === undefined) {
            todayCash.income[type] = 0;
        }

        todayCash.income[type] += parseFloat(amount);

        // Recalculate total (sum all income types except 'total')
        todayCash.income.total = Object.keys(todayCash.income)
            .filter(key => key !== 'total')
            .reduce((sum, key) => sum + (todayCash.income[key] || 0), 0);

        this.recalculateBalance(todayCash);
        this.saveData('dailyCash');
        this.renderCashManagement();
    }

    handleExpenseSubmit() {
        let category = document.getElementById('expenseCategory').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const note = document.getElementById('expenseNote').value;

        if (!amount || amount <= 0) {
            this.showToast('❌ Please enter a valid amount');
            return;
        }

        if (!note || note.trim() === '') {
            this.showToast('❌ Please enter a description for the expense');
            return;
        }

        // Handle custom expense category
        if (category === '__custom__') {
            const customName = document.getElementById('customExpenseCategory').value.trim();
            if (!customName) {
                this.showToast('❌ Please enter a name for the new category');
                return;
            }
            category = this.addCustomExpenseCategory(customName);
            this.showToast(`✅ New category "${customName}" added!`, 'success');
        }

        this.recordExpense(category, amount, note);
        document.getElementById('cashExpenseForm').reset();
        document.getElementById('customExpenseCategoryDiv').style.display = 'none';

        this.showToast(`✅ Expense recorded: ${this.formatCurrency(amount)}`, 'success');
    }

    recordExpense(category, amount, note = '') {
        const todayCash = this.getTodaysCash();
        const expense = {
            id: 'exp_' + Date.now(),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            category,
            amount: parseFloat(amount),
            note
        };
        todayCash.expenses.push(expense);
        todayCash.totalExpenses = todayCash.expenses.reduce((sum, e) => sum + e.amount, 0);
        this.recalculateBalance(todayCash);
        this.saveData('dailyCash');
        this.renderCashManagement();
    }

    recalculateBalance(cashEntry) {
        cashEntry.closingBalance = cashEntry.openingBalance + cashEntry.income.total - cashEntry.totalExpenses;
        cashEntry.lastUpdated = new Date().toISOString();
    }

    switchCashTab(tab) {
        // Update tab buttons
        const tabs = ['btnCashIncomeTab', 'btnCashExpenseTab', 'btnCashHistoryTab'];
        tabs.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.classList.remove('active');
        });

        // Update sections
        ['cashIncomeSection', 'cashExpenseSection', 'cashHistorySection'].forEach(id => {
            const section = document.getElementById(id);
            if (section) section.style.display = 'none';
        });

        // Show selected
        if (tab === 'income') {
            document.getElementById('btnCashIncomeTab')?.classList.add('active');
            document.getElementById('cashIncomeSection').style.display = 'block';
        } else if (tab === 'expense') {
            document.getElementById('btnCashExpenseTab')?.classList.add('active');
            document.getElementById('cashExpenseSection').style.display = 'block';
        } else if (tab === 'history') {
            document.getElementById('btnCashHistoryTab')?.classList.add('active');
            document.getElementById('cashHistorySection').style.display = 'block';
            this.renderCashHistory();
        }
    }

    renderCashManagement() {
        const todayCash = this.getTodaysCash();

        // Update summary
        const openingEl = document.getElementById('cashOpeningBalance');
        const incomeEl = document.getElementById('cashTotalIncome');
        const expensesEl = document.getElementById('cashTotalExpenses');
        const closingEl = document.getElementById('cashClosingBalance');
        const dateEl = document.getElementById('cashCurrentDate');

        if (openingEl) openingEl.textContent = this.formatCurrency(todayCash.openingBalance);
        if (incomeEl) incomeEl.textContent = this.formatCurrency(todayCash.income.total);
        if (expensesEl) expensesEl.textContent = this.formatCurrency(todayCash.totalExpenses);
        if (closingEl) closingEl.textContent = this.formatCurrency(todayCash.closingBalance);
        if (dateEl) dateEl.textContent = new Date(todayCash.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    renderCashHistory() {
        const container = document.getElementById('cashDailyHistory');
        if (!container) return;

        const sorted = [...this.dailyCash].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No cash history yet</p></div>';
            return;
        }

        const categoryIcons = {
            labour: '👷',
            meals: '🍽️',
            rent: '🏢',
            utilities: '💡',
            transport: '🚗',
            other: '📝'
        };

        const html = sorted.map(day => {
            const date = new Date(day.date);
            const isToday = day.date === new Date().toISOString().split('T')[0];

            return `
                <div class="list-item" style="background: ${isToday ? 'var(--bg-tertiary)' : 'var(--surface)'}; border-left: 3px solid ${isToday ? 'var(--primary)' : 'var(--border)'};">
                    <div class="list-item-header" style="margin-bottom: 0.75rem;">
                        <span class="list-item-title" style="font-size: 1.1rem;">
                            ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            ${isToday ? '<span class="badge badge-primary" style="margin-left: 0.5rem; font-size: 0.75rem;">Today</span>' : ''}
                        </span>
                    </div>
                    
                    <!-- Balance Summary -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: var(--radius-sm);">
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Opening</div>
                            <div style="font-weight: 600;">${this.formatCurrency(day.openingBalance)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Income</div>
                            <div style="font-weight: 600; color: var(--success);">+${this.formatCurrency(day.income.total)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Expenses</div>
                            <div style="font-weight: 600; color: var(--danger);">-${this.formatCurrency(day.totalExpenses)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Closing</div>
                            <div style="font-weight: 600; font-size: 1.1rem;">${this.formatCurrency(day.closingBalance)}</div>
                        </div>
                    </div>

                    <!-- Income Breakdown -->
                    ${day.income.total > 0 ? `
                        <div style="margin-bottom: 1rem;">
                            <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--success);">💰 Income Breakdown</div>
                            <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem;">
                                ${day.income.sales > 0 ? `<div>Sales: ${this.formatCurrency(day.income.sales)}</div>` : ''}
                                ${day.income.service > 0 ? `<div>Service: ${this.formatCurrency(day.income.service)}</div>` : ''}
                                ${day.income.external > 0 ? `<div>External: ${this.formatCurrency(day.income.external)}</div>` : ''}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Expense List -->
                    ${day.expenses.length > 0 ? `
                        <div>
                            <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--danger);">💸 Expenses (${day.expenses.length})</div>
                            ${day.expenses.map(exp => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-primary); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 500;">${categoryIcons[exp.category] || '📝'} ${exp.note}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                                            ${exp.time} • ${exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}
                                        </div>
                                    </div>
                                    <div style="font-weight: 600; color: var(--danger); margin-left: 1rem;">
                                        ${this.formatCurrency(exp.amount)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div style="font-size: 0.85rem; color: var(--text-muted);">No expenses recorded</div>'}
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    switchCreditTab(tab) {
        // Update tab buttons
        const tabs = ['btnDailySummaryTab', 'btnCustomerTab', 'btnVendorTab'];
        tabs.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) btn.classList.remove('active');
        });

        // Update sections
        const sections = ['expensesSection', 'customerCreditsSection', 'vendorCreditsSection'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) section.style.display = 'none';
        });

        // Show selected tab
        if (tab === 'daily') {
            document.getElementById('btnDailySummaryTab')?.classList.add('active');
            document.getElementById('expensesSection').style.display = 'block';

            // Initialize cash for today if needed
            this.initDailyCash();
            this.renderCashManagement();
            this.loadCustomDropdownOptions();
            this.switchCashTab('income');

            // Update cash balance badge in header
            const todayCash = this.getTodaysCash();
            const balanceBadge = document.getElementById('cashBalanceBadge');
            if (balanceBadge) {
                balanceBadge.textContent = this.formatCurrency(todayCash.closingBalance);
            }
        } else if (tab === 'customer') {
            document.getElementById('btnCustomerTab')?.classList.add('active');
            document.getElementById('customerCreditsSection').style.display = 'block';
        } else if (tab === 'vendor') {
            document.getElementById('btnVendorTab')?.classList.add('active');
            document.getElementById('vendorCreditsSection').style.display = 'block';
        }
    }



    saveData(type) {
        try {
            if (!type) {
                // Save everything if no type provided
                const dataTypes = ['users', 'stock', 'sales', 'repairJobs', 'vendors', 'purchases', 'expenses', 'customerCredits', 'vendorDebt', 'warranty', 'dailyCash'];
                dataTypes.forEach(t => this.saveData(t));
                return;
            }

            // Map keys if they don't match property names
            let key = type;
            let data = this[type];

            if (type === 'repairs') {
                key = 'repairs'; data = this.repairJobs;
            }
            if (type === 'repairJobs') { key = 'repairs'; data = this.repairJobs; }
            if (type === 'customer_credits') { key = 'customer_credits'; data = this.customerCredits; }
            if (type === 'vendor_credits') { key = 'vendor_credits'; data = this.vendorCredits; }
            if (type === 'vendor_debt') { key = 'vendor_debt'; data = this.vendorDebt; }
            if (type === 'warranty') { key = 'warranty'; data = this.warrantyJobs; }

            localStorage.setItem(`starcity_${key}`, JSON.stringify(data || []));
        } catch (e) {
            console.warn('LocalStorage save failed for ' + type + ':', e);
        }
    }

    // ===== CREDIT HISTORY =====
    showCreditHistory(creditData, customerName) {
        const modal = document.getElementById('creditHistoryModal');
        const title = document.getElementById('creditHistoryTitle');
        const content = document.getElementById('creditHistoryContent');

        title.textContent = `Transaction History - ${customerName}`;

        // Sort transactions by date
        const transactions = creditData.history || [];
        const sortedTransactions = [...transactions].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        if (sortedTransactions.length === 0) {
            content.innerHTML = '<div class="empty-state">No transaction history</div>';
        } else {
            const html = '<div style="position: relative; padding-left: 2rem;">' +
                sortedTransactions.map((transaction, index) => {
                    const date = new Date(transaction.date).toLocaleDateString();
                    const isCredit = transaction.type === 'Credit' || transaction.amount > 0;
                    const icon = isCredit ? '💳' : '💰';
                    const color = isCredit ? 'var(--warning)' : 'var(--success)';
                    const amountText = isCredit ?
                        `+${this.formatCurrency(Math.abs(transaction.amount))}` :
                        `-${this.formatCurrency(Math.abs(transaction.amount))}`;

                    return `
                    <div style="position: relative; padding: 1rem 0; border-left: 2px solid var(--border);">
                        <div style="position: absolute; left: -0.625rem; width: 1.25rem; height: 1.25rem; background: ${color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">${icon}</div>
                        <div style="margin-left: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <strong style="color: var(--text-primary);">${transaction.type || (isCredit ? 'Credit Issued' : 'Payment Received')}</strong>
                                <span style="font-weight: 600; color: ${color};">${amountText}</span>
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">
                                ${date}
                                ${transaction.balance !== undefined ? ` • Balance: ${this.formatCurrency(transaction.balance)}` : ''}
                            </div>
                        </div>
                    </div>
                    `;
                }).join('') +
                '</div>';

            content.innerHTML = html;
        }

        this.showModal('creditHistoryModal');
    }
    // ===== STOCK & SALES TAB SWITCHING =====
    switchFinanceTab(tab) {
        const btnStock = document.getElementById('btnStockTab');
        const btnSales = document.getElementById('btnSalesTab');
        const btnHistory = document.getElementById('btnHistoryTab');
        const sectionStock = document.getElementById('financeStockSection');
        const sectionSales = document.getElementById('financeSalesSection');
        const sectionHistory = document.getElementById('financeHistorySection');
        [btnStock, btnSales, btnHistory].forEach(btn => btn?.classList.remove('active'));
        if (sectionStock) sectionStock.style.display = 'none';
        if (sectionSales) sectionSales.style.display = 'none';
        if (sectionHistory) sectionHistory.style.display = 'none';
        if (tab === 'stock') {
            btnStock?.classList.add('active');
            if (sectionStock) sectionStock.style.display = 'block';
            this.renderStockProducts();
        } else if (tab === 'sales') {
            btnSales?.classList.add('active');
            if (sectionSales) sectionSales.style.display = 'block';
            this.populateProductDropdowns();
        } else if (tab === 'history') {
            btnHistory?.classList.add('active');
            if (sectionHistory) sectionHistory.style.display = 'block';
            this.renderSalesHistory();
        }
    }

    renderStockProducts(searchTerm = '') {
        const container = document.getElementById('mgrStockList');
        if (!container) return;
        let filtered = this.stock || [];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
        }
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">??</div><p>No products found</p></div>';
            return;
        }
        const html = filtered.map(product => `<div class="stock-card" onclick="app.showProductDetails(${product.id})"><div class="stock-image-container">${product.image ? `<img src="${product.image}" class="stock-image" alt="${product.name}">` : `<div class="stock-placeholder">??</div>`}</div><div class="stock-card-name" title="${product.name}">${product.name}</div><div class="stock-card-price">${this.formatCurrency(product.price)}</div><div class="stock-card-qty"><span>Stock:</span><span class="stock-card-qty-badge ${product.quantity <= product.minQuantity ? 'low-stock' : ''}">${product.quantity}</span></div>${product.quantity <= product.minQuantity ? '<div class="stock-low-badge">?? Low</div>' : ''}</div>`).join('');
        container.innerHTML = html;
    }

    renderSalesHistory() {
        const container = document.getElementById('mgrSalesHistory');
        if (!container) return;
        const sorted = [...(this.sales || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">??</div><p>No sales recorded yet</p></div>';
            return;
        }
        const html = sorted.slice(0, 50).map(sale => `<div class="list-item"><div class="list-item-header"><span class="list-item-title">${sale.product || 'Sale'}</span><strong>${this.formatCurrency(sale.total)}</strong></div><div class="list-item-meta"><span>${this.formatDate(new Date(sale.date))}</span><span>${sale.customer || 'Walk-in'} � ${sale.payment || 'Cash'}</span></div></div>`).join('');
        container.innerHTML = html;
    }

    populateProductDropdowns() {
        const dropdowns = document.querySelectorAll('.item-product');
        const html = '<option value="">-- Select Product --</option>' + (this.stock || []).map(p => `<option value="${p.name}">${p.name} (${this.formatCurrency(p.price)})</option>`).join('');
        dropdowns.forEach(dropdown => { dropdown.innerHTML = html; });
    }

    //===== CUSTOM DROPDOWN MANAGEMENT =====
    toggleCustomProductCategory(select) {
        const customDiv = document.getElementById('customProductCategoryDiv');
        const customInput = document.getElementById('customProductCategory');

        if (select.value === '__custom__') {
            customDiv.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customDiv.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    toggleCustomProductBrand(select) {
        const customDiv = document.getElementById('customProductBrandDiv');
        const customInput = document.getElementById('customProductBrand');

        if (select.value === '__custom__') {
            customDiv.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customDiv.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    toggleCustomIncomeType(select) {
        const customDiv = document.getElementById('customIncomeTypeDiv');
        const customInput = document.getElementById('customIncomeType');

        if (select.value === '__custom__') {
            customDiv.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customDiv.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    toggleCustomExpenseCategory(select) {
        const customDiv = document.getElementById('customExpenseCategoryDiv');
        const customInput = document.getElementById('customExpenseCategory');

        if (select.value === '__custom__') {
            customDiv.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customDiv.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    loadCustomProductCategories() {
        const customCategories = JSON.parse(localStorage.getItem('starcity_customProductCategories')) || [];
        const select = document.getElementById('productCategory');

        if (select && customCategories.length > 0) {
            // Remove existing custom options (except standard ones and __custom__)
            const existingOptions = Array.from(select.options);
            existingOptions.forEach(opt => {
                if (!['Phones', 'Accessories', 'Parts', '__custom__'].includes(opt.value)) {
                    opt.remove();
                }
            });

            // Add custom categories before the "Add New" option
            const addNewOption = select.querySelector('option[value="__custom__"]');
            customCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.insertBefore(option, addNewOption);
            });
        }
    }

    loadCustomDropdownOptions() {
        // Load custom income types
        const customIncomeTypes = JSON.parse(localStorage.getItem('starcity_customIncomeTypes')) || [];
        const incomeSelect = document.getElementById('incomeType');

        if (incomeSelect && customIncomeTypes.length > 0) {
            const existingOptions = Array.from(incomeSelect.options);
            existingOptions.forEach(opt => {
                if (opt.value !== 'sales' && opt.value !== 'service' && opt.value !== 'external' && opt.value !== '__custom__') {
                    opt.remove();
                }
            });

            const addNewOption = incomeSelect.querySelector('option[value="__custom__"]');
            customIncomeTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.value;
                option.textContent = `${type.icon || '💼'} ${type.label}`;
                incomeSelect.insertBefore(option, addNewOption);
            });
        }

        // Load custom expense categories
        const customExpenseCategories = JSON.parse(localStorage.getItem('starcity_customExpenseCategories')) || [];
        const expenseSelect = document.getElementById('expenseCategory');

        if (expenseSelect && customExpenseCategories.length > 0) {
            const existingOptions = Array.from(expenseSelect.options);
            existingOptions.forEach(opt => {
                if (!['labour', 'meals', 'rent', 'utilities', 'transport', 'other', '__custom__'].includes(opt.value)) {
                    opt.remove();
                }
            });

            const addNewOption = expenseSelect.querySelector('option[value="__custom__"]');
            customExpenseCategories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.value;
                option.textContent = `${cat.icon || '📌'} ${cat.label}`;
                expenseSelect.insertBefore(option, addNewOption);
            });
        }
    }

    addCustomProductCategory(name) {
        const customCategories = JSON.parse(localStorage.getItem('starcity_customProductCategories')) || [];

        // Check if already exists
        if (customCategories.includes(name)) {
            return name;
        }

        customCategories.push(name);
        localStorage.setItem('starcity_customProductCategories', JSON.stringify(customCategories));
        this.loadCustomProductCategories();

        return name;
    }

    loadCustomProductBrands() {
        const customBrands = JSON.parse(localStorage.getItem('starcity_customProductBrands')) || [];
        const select = document.getElementById('productBrand');

        if (select && customBrands.length > 0) {
            // Remove existing custom options (except standard ones and __custom__)
            const standardBrands = ['', 'Samsung', 'Apple', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'OnePlus', '__custom__'];
            const existingOptions = Array.from(select.options);
            existingOptions.forEach(opt => {
                if (!standardBrands.includes(opt.value)) {
                    opt.remove();
                }
            });

            // Add custom brands before the "Add New" option
            const addNewOption = select.querySelector('option[value="__custom__"]');
            customBrands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                select.insertBefore(option, addNewOption);
            });
        }
    }

    addCustomProductBrand(name) {
        const customBrands = JSON.parse(localStorage.getItem('starcity_customProductBrands')) || [];

        // Check if already exists
        if (customBrands.includes(name)) {
            return name;
        }

        customBrands.push(name);
        localStorage.setItem('starcity_customProductBrands', JSON.stringify(customBrands));
        this.loadCustomProductBrands();

        return name;
    }

    //===== REPAIR FORM CUSTOM DROPDOWNS =====
    toggleCustomRepairBrand(select) {
        const customDiv = document.getElementById('customRepairBrandDiv');
        const customInput = document.getElementById('customRepairBrand');

        if (select.value === '__custom__') {
            customDiv.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customDiv.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    toggleCustomRepairModel(select) {
        const customDiv = document.getElementById('customRepairModelDiv');
        const customInput = document.getElementById('customRepairModel');

        if (select.value === '__custom__') {
            customDiv.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customDiv.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    toggleCustomRepairProblem(select) {
        const customDiv = document.getElementById('customRepairProblemDiv');
        const customInput = document.getElementById('customRepairProblem');

        if (select.value === '__custom__') {
            customDiv.style.display = 'block';
            customInput.required = true;
            customInput.focus();
        } else {
            customDiv.style.display = 'none';
            customInput.required = false;
            customInput.value = '';
        }
    }

    loadCustomRepairDropdowns() {
        // Load custom brands
        const customBrands = JSON.parse(localStorage.getItem('starcity_customRepairBrands')) || [];
        const brandSelect = document.getElementById('techJobBrand');

        if (brandSelect && customBrands.length > 0) {
            const standardBrands = ['', 'Samsung', 'Apple', 'Xiaomi', 'Oppo', 'Vivo', 'Realme', 'OnePlus', '__custom__'];
            const existingOptions = Array.from(brandSelect.options);
            existingOptions.forEach(opt => {
                if (!standardBrands.includes(opt.value)) opt.remove();
            });

            const addNewOption = brandSelect.querySelector('option[value="__custom__"]');
            customBrands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand;
                option.textContent = brand;
                brandSelect.insertBefore(option, addNewOption);
            });
        }

        // Load custom models
        const customModels = JSON.parse(localStorage.getItem('starcity_customRepairModels')) || [];
        const modelSelect = document.getElementById('techJobModel');

        if (modelSelect && customModels.length > 0) {
            const existingOptions = Array.from(modelSelect.options);
            existingOptions.forEach(opt => {
                if (opt.value !== '' && opt.value !== '__custom__') opt.remove();
            });

            const addNewOption = modelSelect.querySelector('option[value="__custom__"]');
            customModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelSelect.insertBefore(option, addNewOption);
            });
        }

        // Load custom problems
        const customProblems = JSON.parse(localStorage.getItem('starcity_customRepairProblems')) || [];
        const problemSelect = document.getElementById('techJobProblem');

        if (problemSelect && customProblems.length > 0) {
            const standardProblems = ['', 'Screen Broken', 'Battery Issue', 'Charging Port', 'Water Damage', 'Software Issue', 'Speaker/Mic Issue', 'Camera Issue', '__custom__'];
            const existingOptions = Array.from(problemSelect.options);
            existingOptions.forEach(opt => {
                if (!standardProblems.includes(opt.value)) opt.remove();
            });

            const addNewOption = problemSelect.querySelector('option[value="__custom__"]');
            customProblems.forEach(problem => {
                const option = document.createElement('option');
                option.value = problem;
                option.textContent = problem;
                problemSelect.insertBefore(option, addNewOption);
            });
        }
    }

    addCustomRepairBrand(name) {
        const customBrands = JSON.parse(localStorage.getItem('starcity_customRepairBrands')) || [];
        if (customBrands.includes(name)) return name;

        customBrands.push(name);
        localStorage.setItem('starcity_customRepairBrands', JSON.stringify(customBrands));
        this.loadCustomRepairDropdowns();
        return name;
    }

    addCustomRepairModel(name) {
        const customModels = JSON.parse(localStorage.getItem('starcity_customRepairModels')) || [];
        if (customModels.includes(name)) return name;

        customModels.push(name);
        localStorage.setItem('starcity_customRepairModels', JSON.stringify(customModels));
        this.loadCustomRepairDropdowns();
        return name;
    }

    addCustomRepairProblem(name) {
        const customProblems = JSON.parse(localStorage.getItem('starcity_customRepairProblems')) || [];
        if (customProblems.includes(name)) return name;

        customProblems.push(name);
        localStorage.setItem('starcity_customRepairProblems', JSON.stringify(customProblems));
        this.loadCustomRepairDropdowns();
        return name;
    }

    addCustomIncomeType(name) {
        const customTypes = JSON.parse(localStorage.getItem('starcity_customIncomeTypes')) || [];
        const value = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        if (customTypes.some(t => t.value === value)) {
            return value;
        }

        customTypes.push({
            value: value,
            label: name,
            icon: '💼'
        });

        localStorage.setItem('starcity_customIncomeTypes', JSON.stringify(customTypes));
        this.loadCustomDropdownOptions();

        return value;
    }

    addCustomExpenseCategory(name) {
        const customCategories = JSON.parse(localStorage.getItem('starcity_customExpenseCategories')) || [];
        const value = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        if (customCategories.some(c => c.value === value)) {
            return value;
        }

        customCategories.push({
            value: value,
            label: name,
            icon: '📌'
        });

        localStorage.setItem('starcity_customExpenseCategories', JSON.stringify(customCategories));
        this.loadCustomDropdownOptions();

        return value;
    }
    //===== REPAIR PARTS FROM STOCK =====
    selectedRepairParts = [];

    loadRepairPartsDropdown() {
        const select = document.getElementById('techJobPartSelect');
        if (!select) return;

        const html = '<option value="">-- Select Part --</option>' +
            (this.stock || [])
                .filter(p => p.quantity > 0) // Only show parts in stock
                .map(p => `<option value="${p.id}" data-name="${p.name}" data-qty="${p.quantity}" data-price="${p.cost || 0}">${p.name} (${p.quantity} available - Rs. ${this.formatCurrency(p.cost || 0)})</option>`)
                .join('');

        select.innerHTML = html;
        this.selectedRepairParts = [];
        this.renderSelectedParts();
    }

    addPartToRepair() {
        const select = document.getElementById('techJobPartSelect');
        const qtyInput = document.getElementById('techJobPartQty');

        if (!select.value) {
            this.showToast('❌ Please select a part');
            return;
        }

        const selectedOption = select.options[select.selectedIndex];
        const partId = select.value;
        const partName = selectedOption.getAttribute('data-name');
        const availableQty = parseInt(selectedOption.getAttribute('data-qty'));
        const partPrice = parseFloat(selectedOption.getAttribute('data-price'));
        const requestedQty = parseInt(qtyInput.value) || 1;

        // Check if already added
        const existing = this.selectedRepairParts.find(p => p.id === partId);
        if (existing) {
            this.showToast('❌ Part already added. Remove it first to change quantity.');
            return;
        }

        // Check stock availability
        if (requestedQty > availableQty) {
            this.showToast(`❌ Only ${availableQty} units available`);
            return;
        }

        // Add to selected parts
        this.selectedRepairParts.push({
            id: partId,
            name: partName,
            quantity: requestedQty,
            price: partPrice
        });

        // Update hidden input
        document.getElementById('techJobParts').value = JSON.stringify(this.selectedRepairParts);

        // Reset selection
        select.value = '';
        qtyInput.value = '1';

        this.renderSelectedParts();
        this.showToast('✅ Part added', 'success');
    }

    removePartFromRepair(partId) {
        this.selectedRepairParts = this.selectedRepairParts.filter(p => p.id !== partId);
        document.getElementById('techJobParts').value = JSON.stringify(this.selectedRepairParts);
        this.renderSelectedParts();
    }

    renderSelectedParts() {
        const container = document.getElementById('selectedPartsItems');
        const listDiv = document.getElementById('selectedPartsList');

        if (!container) return;

        if (this.selectedRepairParts.length === 0) {
            listDiv.style.display = 'none';
            return;
        }

        listDiv.style.display = 'block';

        const html = this.selectedRepairParts.map(part => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-primary); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                <div>
                    <strong>${part.name}</strong>
                    <span style="color: var(--text-muted); margin-left: 0.5rem;">× ${part.quantity}</span>
                    <span style="color: var(--text-muted); margin-left: 0.5rem;">@ ${this.formatCurrency(part.price)}</span>
                </div>
                <button type="button" onclick="app.removePartFromRepair('${part.id}')" class="btn btn-sm btn-danger" style="padding: 0.25rem 0.5rem;">Remove</button>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    deductPartsFromStock(partsJson) {
        if (!partsJson) return;

        try {
            const parts = JSON.parse(partsJson);
            if (!Array.isArray(parts) || parts.length === 0) return;

            parts.forEach(part => {
                const stockItem = this.stock.find(s => s.id === part.id);
                if (stockItem) {
                    stockItem.quantity -= part.quantity;
                    if (stockItem.quantity < 0) stockItem.quantity = 0;
                }
            });

            this.saveData('stock');
            this.showToast(`✅ ${parts.length} part(s) deducted from stock`, 'success');
        } catch (e) {
            console.error('Error deducting parts:', e);
        }
    }

    forceRefresh() {
        if (confirm('This will clear app cache and reload to fix sync issues. Proceed?')) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                        registration.unregister();
                    }
                    caches.keys().then(names => {
                        for (let name of names) caches.delete(name);
                        // Force a hard reload from server
                        window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
                    });
                });
            } else {
                window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
            }
        }
    }

    switchTechView(view) {
        // Hide all technician views
        const views = ['techDashboardView', 'techJobsView', 'techNewJobView', 'techEarningsView'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.classList.remove('active');
        });

        // Update navigation active state
        document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.bottom-nav .nav-item[data-view="${view}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        // Show selected view
        if (view === 'dashboard') {
            document.getElementById('techDashboardView')?.classList.add('active');
        } else if (view === 'jobs') {
            document.getElementById('techJobsView')?.classList.add('active');
        } else if (view === 'newjob') {
            document.getElementById('techNewJobView')?.classList.add('active');
            // Auto-load dropdowns when New Job view opens
            this.loadRepairPartsDropdown();
            this.loadCustomRepairDropdowns();
        } else if (view === 'earnings') {
            document.getElementById('techEarningsView')?.classList.add('active');
        }
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new StarcityApp();
});
