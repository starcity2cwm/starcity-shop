/**
 * STORAGE ADAPTER - Bridges app.js localStorage calls to syncManager
 * This allows the app to work without modifying 4,723 lines of code
 */

// Override localStorage to use syncManager
const originalLocalStorage = window.localStorage;

window.localStorage = {
    // Sync wrapper for getItem
    getItem: function (key) {
        // For settings and non-critical data, use original localStorage as fallback
        if (key.includes('custom') || key === 'starcity_settings') {
            return originalLocalStorage.getItem(key);
        }

        // For main data, get from cache (already loaded by syncManager)
        return window.syncManager.cache[key] || originalLocalStorage.getItem(key);
    },

    // Sync wrapper for setItem
    setItem: function (key, value) {
        // Save to original localStorage immediately
        originalLocalStorage.setItem(key, value);

        // Queue for cloud sync (non-blocking)
        if (!key.includes('custom') && key !== 'starcity_settings') {
            window.syncManager.setData(key, value).catch(err => {
                console.warn('Cloud sync failed for', key, err);
            });
        }
    },

    // Pass through other methods
    removeItem: function (key) {
        originalLocalStorage.removeItem(key);
    },

    clear: function () {
        if (confirm('This will clear ALL local data. Are you sure?')) {
            originalLocalStorage.clear();
            window.syncManager.cache = {};
        }
    },

    key: function (index) {
        return originalLocalStorage.key(index);
    },

    get length() {
        return originalLocalStorage.length;
    }
};

// Preload data from cloud when app starts
window.addEventListener('DOMContentLoaded', async () => {
    console.log('Loading data from cloud...');

    // Clear all cached data to force fresh load from cloud
    localStorage.clear();
    console.log('Local cache cleared - loading fresh data from cloud');

    // Show loader once at the start
    window.syncManager.showLoading('Loading data from cloud...');

    try {
        // Load all data into cache
        const keys = [
            'starcity_users',
            'starcity_stock',
            'starcity_sales',
            'starcity_repairs',
            'starcity_warranty',
            'starcity_customer_credits',
            'starcity_vendor_credits',
            'starcity_expenses',
            'starcity_vendors',
            'starcity_purchases'
        ];

        for (const key of keys) {
            // Pass showLoader = false to prevent multiple loaders
            const data = await window.syncManager.getData(key, false);
            if (data) {
                originalLocalStorage.setItem(key, data);
            }
        }

        console.log('✓ Cloud data loaded successfully');

        // Trigger a custom event that app can listen to
        window.dispatchEvent(new Event('cloudDataLoaded'));

    } catch (error) {
        console.error('Failed to load cloud data:', error);
        console.log('Using local data as fallback');
    } finally {
        // Always hide the loader when done
        window.syncManager.forceHideLoading();
    }
});

// Sync local changes to cloud periodically
setInterval(() => {
    if (window.syncManager.isOnline && window.syncManager.pendingSync.length > 0) {
        window.syncManager.syncPendingOperations();
    }
}, 30000); // Every 30 seconds

// Sync before page unload
window.addEventListener('beforeunload', () => {
    if (window.syncManager.pendingSync.length > 0) {
        // Try to sync (note: this may not always complete)
        window.syncManager.syncPendingOperations();
    }
});
