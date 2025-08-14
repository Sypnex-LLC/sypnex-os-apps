# SypnexOS App Integration Guide

This guide provides essential patterns and best practices for building apps that integrate seamlessly with the SypnexOS ecosystem. It covers UI consistency, SypnexAPI usage, and common development patterns to ensure your app feels native to the platform.

## Table of Contents

- [Core Principles](#core-principles)
- [Getting Started](#getting-started)
- [UI Components & Styling](#ui-components--styling)
- [File Operations](#file-operations)
- [User Interface Patterns](#user-interface-patterns)
- [App Configuration](#app-configuration)
- [Advanced Features](#advanced-features)
- [HTTP Requests](#http-requests)
- [Best Practices](#best-practices)

---

## Core Principles

### System Integration
- **SypnexAPI is globally available** - No need to instantiate it in your app
- **Inherit system styles** - Your app should look consistent with the overall OS
- **Window management is handled** - Minimize, maximize, and close functionality is provided automatically
- **Avoid recreating system components** - Use existing styles and components whenever possible

### App Structure Requirements
- All apps must be wrapped in the `app-container` class
- No inline JavaScript or CSS in `index.html`
- Use event listeners instead of `onclick` attributes
- Check DOM ready state before initialization

---

## Getting Started

### App Initialization
Always check if the DOM is loaded before initializing your app:

```javascript
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initYourApp);
} else {
    // DOM is already loaded
    initYourApp();
}
```

### Basic App Structure
```html
<div class="app-container">
    <!-- Optional: Add app header for buttons, controls, and navigation -->
    <div class="app-header">
        <div class="header-content">
            <div class="header-text">
                <h2><i class="fas fa-your-icon"></i> Your App Name</h2>
                <p>App description or subtitle</p>
            </div>
            <div class="header-controls">
                <!-- Place buttons, search bars, and controls here -->
                <button id="refresh-btn" class="btn btn-primary">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        </div>
    </div>
    
    <!-- Your main app content here -->
    <div class="app-content">
        <!-- App body content -->
    </div>
</div>
```

**Note**: The `app-header` provides a consistent area for placing buttons, search controls, and navigation elements at the top of your app.

### Event Handling
Use event listeners instead of inline event handlers:

```javascript
// ❌ Don't use onclick in HTML
// <button onclick="saveFile()">Save</button>

// ✅ Use event listeners
const saveFileBtn = document.getElementById('save-file');
saveFileBtn?.addEventListener('click', saveFile);
```

---

## UI Components & Styling

### Buttons
Use the standard system button classes for consistency:

```html
<!-- Primary button -->
<button id="save-file" class="app-btn primary">
    <i class="fas fa-save"></i> Save
</button>

<!-- Secondary button -->
<button id="save-as-file" class="app-btn secondary">
    <i class="fas fa-save"></i> Save As
</button>

<!-- Active state -->
<button class="app-btn secondary active">Active Button</button>
```

### Toggle Switches
Use the system toggle styling:

```html
<label class="toggle-switch">
    <input type="checkbox" id="show-notifications-toggle" checked>
    <span class="toggle-slider"></span>
</label>
```

### Custom Styling
You can extend system classes in your own CSS:

```css
.app-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}
```

**Note**: Apps are auto-scoped, so you can't override global system settings. Don't worry too much about CSS naming conflicts.

---

## File Operations

### File Explorer Dialog
Use the SypnexAPI file explorer for consistent file operations:

```javascript
// Open file dialog
const filePath = await sypnexAPI.showFileExplorer({
    mode: 'open',
    title: 'Open Text File',
    initialPath: '/',
    onSelect: (selectedPath) => {
        // Handle file selection
    },
    onCancel: () => {
        // Handle cancellation
    }
});

// Save file dialog
const filePath = await sypnexAPI.showFileExplorer({
    mode: 'save',
    title: 'Save Text File',
    initialPath: '/',
    fileName: 'untitled.txt',
    onSelect: (selectedPath) => {
        // Handle save location
    },
    onCancel: () => {
        // Handle cancellation
    }
});
```

### Virtual File System (VFS) Operations

```javascript
// Read file content
const content = await sypnexAPI.readVirtualFileText(filePath);

// Write file content
await sypnexAPI.writeVirtualFile(filePath, content);
```

### Notifications
Show user feedback with the notification system:

```javascript
sypnexAPI.showNotification(`File saved as: ${filePath}`, 'success');
```

---

## User Interface Patterns

### Input Modals
Replace native prompts with SypnexAPI input modals:

```javascript
const tagName = await sypnexAPI.showInputModal(
    'Create New Tag',
    'Tag Name:',
    {
        placeholder: 'Enter tag name',
        confirmText: 'Create Tag',
        cancelText: 'Cancel',
        icon: 'fas fa-tag'
    }
);
```

### Confirmation Dialogs
Use system confirmation modals:

```javascript
const confirmed = await sypnexAPI.showConfirmation(
    'Delete Node',
    'Are you sure you want to delete this node?',
    {
        type: 'danger',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        icon: 'fas fa-cube'
    }
);
```

### Hamburger Menus
Create consistent navigation menus:

```javascript
const setupHamburgerMenu = () => {
    const menuItems = [
        {
            icon: 'fas fa-sync-alt',
            text: 'Refresh',
            action: refreshFiles
        },
        { type: 'separator' },
        {
            icon: 'fas fa-folder-plus',
            text: 'New Folder',
            action: createFolder
        },
        {
            icon: 'fas fa-upload',
            text: 'Upload File',
            action: uploadFile
        }
    ];

    hamburgerMenu = SypnexAPI.createHamburgerMenu(breadcrumbActions, menuItems, {
        position: 'right',
        buttonClass: 'vfs-menu-btn'
    });
};
```

### Keyboard Shortcuts
Register keyboard shortcuts using SypnexAPI:

```javascript
sypnexAPI.registerKeyboardShortcuts({
    'delete': () => {
        if (selectedNode) {
            deleteSelectedNode();
        }
    },
    'ctrl+backspace': () => {
        if (selectedNode) {
            deleteSelectedNode();
        }
    },
    'ctrl+s': () => {
        saveFile();
    }
});
```

---

## App Configuration

### Settings Management
Read and write app settings:

```javascript
// Read settings with defaults
const autoSaveInterval = await sypnexAPI.getSetting('AUTO_SAVE_INTERVAL', 30);
const fontSize = await sypnexAPI.getSetting('FONT_SIZE', 14);

// Write settings
await sypnexAPI.setSetting('FONT_SIZE', 16);
```

### App Identity
Get your app's unique identifier dynamically:

```javascript
// Get your app ID - never hardcode this value
const appId = sypnexAPI.getAppId();
console.log('Current app ID:', appId);

// Use in API calls or logging
sypnexAPI.showNotification(`App ${appId} initialized successfully`, 'info');
```

**Important**: Always use `sypnexAPI.getAppId()` instead of hardcoding your app ID. This ensures your app works correctly across different environments and installations.

### Meta File Configuration
Include additional resources in your `.app` meta file:

```json
{
  "scripts": [
    "js/utils.js",
    "js/node-registry.js"
  ],
  "styles": [
    "css/layout.css",
    "css/nodes.css"
  ],
  "settings": [
    {
      "key": "DEFAULT_HTTP_TIMEOUT",
      "name": "HTTP Timeout (ms)",
      "type": "number",
      "value": 30000,
      "description": "Default timeout for HTTP requests in milliseconds"
    },
    {
      "key": "AUTO_SAVE_INTERVAL",
      "name": "Auto Save Interval (s)",
      "type": "number",
      "value": 30,
      "description": "Auto save workflows every N seconds (0 = disabled)",
      "encrypt": "true"
    }
  ]
}
```

**Note**: Use `"encrypt": "true"` for sensitive settings that should be encrypted at rest.

### Template Variables
If you have settings defined in your `.app` meta file, you can use template variables anywhere in your JavaScript or HTML code. The system will automatically populate these with the actual setting values:

```javascript
// If you have DEFAULT_HTTP_TIMEOUT in your .app settings
const timeout = {{DEFAULT_HTTP_TIMEOUT}}; // Automatically replaced with the value (e.g., 30000)

// Use in fetch calls
fetch(url, { 
    method: 'POST',
    timeout: {{DEFAULT_HTTP_TIMEOUT}}
});
```

```html
<!-- Use in HTML attributes or content -->
<input type="number" value="{{AUTO_SAVE_INTERVAL}}" max="{{MAX_SAVE_INTERVAL}}">
<span>Current timeout: {{DEFAULT_HTTP_TIMEOUT}}ms</span>
```

This eliminates the need to call `sypnexAPI.getSetting()` for every setting access, making your code cleaner and more performant.

### Intent System
If your app supports intents, check for pending intents when your app loads:

```javascript
const intentData = await sypnexAPI.getPreference('text_editor', '_pending_intent', null);
if (intentData) {
    // Handle the intent
    processIntent(intentData);
}
```

**Note**: Only implement intent handling if your app is designed to respond to system intents (e.g., "Open with..." functionality).

---

## Advanced Features

### Window Management
Use SypnexAPI instead of direct window access:

```javascript
// ❌ Don't use window directly
// window.close();

// ✅ Use SypnexAPI
const appWindow = sypnexAPI.getAppWindow();
```

### Complex Scaling (Canvas/Graphics)
For apps with complex scaling needs, use the SypnexAPI scaling library:

```javascript
// Used by for complex canvas scaling
const scalingManager = sypnexAPI.createScalingManager(canvasElement);
```

### Encryption for Custom Settings
If creating custom settings windows, use SypnexAPI encryption:

```javascript
// Encrypt sensitive data
const encryptedValue = await sypnexAPI.encrypt(sensitiveData);

// Decrypt when needed
const decryptedValue = await sypnexAPI.decrypt(encryptedValue);
```

---

## HTTP Requests

### Proxy HTTP Method
Use SypnexAPI for HTTP requests to handle CORS and routing:

```javascript
const proxyRequest = {
    url: url,
    method: method,
    headers: headers,
    body: processedBody,
    timeout: 30
};

try {
    const proxyResponse = await sypnexAPI.proxyHTTP(proxyRequest);
    
    if (!proxyResponse || proxyResponse.status < 200 || proxyResponse.status >= 300) {
        throw new Error(`Proxy request failed: ${proxyResponse?.status || 'Unknown error'}`);
    }
    
    if (proxyResponse.error) {
        throw new Error(`HTTP request failed: ${proxyResponse.error}`);
    }
    
    // Use proxyResponse data
    const data = proxyResponse;
    
} catch (error) {
    console.error('Request failed:', error);
}
```

---

## Best Practices

### Do's ✅
- Use system-provided UI components and styles
- Leverage SypnexAPI for all system interactions
- Follow the app-container structure
- Use event listeners instead of inline handlers
- Check DOM ready state before initialization
- Use SypnexAPI modals instead of native browser dialogs
- Utilize the VFS for file operations
- Register keyboard shortcuts through SypnexAPI

### Don'ts ❌
- Don't create big white containers that break system styling
- Don't use inline JavaScript or CSS in HTML
- Don't use `onclick` or other inline event handlers
- Don't access `window` directly
- Don't use native `prompt()`, `alert()`, or `confirm()`
- Don't recreate existing system components
- Don't make direct fetch calls (use proxyHTTP instead)

### When to Create Custom Components
Only create custom modals and components when the existing system components don't meet your specific requirements. The goal is to maintain consistency across the SypnexOS ecosystem while still allowing for app-specific functionality when needed.

---

## Development Tools

The SypnexOS CLI development tools automatically validate many of the requirements outlined in this guide during the build and deployment process. When you use the Sypnex CLI to pack or deploy your app, it will:

- ✅ Check for required `app-container` wrapper
- ✅ Validate proper DOM initialization patterns
- ✅ Detect inline JavaScript/CSS usage (and throw errors)
- ✅ Verify `onclick` and other inline event handlers aren't used
- ✅ Validate sandbox compliance (localStorage, window access, etc.)
- ✅ Check app meta file configuration
- ✅ Ensure proper file structure and dependencies

If your app doesn't follow these guidelines, the CLI tools will provide specific error messages to help you fix the issues before deployment. This automated validation helps ensure all apps maintain consistency and security standards within the SypnexOS ecosystem.

---

*This guide covers the essential patterns for SypnexOS app development. There are many additional APIs available for interacting with the virtual file system and other system features beyond what's covered here.*

