/**
 * SYNC MANAGER - Cloud Database Layer
 * Replaces localStorage with Google Sheets backend
 * Works with existing Code.gs backend
 */

class SyncManager {
    constructor() {
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbzKSaY_UQBEl_meRDtaaDOajqc5iYfT5PcYomg2ADWaPP75zubx1Hv1W8ZuZ7-76Ma4ig/exec'; // New deployment URL
        this.cache = {}; // Local cache for offline support
        this.pendingSync = []; // Queue for offline operations
        this.isOnline = navigator.onLine;

        // Monitor connection status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncPendingOperations();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Get data from backend (replaces localStorage.getItem)
     */
    async getData(key) {
        // Try cache first for offline support
        if (this.cache[key]) {
            return this.cache[key];
        }

        if (!this.isOnline) {
            console.warn('Offline - using cached data');
            return null;
        }

        try {
            // Map localStorage keys to backend functions
            const functionMap = {
                'starcity_users': 'getUsers',
                'starcity_stock': 'getStock',
                'starcity_sales': 'getSales',
                'starcity_repairs': 'getRepairJobs',
                'starcity_warranty': 'getWarrantyJobs',
                'starcity_customer_credits': 'getCustomerCredits',
                'starcity_vendor_credits': 'getVendorCredits',
                'starcity_expenses': 'getExpenses',
                'starcity_vendors': 'getVendors',
                'starcity_purchases': 'getVendorPurchases',
                'starcity_dailyCash': 'getDailyCash',
                'starcity_settings': 'getSettings'
            };

            const functionName = functionMap[key];
            if (!functionName) {
                console.warn('No backend function for key:', key);
                return null;
            }

            const response = await this.callBackend(functionName);

            // Cache the result
            this.cache[key] = JSON.stringify(response);
            return this.cache[key];

        } catch (error) {
            console.error('Error getting data:', error);
            return this.cache[key] || null;
        }
    }

    /**
     * Save data to backend (replaces localStorage.setItem)
     */
    async setData(key, value) {
        // Update cache immediately
        this.cache[key] = value;

        if (!this.isOnline) {
            // Queue for later sync
            this.pendingSync.push({ key, value, action: 'set' });
            console.warn('Offline - operation queued for sync');
            return true;
        }

        try {
            const data = JSON.parse(value);

            // Map localStorage keys to backend sync functions
            const syncMap = {
                'starcity_users': 'syncSheetData',
                'starcity_stock': 'syncSheetData',
                'starcity_sales': 'syncSheetData',
                'starcity_repairs': 'syncSheetData',
                'starcity_warranty': 'syncSheetData',
                'starcity_customer_credits': 'syncSheetData',
                'starcity_vendor_credits': 'syncSheetData',
                'starcity_expenses': 'syncSheetData',
                'starcity_vendors': 'syncSheetData',
                'starcity_purchases': 'syncSheetData'
            };

            // Map keys to sheet names
            const sheetMap = {
                'starcity_users': 'Users',
                'starcity_stock': 'Stock',
                'starcity_sales': 'Sales',
                'starcity_repairs': 'RepairJobs',
                'starcity_warranty': 'WarrantyJobs',
                'starcity_customer_credits': 'CustomerCredits',
                'starcity_vendor_credits': 'VendorCredits',
                'starcity_expenses': 'Expenses',
                'starcity_vendors': 'Vendors',
                'starcity_purchases': 'VendorPurchases'
            };

            const sheetName = sheetMap[key];
            if (sheetName) {
                await this.callBackend('syncSheetData', [sheetName, data]);
            }

            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            this.pendingSync.push({ key, value, action: 'set' });
            return false;
        }
    }

    /**
     * Call Google Apps Script backend using JSONP (bypasses CORS)
     */
    async callBackend(functionName, args = []) {
        return new Promise((resolve, reject) => {
            // Generate unique callback name
            const callbackName = 'jsonp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            // Create global callback function
            window[callbackName] = function (data) {
                delete window[callbackName];
                document.body.removeChild(script);
                resolve(data);
            };

            // Build URL with JSONP callback
            const params = new URLSearchParams({
                function: functionName,
                arguments: JSON.stringify(args),
                callback: callbackName
            });

            // Create script tag for JSONP request
            const script = document.createElement('script');
            script.src = `${this.scriptUrl}?${params}`;
            script.onerror = () => {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('JSONP request failed'));
            };

            // Add timeout to prevent hanging
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    if (script.parentNode) {
                        document.body.removeChild(script);
                    }
                    reject(new Error('Request timeout'));
                }
            }, 30000); // 30 second timeout

            document.body.appendChild(script);
        });
    }

    /**
     * Sync pending operations when back online
     */
    async syncPendingOperations() {
        if (this.pendingSync.length === 0) return;

        console.log('Syncing', this.pendingSync.length, 'pending operations');

        const operations = [...this.pendingSync];
        this.pendingSync = [];

        for (const op of operations) {
            try {
                if (op.action === 'set') {
                    await this.setData(op.key, op.value);
                }
            } catch (error) {
                console.error('Failed to sync operation:', op, error);
                this.pendingSync.push(op); // Re-queue failed operations
            }
        }
    }

    /**
     * Configure the script URL
     */
    configure(scriptUrl) {
        this.scriptUrl = scriptUrl;
        console.log('Sync Manager configured with URL:', scriptUrl);
    }

    /**
     * Preload all data into cache
     */
    async preloadCache() {
        const keys = [
            'starcity_users',
            'starcity_stock',
            'starcity_sales',
            'starcity_repairs',
            'starcity_warranty',
            'starcity_customer_credits',
            'starcity_vendor_credits',
            'starcity_expenses'
        ];

        for (const key of keys) {
            try {
                await this.getData(key);
            } catch (error) {
                console.error('Failed to preload:', key, error);
            }
        }
    }
}

// Create global sync manager instance
window.syncManager = new SyncManager();
