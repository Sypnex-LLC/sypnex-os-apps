# Sypnex OS User App Development Guide

> **📦 Official Apps Repository**: You're in the right place! This repository contains ready-to-use applications, development utilities, and comprehensive guides for building on Sypnex OS.

> **🛠️ Development Tools**: For streamlined development, use our [unified CLI](devtools/README.md) which provides a single interface for all development tasks with **100% decoupled** project structure - create apps anywhere!

> **🎯 Key Innovation**: Our development CLI is completely decoupled from project structure. You can create, deploy, and manage apps from any location on your system - no assumptions about where your files should be!

## 🚀 Quick Start

Create your first app in 3 simple steps (anywhere on your system!):

### 1. Create App Structure
```
my_app/
├── src/
│   ├── index.html    # App content (NO DOCTYPE/head/body)
│   ├── style.css     # App-specific styles only
│   └── main.js       # App logic
└── my_app.app        # App metadata
```

### 2. Create Your .app File
```json
{
  "id": "my_app",
  "name": "My Application", 
  "description": "What my app does",
  "icon": "fas fa-star",
  "type": "user_app",
  "scripts": ["main.js"],
  "settings": [
    {
      "key": "MY_SETTING",
      "name": "My Setting",
      "type": "string", 
      "value": "default",
      "description": "Setting description"
    }
  ]
}
```

### 3. Write Your HTML (Content Only)
```html
<!-- NO DOCTYPE, head, body, or external links! -->
<div class="app-container">
  <div class="app-header">
    <h1>My App</h1>
  </div>
  <div class="app-content">
    <!-- Your app content -->
  </div>
</div>
```

### 4. Initialize Your JavaScript
```javascript
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyApp);
} else {
    // DOM is already loaded
    initMyApp();
}

function initMyApp() {
    // Check if SypnexAPI is available
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
        // Your app initialization
        console.log('App ID:', sypnexAPI.getAppId());
    } else {
        console.error('SypnexAPI not available');
    }
}

console.log('My App script loaded');
```

### 5. Test Your App

**👉 [Development CLI Guide](devtools/README.md)** - Complete guide to unified development tools

Use the CLI for streamlined development:

```bash
# Navigate to development tools
cd devtools

# Create new app (scaffolds structure)
python sypnex.py create my_app

# Deploy for development testing
python sypnex.py deploy app my_app

# Package for distribution
python sypnex.py pack my_app
```

**🎨 Ready for advanced integration?** Check out the [App Integration Guide](SYPNEX_APP_INTEGRATION_GUIDE.md) for UI patterns, file operations, and advanced features.

## 🛠️ Development Tools

**[Unified CLI](devtools/README.md)** - Single interface for all development tasks

### Using the CLI
```bash
# Navigate to development tools
cd devtools

# Create a new app with proper structure
python sypnex.py create my_awesome_app

# Or use a specific template with example functionality
python sypnex.py create my_calculator --template=basic     # UI components & settings
python sypnex.py create my_editor --template=file         # File operations
python sypnex.py create my_tool --template=keybinds       # Keyboard shortcuts
python sypnex.py create my_dashboard --template=menu      # Navigation menu
python sypnex.py create my_api_client --template=network  # HTTP requests

# Creates:
# my_awesome_app/
# ├── my_awesome_app.app    # App metadata
# └── src/
#     ├── index.html        # Main interface
#     ├── style.css         # Styling  
#     └── main.js           # JavaScript logic
```

### Development Deployment

**CLI:**
```bash
cd devtools

# Quick deployment for testing
python sypnex.py deploy app my_app
```

### Production Packaging

**CLI:**
```bash
cd devtools

# Package app for distribution
python sypnex.py pack my_app
```

### VFS Script Deployment

**CLI:**
```bash
cd devtools

# Deploy Python scripts to VFS
python sypnex.py deploy vfs script.py
```

## ❌ Common Mistakes to Avoid

