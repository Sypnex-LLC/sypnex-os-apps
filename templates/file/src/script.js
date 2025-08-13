// File App JavaScript

console.log('File app loading...');

// Initialize when DOM is ready
function initApp() {
    console.log('File app initialized');
    
    // Check if SypnexAPI is available (local variable in sandboxed environment)
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }

    console.log('SypnexAPI available:', sypnexAPI);
    console.log('App ID:', sypnexAPI.getAppId());
    console.log('Initialized:', sypnexAPI.isInitialized());
    
    // Example: Use SypnexAPI for OS integration
    // sypnexAPI.showNotification('Hello from file!');
    // sypnexAPI.openApp('terminal');
    document.getElementById('save-button').addEventListener('click', () => {
        saveValue();
    });

    document.getElementById('load-button').addEventListener('click', () => {
        loadValue();
    });
}

async function saveValue()
{
    const saveInput = document.getElementById('save-input');
    await sypnexAPI.writeVirtualFile("/simple-test.txt", saveInput.value);
    sypnexAPI.showNotification('value saved',"success");
    //alert(saveInput.value);
}

async function loadValue()
{
    const loadInput = document.getElementById('load-input');
    var val = await sypnexAPI.readVirtualFileText("/simple-test.txt");
    loadInput.value=val;
    //alert(val);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already loaded
    initApp();
}

// Add your custom JavaScript below
