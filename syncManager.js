/**
 * SYNC MANAGER - Cloud Database Layer
 * Replaces localStorage with Google Sheets backend
 * Works with existing Code.gs backend
 */

class SyncManager {
    constructor() {
        this.scriptUrl = 'https://script.google.com/macros/s/AKfycbzKSaY_UQBEl_meRDtaaDOajqc5iYfT5PcYomg2ADWaPP75zubx1Hv1W8ZuZ7-76Ma4ig/exec'; // Production URL
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

            // Robustness check: Backend might return HTML on misconfiguration
            if (typeof response === 'string' && (response.includes('<!DOCTYPE html>') || response.includes('<html'))) {
                console.error('Invalid backend response: Received HTML instead of data');
                return this.cache[key] || null;
            }

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
     * Show/hide loading indicator
     */
    showLoading(message = 'Syncing...') {
        let loader = document.getElementById('sync-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'sync-loader';
            loader.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 1rem 2rem;
                border-radius: 8px;
                z-index: 99999;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-size: 0.9rem;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            `;
            document.body.appendChild(loader);
        }
        loader.innerHTML = `
            <span style="animation: spin 1s linear infinite; display: inline-block;">⏳</span> 
            ${message}
            <button onclick="window.syncManager.hideLoading()" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.75rem;
                margin-left: 0.5rem;
            ">✕</button>
        `;
        loader.style.display = 'flex';
    }

    hideLoading() {
        const loader = document.getElementById('sync-loader');
        if (loader) loader.style.display = 'none';
    }

    /**
     * Call Google Apps Script backend using JSONP (required for CORS)
     */
    async callBackend(functionName, args = [], showLoader = true) {
        if (showLoader) this.showLoading('Syncing data...');

        // Safety timeout to auto-hide loader after 15 seconds
        const safetyTimeout = setTimeout(() => {
            this.hideLoading();
            console.warn('Sync safety timeout reached');
        }, 15000);

        return new Promise((resolve, reject) => {
            // Generate unique callback name
            const callbackName = 'jsonp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            const cleanup = () => {
                clearTimeout(safetyTimeout);
                this.hideLoading();
                delete window[callbackName];
                const script = document.getElementById(callbackName);
                if (script) script.remove();
            };

            // Create global callback function
            window[callbackName] = (data) => {
                cleanup();
                // Check if data is actually valid (not HTML content from redirection)
                if (typeof data === 'string' && (data.includes('<!DOCTYPE') || data.includes('<html'))) {
                    reject(new Error('Backend returned HTML instead of data - script may be misconfigured'));
                } else {
                    resolve(data);
                }
            };

            // Build URL
            const params = new URLSearchParams({
                function: functionName,
                arguments: JSON.stringify(args),
                callback: callbackName
            });

            // Create script tag
            const script = document.createElement('script');
            script.id = callbackName;
            script.src = `${this.scriptUrl}?${params}`;
            script.onerror = () => {
                cleanup();
                reject(new Error('Connection to backend failed'));
            };

            // Request timeout
            setTimeout(() => {
                if (window[callbackName]) {
                    cleanup();
                    reject(new Error('Sync timeout - check your connection'));
                }
            }, 12000);

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
