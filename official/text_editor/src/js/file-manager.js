// Create new file
async function createNewFile() {
    if (textEditor.isModified) {
        try {
            const confirmed = await sypnexAPI.showConfirmation(
                'Unsaved Changes',
                'You have unsaved changes that will be lost.',
                'Are you sure you want to create a new file?',
                'Create New File',
                'warning'
            );
            
            if (confirmed) {
                clearEditor();
            }
        } catch (error) {
            console.error('Error showing confirmation:', error);
            // Fallback to native confirm if SypnexAPI fails
            if (confirm('You have unsaved changes. Create new file anyway?')) {
                clearEditor();
            }
        }
    } else {
        clearEditor();
    }
}

// Load file from VFS
async function loadFile() {
    // Check for unsaved changes first
    if (textEditor.isModified) {
        try {
            const confirmed = await sypnexAPI.showConfirmation(
                'Unsaved Changes',
                'You have unsaved changes that will be lost.',
                'Are you sure you want to load a new file?',
                'Load File',
                'warning'
            );
            
            if (!confirmed) {
                return; // User cancelled
            }
        } catch (error) {
            console.error('Error showing confirmation:', error);
            // Fallback to native confirm if SypnexAPI fails
            if (!confirm('You have unsaved changes. Load new file anyway?')) {
                return;
            }
        }
    }

    try {
        const filePath = await sypnexAPI.showFileExplorer({
            mode: 'open',
            title: 'Open Text File',
            initialPath: '/',
            onSelect: (selectedPath) => {
            },
            onCancel: () => {
            }
        });

        if (!filePath) {
            return; // User cancelled
        }

        // Use the helper function to load the file
        await loadFileByPath(filePath);

    } catch (error) {
        console.error('Failed to load file:', error);
        sypnexAPI.showNotification(`Failed to load file: ${error.message}`, 'error');
    }
}

// Helper function to load a file by path (used by both interactive load and intent system)
async function loadFileByPath(filePath) {
    try {
        // Check if file exists and load it
        const content = await sypnexAPI.readVirtualFileText(filePath);

        // Load content into editor
        textEditor.textarea.value = content;
        textEditor.filePath = filePath;
        textEditor.originalContent = content;

        // Update UI
        updateFilenameDisplay();
        updateLineNumbers();
        updateStatus();
        markAsSaved();

        // Enable syntax highlighting for loaded file
        await enableSyntaxHighlighting();

        // Force update highlighted content if highlighting is enabled
        if (textEditor.syntaxHighlightingEnabled && textEditor.highlightedEditor) {
            updateHighlightedContent();
        }

        sypnexAPI.showNotification(`File loaded: ${filePath}`, 'success');

    } catch (error) {
        console.error('Failed to load file by path:', error);
        sypnexAPI.showNotification(`Failed to load file: ${error.message}`, 'error');
        throw error;
    }
}


// Save file to VFS
async function saveFile() {
    const content = textEditor.textarea.value;

    try {
        let filePath = textEditor.filePath;

        // If it's a new file (untitled) or we want to save as, show file explorer
        if (textEditor.filePath === '/untitled.txt') {
            filePath = await sypnexAPI.showFileExplorer({
                mode: 'save',
                title: 'Save Text File',
                initialPath: '/',
                fileName: 'untitled.txt',
                onSelect: (selectedPath) => {
                },
                onCancel: () => {
                }
            });

            if (!filePath) {
                return; // User cancelled
            }
        }

        await sypnexAPI.writeVirtualFile(filePath, content);

        textEditor.filePath = filePath;
        updateFilenameDisplay();
        markAsSaved();

        // Enable syntax highlighting for saved file
        await enableSyntaxHighlighting();

        // Force update highlighted content if highlighting is enabled
        if (textEditor.syntaxHighlightingEnabled && textEditor.highlightedEditor) {
            updateHighlightedContent();
        }

        sypnexAPI.showNotification(`File saved: ${filePath}`, 'success');

    } catch (error) {
        console.error('Failed to save file:', error);
        sypnexAPI.showNotification(`Failed to save file: ${error.message}`, 'error');
    }
}

// Save file as (always show file explorer)
async function saveAsFile() {
    const content = textEditor.textarea.value;

    try {
        const filePath = await sypnexAPI.showFileExplorer({
            mode: 'save',
            title: 'Save Text File As',
            initialPath: '/',
            fileName: textEditor.filePath === '/untitled.txt' ? 'untitled.txt' : textEditor.filePath.split('/').pop(),
            onSelect: (selectedPath) => {
            },
            onCancel: () => {
            }
        });

        if (!filePath) {
            return; // User cancelled
        }

        await sypnexAPI.writeVirtualFile(filePath, content);

        textEditor.filePath = filePath;
        updateFilenameDisplay();
        markAsSaved();

        // Enable syntax highlighting for saved file
        await enableSyntaxHighlighting();

        // Force update highlighted content if highlighting is enabled
        if (textEditor.syntaxHighlightingEnabled && textEditor.highlightedEditor) {
            updateHighlightedContent();
        }

        sypnexAPI.showNotification(`File saved as: ${filePath}`, 'success');

    } catch (error) {
        console.error('Failed to save file as:', error);
        sypnexAPI.showNotification(`Failed to save file as: ${error.message}`, 'error');
    }
}
