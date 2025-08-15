// Load app settings
async function loadSettings() {
    try {
        textEditor.settings = {
            fontSize: await sypnexAPI.getSetting('FONT_SIZE', 14),
            tabSize: await sypnexAPI.getSetting('TAB_SIZE', 4),
            syntaxHighlighting: await sypnexAPI.getSetting('SYNTAX_HIGHLIGHTING', true)
        };
        
        // Apply settings
        textEditor.textarea.style.fontSize = textEditor.settings.fontSize + 'px';
        textEditor.textarea.style.tabSize = textEditor.settings.tabSize;
        
    } catch (error) {
        console.error('Failed to load settings:', error);
        // Use defaults
        textEditor.settings = {
            fontSize: 14,
            tabSize: 4,
            syntaxHighlighting: true
        };
    }
}