### HTML Structure
❌ **Don't do this:**
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
  <div class="app-container">
    <!-- content -->
  </div>
</body>
</html>
```

✅ **Do this:**
```html
<div class="app-container">
  <div class="app-header">
    <h1>My App</h1>
  </div>
  <div class="app-content">
    <!-- content -->
  </div>
</div>
```

### JavaScript Initialization
❌ **Don't do this:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    if (window.SypnexAPI) { // Wrong API reference
        // ...
    }
});
```

✅ **Do this:**
```javascript
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyApp);
} else {
    initMyApp();
}

function initMyApp() {
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) { // Correct API reference
        // ...
    }
}
```

### Settings UI
❌ **Don't do this:**
```javascript
// Building custom settings UI
const settingsModal = document.getElementById('settingsModal');
// ... custom settings form
```

✅ **Do this:**
```javascript
// OS handles settings UI automatically based on .app file
const settings = await sypnexAPI.getAllAppSettings();
const mySetting = await sypnexAPI.getAppSetting('MY_SETTING', 'default');
```

## 📱 App Structure

A user app consists of the following structure:

```
my_app/
├── src/
│   ├── index.html    # Main app interface (content only)
│   ├── style.css     # App-specific styles only
│   ├── main.js       # App logic
│   └── [other files] # Additional resources
└── my_app.app        # App metadata
```

## 📋 App Metadata

The `.app` file contains metadata that describes your application:

```json
{
  "id": "my_app",
  "name": "My Application",
  "description": "A sample user application",
  "icon": "fas fa-star",
  "keywords": ["sample", "example", "demo"],
  "author": "Your Name",
  "version": "1.0.0",
  "type": "user_app",
  "scripts": [
    "main.js",
    "utils.js"
  ],
  "settings": [
    {
      "key": "API_ENDPOINT",
      "name": "API Endpoint",
      "type": "string",
      "value": "https://api.example.com",
      "description": "API endpoint URL"
    }
  ]
}
```

### Required Metadata Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| **id** | ✅ | Unique identifier for your app | `"my_app"` |
| **name** | ✅ | Display name shown in app manager | `"My Application"` |
| **description** | ✅ | Brief description of what your app does | `"A sample user application"` |
| **icon** | ✅ | Font Awesome icon class | `"fas fa-star"` |
| **type** | ✅ | Must be "user_app" | `"user_app"` |
| **scripts** | ✅ | Array of JavaScript files to load (in order) | `["main.js"]` |
| **keywords** | ❌ | Array of searchable keywords | `["sample", "demo"]` |
| **author** | ❌ | Your name or organization | `"Your Name"` |
| **version** | ❌ | Semantic version string | `"1.0.0"` |
| **settings** | ❌ | Array of configurable settings | See settings section |

## 🎨 HTML Structure

Your `index.html` should contain **only the app content** - no DOCTYPE, head, body, or external links.

**Note**: You must include the `<div class="app-container">` wrapper yourself. The OS does not automatically inject it.

### ✅ Correct HTML Structure
```html
<div class="app-container">
    <div class="app-header">
        <h2><i class="fas fa-star"></i> My App</h2>
        <p>Description of what your app does</p>
    </div>

    <div class="app-content">
        <!-- Your app content goes here -->
        <div id="app-content">
            Hello from my app!
        </div>
    </div>
</div>
```

### ❌ Wrong HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My App</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="app-container">
        <!-- content -->
    </div>
    <script src="main.js"></script>
</body>
</html>
```

## 🎨 CSS Best Practices

### Sandboxing Model
Your app runs in a sandboxed environment. The OS provides:
- **Base styles** via CSS variables
- **Standard components** via app-standards.css
- **Isolated scope** to prevent conflicts

### Available OS CSS Variables
```css
/* Use these variables instead of hardcoding colors */
.my-app-element {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    color: var(--text-secondary);
    color: var(--accent-color);
}
```

### Naming Convention
**Only style your app-specific content. Don't recreate OS container styles:**

```css
/* ✅ Good - App-specific content only */
.my-app-widget { }
.my-app-button { }
.my-app-card { }
.my-app-status { }

