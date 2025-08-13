// Menu App JavaScript

console.log('Menu app loading...');

// Initialize when DOM is ready
function initApp() {
    console.log('Menu app initialized');
    
    // Check if SypnexAPI is available (local variable in sandboxed environment)
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }

    console.log('SypnexAPI available:', sypnexAPI);
    console.log('App ID:', sypnexAPI.getAppId());
    console.log('Initialized:', sypnexAPI.isInitialized());
    
    setupMenu();
    // Example: Use SypnexAPI for OS integration
    // sypnexAPI.showNotification('Hello from menu!');
    // sypnexAPI.openApp('terminal');
}



function setupMenu(){
        const menuActions = document.querySelector('.template-menu');
            if (menuActions) {
                const menuItems = [
                    {
                        icon: 'fas fa-sync-alt',
                        text: 'Item 1',
                        action: function() { sypnexAPI.showNotification('Hello from menu 1!'); }
                    },
                    { type: 'separator' },
                    {
                        icon: 'fas fa-folder-plus',
                        text: 'Item 2',
                        action: function() { sypnexAPI.showNotification('Hello from menu 2!'); }
                    },
                    {
                        icon: 'fas fa-upload',
                        text: 'Item 3',
                        action: function() { sypnexAPI.showNotification('Hello from menu 3!'); }
                    }
                ];

                hamburgerMenu = sypnexAPI.createHamburgerMenu(menuActions, menuItems, {
                    position: 'left',
                    buttonClass: 'app-btn'
                });
            }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already loaded
    initApp();
}

// Add your custom JavaScript below
