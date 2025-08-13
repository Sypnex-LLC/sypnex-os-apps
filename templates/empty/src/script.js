// Empty App JavaScript

console.log('Empty app loading...');

// Initialize when DOM is ready
function initApp() {
    console.log('Empty app initialized');
    
    // Check if SypnexAPI is available (local variable in sandboxed environment)
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }

    console.log('SypnexAPI available:', sypnexAPI);
    console.log('App ID:', sypnexAPI.getAppId());
    console.log('Initialized:', sypnexAPI.isInitialized());
    
    // Example: Use SypnexAPI for OS integration
    // sypnexAPI.showNotification('Hello from empty!');
    // sypnexAPI.openApp('terminal');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already loaded
    initApp();
}

// Add your custom JavaScript below