/* ❌ Bad - Don't style OS containers */
.app-container { }
.app-header { }
.app-content { }
```

### Example CSS
```css
/* My App - App-specific content styles only */
.my-app-widget {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.my-app-button {
    background: var(--accent-color);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1rem;
    cursor: pointer;
}

.my-app-button:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
}

.my-app-status {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-top: 0.5rem;
}
```

## 💻 JavaScript Development

### VS Code IntelliSense Support

For the best development experience, install the [Sypnex OS API Support VS Code extension](https://github.com/Sypnex-LLC/sypnex-os-vscode-extension):

1. Download the latest `.vsix` file from the [VS Code extension releases](https://github.com/Sypnex-LLC/sypnex-os-vscode-extension/releases)
2. Install in VS Code: `Ctrl+Shift+P` → "Extensions: Install from VSIX"
3. Get intelligent autocomplete and documentation for all 65+ SypnexAPI methods

### Initialization Pattern
Use this pattern to ensure your app initializes correctly:

```javascript
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMyApp);
} else {
    // DOM is already loaded
    initMyApp();
}

function initMyApp() {
    // Check if SypnexAPI is available
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
        console.log('App ID:', sypnexAPI.getAppId());
        console.log('Initialized:', sypnexAPI.isInitialized());
        
        // Your app initialization
        setupEventListeners();
        loadInitialData();
    } else {
        console.error('SypnexAPI not available');
        document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: SypnexAPI not available</div>';
    }
}

// Clean up when app is closed
window.addEventListener('beforeunload', () => {
    // Cleanup code
});

console.log('My App script loaded');
```

### SypnexAPI Access

Your app has access to the SypnexAPI through the global `sypnexAPI` object (lowercase):

```javascript
// ✅ Correct API reference
const api = sypnexAPI;

// ❌ Wrong API reference
const api = window.SypnexAPI;

// Check if SypnexAPI is available
if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
    console.warn('SypnexAPI not available - running in standalone mode');
    return;
}

console.log('App ID:', sypnexAPI.getAppId());
console.log('Initialized:', sypnexAPI.isInitialized());
```

### ⚠️ Event Handling in Sandboxed Environment

**CRITICAL:** Apps run in a sandboxed environment where inline `onclick` handlers may not work reliably.

#### ❌ DON'T use inline onclick handlers:
```html
<!-- This may not work in the sandbox! -->
<button onclick="myFunction()">Click me</button>
<button onclick="appendNumber('5')">5</button>
```

#### ✅ DO use event listeners set up after DOM ready:
```html
<!-- Use data attributes instead -->
<button data-action="my-action" data-value="5">5</button>
<button data-action="calculate">Calculate</button>
```

```javascript
function initMyApp() {
    // ... other initialization code ...
    
    // Set up event listeners after DOM is ready
    setupEventListeners();
}

function setupEventListeners() {
    // Add click event listeners to all buttons
    const buttons = document.querySelectorAll('[data-action]');
    buttons.forEach(button => {
        button.addEventListener('click', handleButtonClick);
    });
}

function handleButtonClick(event) {
    const button = event.target;
    const action = button.getAttribute('data-action');
    const value = button.getAttribute('data-value');
    
    switch(action) {
        case 'my-action':
            myFunction(value);
            break;
        case 'calculate':
            calculate();
            break;
        // ... other actions
    }
}
```

#### Why This Matters:
- **Sandbox Security**: Inline handlers can't access functions in the app's scope
- **Function Scope**: Functions defined after DOM load may not be globally accessible
- **Reliability**: Event listeners are more reliable in isolated environments

#### Required .app Configuration:
Make sure your `.app` file includes the `scripts` array:
```json
{
  "id": "my_app",
  "scripts": ["main.js"],  // ⚠️ CRITICAL: Without this, JS won't load!
  "type": "user_app"
}
```

**Common Error:** Forgetting the `scripts` array results in "function not defined" errors.

### App Settings

The OS automatically handles settings UI based on your `.app` file. Access settings via API:

```javascript
// Get a setting with default value
const endpoint = await sypnexAPI.getAppSetting('API_ENDPOINT', 'https://default.com');

