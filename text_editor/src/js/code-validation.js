// Load Pyodide for Python syntax validation
async function loadPyodide() {
    
    if (textEditor.pyodideLoaded && window.pyodide) {
        return window.pyodide;
    }
    
    try {
        
        // Load Pyodide script
        await sypnexAPI.loadLibrary('https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js', {
            localName: 'loadPyodide'
        });
        
        
        // Initialize Pyodide - use the global loadPyodide function
        window.pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
        });
        
        
        // Install validation function
        window.pyodide.runPython(`
import ast

def validate_python_syntax(code):
    """Validate Python syntax and return errors"""
    try:
        # Try to parse the code as an AST
        ast.parse(code)
        return {"valid": True, "errors": []}
    except SyntaxError as e:
        error_info = {
            "line": e.lineno or 1,
            "column": e.offset or 1, 
            "message": e.msg or "Syntax error",
            "type": "syntax"
        }
        return {"valid": False, "errors": [error_info]}
    except Exception as e:
        error_info = {
            "line": 1,
            "column": 1,
            "message": str(e),
            "type": "general"
        }
        return {"valid": False, "errors": [error_info]}
        `);
        
        textEditor.pyodideLoaded = true;
        
        // Show notification
        sypnexAPI.showNotification('Python validation ready!', 'success');
        
        return window.pyodide;
        
    } catch (error) {
        console.error('❌ Failed to load Pyodide:', error);
        sypnexAPI.showNotification('Failed to load Python validation: ' + error.message, 'error');
        throw error;
    }
}

// Validate Python syntax using Pyodide
async function validatePythonSyntax(code) {
    
    if (!textEditor.validationEnabled) {
        return {"valid": true, "errors": []};
    }
    
    try {
        const pyodide = await loadPyodide();
        
        // Call the Python validation function
        pyodide.globals.set("code_to_validate", code);
        const result = pyodide.runPython("validate_python_syntax(code_to_validate)");
        
        const jsResult = result.toJs({dict_converter: Object.fromEntries});
        
        return jsResult;
        
    } catch (error) {
        console.error('❌ Pyodide validation error:', error);
        
        // Fallback to basic client-side validation
        return validatePythonBasic(code);
    }
}

// Basic Python syntax validation (fallback)
function validatePythonBasic(code) {
    const errors = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
        const lineNum = index + 1;
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) return;
        
        // Check for unterminated strings (more accurate)
        let inString = false;
        let stringChar = null;
        let escaped = false;
        
        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];
            
            if (escaped) {
                escaped = false;
                continue;
            }
            
            if (char === '\\') {
                escaped = true;
                continue;
            }
            
            if (!inString && (char === '"' || char === "'")) {
                inString = true;
                stringChar = char;
            } else if (inString && char === stringChar) {
                inString = false;
                stringChar = null;
            }
        }
        
        if (inString) {
            errors.push({
                line: lineNum,
                column: 1,
                message: "Unterminated string literal",
                type: "syntax"
            });
        }
        
        // Check for missing colons after control structures (more precise)
        const controlStructures = /^(if|elif|else|for|while|def|class|try|except|finally|with|async\s+def)\s/;
        if (controlStructures.test(trimmed) && !trimmed.endsWith(':') && !trimmed.includes('#')) {
            errors.push({
                line: lineNum,
                column: trimmed.length,
                message: "Missing colon",
                type: "syntax"
            });
        }
        
        // Check for basic indentation errors (very basic)
        if (trimmed.match(/^(return|break|continue|pass|raise|yield)\s/) && line !== trimmed) {
            // These keywords should typically be at proper indentation levels
            // But this is too complex for basic validation, so skip it
        }
        
        // Only check parentheses on lines that seem to have function calls or definitions
        if (trimmed.includes('(') || trimmed.includes(')')) {
            const openParens = (trimmed.match(/\(/g) || []).length;
            const closeParens = (trimmed.match(/\)/g) || []).length;
            if (openParens !== closeParens) {
                errors.push({
                    line: lineNum,
                    column: 1,
                    message: "Unmatched parentheses",
                    type: "syntax"
                });
            }
        }
    });
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}


// Schedule validation with debouncing
function scheduleValidation() {
    
    // Clear existing timer
    if (textEditor.validationDebounceTimer) {
        clearTimeout(textEditor.validationDebounceTimer);
    }
    
    // Only validate Python files
    if (!isPythonFile(textEditor.filePath) || !textEditor.validationEnabled) {
        clearErrorMarkers();
        updateErrorCount(0);
        return;
    }
    
    
    // Debounce validation to avoid too frequent calls and interference with typing
    textEditor.validationDebounceTimer = setTimeout(async () => {
        const code = textEditor.textarea.value;
        
        // Don't validate empty files
        if (!code.trim()) {
            clearErrorMarkers();
            updateErrorCount(0);
            return;
        }
        
        try {
            const result = await validatePythonSyntax(code);
            displayValidationErrors(result.errors || []);
        } catch (error) {
            console.error('❌ Validation scheduling error:', error);
        }
    }, 1000); // 1000ms delay - much longer to avoid interfering with fast typing
}

// Display validation errors in the editor
function displayValidationErrors(errors) {
    // Clear previous errors
    clearErrorMarkers();
    
    // Store current errors
    textEditor.currentErrors = errors;
    
    // Update error count
    updateErrorCount(errors.length);
    
    // Add error markers
    errors.forEach(error => {
        addErrorMarker(error.line, error.message, error.type);
    });
    
}


// Add error marker to a specific line
function addErrorMarker(lineNumber, message, type = 'syntax') {
    if (!textEditor.lineNumbers || lineNumber < 1) return;
    
    // Find the line number element
    const lineNumberElements = textEditor.lineNumbers.children;
    const lineIndex = lineNumber - 1; // Convert to 0-based index
    
    if (lineIndex < lineNumberElements.length) {
        const lineEl = lineNumberElements[lineIndex];
        
        // Add error class
        lineEl.classList.add('line-error');
        lineEl.title = `Line ${lineNumber}: ${message}`;
        
        // Store error info for cleanup
        textEditor.errorMarkers.push(lineEl);
    }
    
    // Also try to add underline to the text if using highlighted editor
    if (textEditor.highlightedEditor) {
        addErrorUnderline(lineNumber, message);
    }
}

// Add error underline to highlighted editor (basic implementation)
function addErrorUnderline(lineNumber, message) {
    // This is a simplified version - we could make it more sophisticated
    // For now, we'll rely on the line number highlighting
}

// Clear all error markers
function clearErrorMarkers() {
    // Clear line number error classes
    textEditor.errorMarkers.forEach(lineEl => {
        lineEl.classList.remove('line-error');
        lineEl.removeAttribute('title');
    });
    
    textEditor.errorMarkers = [];
    textEditor.currentErrors = [];
}

// Update error count in status bar
function updateErrorCount(count) {
    if (errorCountEl) {
        errorCountEl.textContent = count.toString();
        errorCountEl.style.color = count > 0 ? '#ff6b6b' : '#51cf66';
    }
}