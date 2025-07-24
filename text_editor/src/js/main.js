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
    cursorPosition: 0,
    // Code validation
    pyodideLoaded: false,
    validationEnabled: true,
    validationDebounceTimer: null,
    currentErrors: [],
    errorMarkers: []
};

// DOM elements
let newFileBtn, loadFileBtn, saveFileBtn, saveAsFileBtn;
let currentFilenameEl, wordWrapToggle, lineNumbersToggle, syntaxHighlightingToggle, validationToggle;
let modifiedStatusEl, errorCountEl;

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
    validationToggle = document.getElementById('validation-toggle');
    
    modifiedStatusEl = document.getElementById('modified-status');
    errorCountEl = document.getElementById('error-count');
    
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
    if (validationToggle) {
        validationToggle.classList.toggle('active', textEditor.validationEnabled);
    }
    
    // Text Editor loaded successfully (no notification needed)
    
    // Check for pending intents AFTER everything is fully initialized
    checkForAppIntent();
    
}

// Check for app intents (e.g., file to open from VFS)
async function checkForAppIntent() {
    try {
        console.log('Text Editor: Checking for app intent...');
        
        // Read intent from user preferences (where it's stored)
        const intentData = await sypnexAPI.getPreference('text_editor', '_pending_intent', null);
        console.log('Text Editor: Intent data from preferences:', intentData);
        
        if (intentData && intentData.action === 'open_file') {
            console.log('Text Editor: Processing file open intent:', intentData);
            
            const fileData = intentData.data;
            if (fileData && fileData.filePath) {
                console.log('Text Editor: Loading file:', fileData.filePath);
                
                // Use existing file loading logic instead of duplicating it
                await loadFileByPath(fileData.filePath);
                
                // Clear the intent since we consumed it (set to null)
                await sypnexAPI.setPreference('text_editor', '_pending_intent', null);
                
                console.log('Text Editor: Successfully opened file from intent');
            } else {
                console.warn('Text Editor: Invalid file data in intent:', fileData);
            }
        } else {
            console.log('Text Editor: No intent found or wrong action type');
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