// Set a setting
await sypnexAPI.setAppSetting('API_ENDPOINT', 'https://new-endpoint.com');

// Get all settings
const allSettings = await sypnexAPI.getAllAppSettings();

// ❌ Don't build custom settings UI - the OS handles this automatically
```

### Virtual File System

Interact with the OS file system:

```javascript
// List directory contents
const files = await sypnexAPI.vfs.listDirectory('/apps');

// Read a file
const content = await sypnexAPI.vfs.readFile('/apps/my_app/config.json');

// Write a file
await sypnexAPI.vfs.writeFile('/apps/my_app/data.json', JSON.stringify(data));

// Create a directory
await sypnexAPI.vfs.createDirectory('/apps/my_app/cache');

// Delete a file or directory
await sypnexAPI.vfs.deletePath('/apps/my_app/temp.txt');
```

### WebSocket Communication

Connect to the real-time messaging system:

```javascript
// Connect to WebSocket
sypnexAPI.socket.connect();

// Subscribe to events
sypnexAPI.socket.on('workflow_update', (data) => {
    console.log('Workflow updated:', data);
});

// Send messages
sypnexAPI.socket.emit('app_event', { message: 'Hello from my app!' });

// Disconnect
sypnexAPI.socket.disconnect();
```

### Notifications

Show system notifications:

```javascript
// Show different types of notifications
sypnexAPI.showNotification('App loaded successfully!', 'success');
sypnexAPI.showNotification('Warning: Low memory', 'warning');
sypnexAPI.showNotification('Error occurred', 'error');
sypnexAPI.showNotification('Information message', 'info');
```

### External Libraries

Load external CSS and JavaScript libraries from CDNs:

```javascript
// Load CSS
await sypnexAPI.libraries.loadCSS('https://cdn.example.com/style.css');

// Load JavaScript
await sypnexAPI.libraries.loadJS('https://cdn.example.com/library.js');

// Load from CDN with version (e.g., Three.js, Chart.js, etc.)
await sypnexAPI.libraries.loadLibrary('three', '0.150.0');
await sypnexAPI.libraries.loadLibrary('chart', '3.9.1');
```

## 🚀 Deployment & Testing

### Prerequisites
- [Sypnex OS](https://github.com/Sypnex-LLC/sypnex-os) running locally
- Python 3.7+ (for development tools)

### Developer Authentication Setup

The unified CLI uses secure configuration to manage authentication tokens.

#### Getting Your Developer Token

1. **Open System Settings** in your Sypnex OS instance
2. **Enable Developer Mode** - This will show the developer token section
3. **Copy the generated JWT token** - This token is valid for 1 year
4. **Configure the CLI** with your token:

```bash
# Navigate to devtools
cd devtools

# Copy the environment template
cp .env.example .env

# Edit .env file and set:
# SYPNEX_DEV_TOKEN=your_generated_jwt_token_here
# SYPNEX_SERVER=https://localhost:8080
# SYPNEX_INSTANCE=local-dev
```

#### Remote Deployment

You can deploy to remote Sypnex OS instances using the `--server` parameter or by updating your .env file:

```bash
# Deploy to remote instance (override .env)
python sypnex.py deploy app "C:\my_projects\my_app" --server https://your-instance.com/

