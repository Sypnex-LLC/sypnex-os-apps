// Text Editor App

// Global variables
let textEditor = {
    textarea: null,
    lineNumbers: null,
    filePath: null,
    originalContent: '',
    isModified: false,
    autoSaveInterval: null,
    wordWrapEnabled: false,
    lineNumbersEnabled: true,
    settings: {},
    // Syntax highlighting
    prismLoaded: false,
    syntaxHighlightingEnabled: false,
    highlightedEditor: null,
    highlightContainer: null,
    originalTextareaStyles: null,
    debounceTimer: null,
    // Cursor position tracking
    cursorPosition: 0
};

// DOM elements
let newFileBtn, loadFileBtn, saveFileBtn, saveAsFileBtn;
let currentFilenameEl, wordWrapToggle, lineNumbersToggle, syntaxHighlightingToggle;
let modifiedStatusEl;

// Initialize when DOM is ready
async function initTextEditor() {
    
    // Check if SypnexAPI is available
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }

    
    // Test if app container exists
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
    }
    
    // Get DOM elements
    textEditor.textarea = document.getElementById('text-editor');
    textEditor.lineNumbers = document.getElementById('line-numbers');
    
    newFileBtn = document.getElementById('new-file');
    loadFileBtn = document.getElementById('load-file');
    saveFileBtn = document.getElementById('save-file');
    saveAsFileBtn = document.getElementById('save-as-file');
    currentFilenameEl = document.getElementById('current-filename');
    wordWrapToggle = document.getElementById('word-wrap-toggle');
    lineNumbersToggle = document.getElementById('line-numbers-toggle');
    syntaxHighlightingToggle = document.getElementById('syntax-highlighting-toggle');
    
    modifiedStatusEl = document.getElementById('modified-status');
    
    // Critical element checks
    if (!textEditor.textarea) {
        console.error('Text editor textarea not found');
        return;
    }
    
    if (!textEditor.lineNumbers) {
        console.error('Line numbers element not found');
        return;
    }
    
    
    // Load settings (WAIT for them to complete)
    await loadSettings();
    
    // Set up event handlers
    setupEventHandlers();
    
    // Initialize editor state
    initializeEditor();
    
    // Set initial button states
    if (syntaxHighlightingToggle) {
        syntaxHighlightingToggle.classList.toggle('active', textEditor.settings.syntaxHighlighting);
    }
    
    // Text Editor loaded successfully (no notification needed)
    
    // Check for pending intents AFTER everything is fully initialized
    checkForAppIntent();
    
}

// Check for app intents (e.g., file to open from VFS)
async function checkForAppIntent() {
    try {
        
        // Read intent from user preferences (where it's stored)
        const intentData = await sypnexAPI.getPreference('text_editor', '_pending_intent', null);
        
        if (intentData && intentData.action === 'open_file') {
            
            const fileData = intentData.data;
            if (fileData && fileData.filePath) {
                
                // Use existing file loading logic instead of duplicating it
                await loadFileByPath(fileData.filePath);
                
                // Clear the intent since we consumed it (set to null)
                await sypnexAPI.setPreference('text_editor', '_pending_intent', null);
                
            } else {
                console.warn('Text Editor: Invalid file data in intent:', fileData);
            }
        } else {
        }
    } catch (error) {
        console.error('Text Editor: Error checking for app intent:', error);
    }
}






// Replace the original initTextEditor call
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTextEditor);
} else {
    // DOM is already loaded
    initTextEditor();
} 