# Deploy VFS files to remote instance
python sypnex.py deploy vfs "C:\scripts\script.py" --server https://your-instance.com/
```

**Note**: Make sure your remote instance has Developer Mode enabled and use the corresponding JWT token.

### Development Workflow

1. **Setup** - Configure the unified CLI (one-time setup)
   ```bash
   cd devtools
   cp .env.example .env
   # Edit .env and set your SYPNEX_DEV_TOKEN
   ```

2. **Create** - Use the unified CLI to scaffold new applications anywhere
   ```bash
   python sypnex.py create my_awesome_app --output "C:\my_projects"
   ```

3. **Develop** - Edit files in the `src/` directory of your app
4. **Test** - Use the unified CLI for quick deployment and testing with explicit paths
   ```bash
   python sypnex.py deploy app "C:\my_projects\my_awesome_app"
   ```

5. **Package** - Use the unified CLI to create distributable packages
   ```bash
   python sypnex.py pack "C:\my_projects\my_awesome_app"
   ```

6. **Deploy Scripts** - Deploy Python scripts to VFS from anywhere
   ```bash
   python sypnex.py deploy vfs "C:\my_scripts\automation.py"
   ```

7. **Deploy** - Install through Sypnex OS App Store

### Development Deployment
```bash
# Navigate to devtools first
cd devtools

# Deploy individual app for development (explicit path)
python sypnex.py deploy app "C:\my_projects\flow_editor"
```

### Production Deployment
```bash
# Navigate to devtools first
cd devtools

# Package an app for distribution (explicit path)
python sypnex.py pack "C:\my_projects\flow_editor"

# Install via Sypnex OS App Store
# Upload the generated .app file through the UI
```

## 📖 Complete Example: Simple Counter App

Here's a complete example of a simple counter app:

### my_counter.app
```json
{
  "id": "my_counter",
  "name": "Simple Counter",
  "description": "A simple counter application demo",
  "icon": "fas fa-calculator",
  "type": "user_app",
  "scripts": ["main.js"],
  "settings": [
    {
      "key": "START_VALUE",
      "name": "Starting Value",
      "type": "number",
      "value": 0,
      "description": "Initial counter value"
    },
    {
      "key": "STEP_SIZE",
      "name": "Step Size",
      "type": "number", 
      "value": 1,
      "description": "Amount to increment/decrement"
    }
  ]
}
```

### src/index.html
```html
<div class="app-container">
    <div class="app-header">
        <h2><i class="fas fa-calculator"></i> Simple Counter</h2>
        <p>A demo counter application</p>
    </div>

    <div class="app-content">
        <div class="counter-display">
            <div class="counter-value" id="counterValue">0</div>
        </div>
        
        <div class="counter-controls">
            <button data-action="decrement" class="counter-btn">
                <i class="fas fa-minus"></i> Decrease
            </button>
            <button data-action="reset" class="counter-btn reset">
                <i class="fas fa-undo"></i> Reset
            </button>
            <button data-action="increment" class="counter-btn">
                <i class="fas fa-plus"></i> Increase
            </button>
        </div>
        
        <div class="counter-info">
            <small>Step size: <span id="stepSize">1</span></small>
        </div>
    </div>
</div>
```

### src/style.css
```css
/* Simple Counter - App-specific styles only */
.counter-display {
    text-align: center;
    margin: 2rem 0;
}

.counter-value {
    font-size: 4rem;
    font-weight: bold;
    color: var(--accent-color);
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.counter-controls {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1rem;
}

.counter-btn {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
}

.counter-btn:hover {
    background: var(--accent-color);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.counter-btn.reset {
    background: var(--glass-border);
}

.counter-btn.reset:hover {
    background: #666;
}

.counter-info {
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
}
```

### src/main.js
```javascript
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCounterApp);
} else {
    initCounterApp();
}

let currentValue = 0;
let stepSize = 1;

function initCounterApp() {
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
        console.log('Counter App ID:', sypnexAPI.getAppId());
        
        // Load settings
        loadSettings();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load saved state
        loadSavedState();
        
    } else {
        console.error('SypnexAPI not available');
        document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: SypnexAPI not available</div>';
    }
}

async function loadSettings() {
    try {
        // Get settings from app configuration
        const startValue = await sypnexAPI.getAppSetting('START_VALUE', 0);
        stepSize = await sypnexAPI.getAppSetting('STEP_SIZE', 1);
        
        // Update UI
        document.getElementById('stepSize').textContent = stepSize;
        
        // Set initial value if no saved state
        if (currentValue === 0) {
            currentValue = startValue;
            updateDisplay();
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

function setupEventListeners() {
    // Add click event listeners to all buttons
    const buttons = document.querySelectorAll('[data-action]');
    buttons.forEach(button => {
        button.addEventListener('click', handleButtonClick);
    });
}

function handleButtonClick(event) {
    const button = event.target.closest('[data-action]');
    const action = button.getAttribute('data-action');
    
    switch(action) {
        case 'increment':
            increment();
            break;
        case 'decrement':
            decrement();
            break;
        case 'reset':
            reset();
            break;
    }
}

function increment() {
    currentValue += stepSize;
    updateDisplay();
    saveState();
    showNotification(`Increased by ${stepSize}`, 'success');
}

function decrement() {
    currentValue -= stepSize;
    updateDisplay();
    saveState();
    showNotification(`Decreased by ${stepSize}`, 'info');
}

async function reset() {
    const startValue = await sypnexAPI.getAppSetting('START_VALUE', 0);
    currentValue = startValue;
    updateDisplay();
    saveState();
    showNotification('Counter reset!', 'warning');
}

function updateDisplay() {
    document.getElementById('counterValue').textContent = currentValue;
}

function saveState() {
    // Save current value to window state
    if (sypnexAPI && sypnexAPI.saveWindowState) {
        sypnexAPI.saveWindowState({ counterValue: currentValue });
    }
}

async function loadSavedState() {
    try {
        const state = await sypnexAPI.getWindowState();
        if (state && state.counterValue !== undefined) {
            currentValue = state.counterValue;
            updateDisplay();
        }
    } catch (error) {
        console.error('Failed to load saved state:', error);
    }
}

function showNotification(message, type = 'info') {
    if (sypnexAPI && sypnexAPI.showNotification) {
        sypnexAPI.showNotification(message, type);
    }
}

// Clean up when app is closed
window.addEventListener('beforeunload', () => {
    saveState();
});

console.log('Counter App script loaded');
```

### Testing the Example

1. Create the app structure:
   ```bash
   cd devtools
   python sypnex.py create my_counter --output "C:\my_projects"
   ```

2. Replace the generated files with the example code above

3. Deploy for testing:
   ```bash
   python sypnex.py deploy app "C:\my_projects\my_counter"
   ```

4. Open Sypnex OS and launch your counter app!

## 🚨 Troubleshooting

### ⚠️ "Function not defined" / "ReferenceError" Errors

**Most Common Issue:** JavaScript functions not accessible to HTML buttons.

**Symptoms:**
- Console shows: `Uncaught ReferenceError: myFunction is not defined`
- Buttons don't respond to clicks
- App loads but interactions don't work

**Solutions:**
1. **Check `.app` file has `scripts` array:**
   ```json
   {
     "id": "my_app", 
     "scripts": ["main.js"],  // ← Must include this!
     "type": "user_app"
   }
   ```

2. **Use event listeners instead of inline onclick:**
   ```html
   <!-- ❌ Don't use onclick (may not work in sandbox) -->
   <button onclick="myFunction()">Click</button>
   
   <!-- ✅ Use data attributes + event listeners -->
   <button data-action="my-action">Click</button>
   ```

3. **Set up event listeners in initApp():**
   ```javascript
   function initApp() {
       // Set up all event listeners here
       document.querySelectorAll('[data-action]').forEach(button => {
           button.addEventListener('click', handleButtonClick);
       });
   }
   ```

### App Not Loading
- Check browser console for errors
- Verify `.app` file has correct `id` and `type` fields
- Ensure scripts are listed in correct order in `scripts` array
- Deploy with: `python sypnex.py deploy app app_name`

### Styles Not Working
- Check that CSS classes are prefixed with app name
- Verify you're using OS CSS variables, not hardcoded values
- Ensure no conflicts with OS class names

### JavaScript Not Running
- Check that initialization pattern is correct
- Verify `sypnexAPI` is available (lowercase)
- Check browser console for errors
- Ensure functions are defined globally (not inside other functions)

### Settings Not Working
- Verify settings are defined correctly in `.app` file
- Use `sypnexAPI.getAppSetting()` and `sypnexAPI.setAppSetting()`
- Don't build custom settings UI - OS handles this automatically

### Quick Debugging Checklist
- [ ] `.app` file has `"scripts": ["your-script.js"]` array
- [ ] JavaScript functions are defined globally (not inside other functions)  
- [ ] Using event listeners instead of inline onclick handlers
- [ ] HTML has no DOCTYPE, html, head, or body tags
- [ ] Deployed with `python sypnex.py deploy app app_name` after changes
- [ ] Browser console shows no JavaScript errors

## 🎯 Featured Applications

### Text Editor
A feature-rich code editor with:
- Syntax highlighting for multiple languages
- Integrated terminal
- File management
- Live preview capabilities

### App Store
Central hub for managing applications:
- Browse available apps
- Install new applications
- Manage installed apps
- Update existing apps

Learn more: [App Store README](app_store/APP_STORE_README.md)

### LLM Chat
AI chat interface for interacting with language models:
- Support for multiple AI models
- Context-aware conversations
- Integration with the OS ecosystem

## 🤝 Community & Support

### Getting Help
- **Questions & Support**: [GitHub Discussions](https://github.com/Sypnex-LLC/sypnex-os/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/Sypnex-LLC/sypnex-os/issues)
- **App Development Help**: Use the `app-development` tag in discussions

### Development Tools Support
- **VS Code Extension**: [Sypnex OS API Support](https://github.com/Sypnex-LLC/sypnex-os-vscode-extension) - IntelliSense for SypnexAPI
- **API Documentation**: Complete reference available with the VS Code extension

### Sharing Your Apps
We encourage developers to share their applications with the community:
- Fork this repository and add your app
- Create a pull request with your app and documentation
- Share screenshots and demos in GitHub Discussions
- Follow our [App Development Guidelines](#app-development-guidelines)

### Contributing to the Development Guide
This guide is community-maintained! If you:
- Find errors or unclear sections
- Have suggestions for improvements
- Want to add new examples or tutorials

Please submit a pull request or create an issue. Your experience helps other developers!

## 🔧 App Development Guidelines

When contributing apps to this repository:

### Code Quality
- Follow the standard app structure
- Include proper metadata in `.app` files
- Use the SypnexAPI for OS integration
- Test in development mode before submitting
- Document any special requirements

### Documentation
- Include a README for complex apps
- Document configuration options
- Provide usage examples
- Explain any dependencies

### Testing
- Test your changes using the development tools
- Verify functionality works as expected
- Check for console errors or warnings
- Test on different screen sizes (if relevant)

## 📚 Additional Resources

- **[Core Components Documentation](https://github.com/Sypnex-LLC/sypnex-os/blob/main/SYPNEX_OS_CORE_COMPONENTS.md)** - Detailed OS architecture
- **[Frontend Architecture Guide](https://github.com/Sypnex-LLC/sypnex-os/blob/main/SYPNEX_OS_FRONTEND_ARCHITECTURE.md)** - Frontend system design and APIs
- **[Sypnex OS Main Repository](https://github.com/Sypnex-LLC/sypnex-os)** - Core operating system
- **[VS Code Extension](https://github.com/Sypnex-LLC/sypnex-os-vscode-extension)** - Development tools
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to this repository

---

Happy app building! 🚀

*Official Sypnex OS Apps Repository - Build the future of web-based computing.*
