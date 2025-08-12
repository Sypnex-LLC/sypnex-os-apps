// Calculator App JavaScript

console.log('Calculator app loading...');

// Calculator state
let currentInput = '0';
let expression = '';
let shouldResetDisplay = false;
let lastOperation = null;
let decimalPrecision = 8; // Will be loaded from settings

// DOM elements
let expressionDisplay, resultDisplay;

// Initialize when DOM is ready
async function initApp() {
    console.log('Calculator app initialized');
    
    // Check if SypnexAPI is available (local variable in sandboxed environment)
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
    } else {
        console.log('SypnexAPI available:', sypnexAPI);
        console.log('App ID:', sypnexAPI.getAppId());
        console.log('Initialized:', sypnexAPI.isInitialized());
        
        // Load settings from system
        try {
            decimalPrecision = await sypnexAPI.getSetting('DECIMAL_PRECISION', 8);
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
        
        // Show welcome notification
        sypnexAPI.showNotification('Calculator app loaded successfully!', 'success');
    }
    
    // Initialize calculator
    initializeCalculator();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM is already loaded
    initApp();
}

// Initialize calculator functionality
function initializeCalculator() {
    // Get DOM elements
    expressionDisplay = document.getElementById('expression-display');
    resultDisplay = document.getElementById('result-display');
    
    // Set up event listeners for calculator buttons
    setupCalculatorButtons();
    
    // Set up keyboard support
    setupKeyboardSupport();
    
    console.log('Calculator initialized successfully');
}

// Set up calculator button event listeners
function setupCalculatorButtons() {
    const buttons = document.querySelectorAll('.calc-btn');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Add pressed animation
            button.classList.add('pressed');
            setTimeout(() => button.classList.remove('pressed'), 100);
            
            // Handle button action
            if (button.dataset.number) {
                handleNumber(button.dataset.number);
            } else if (button.dataset.action) {
                handleAction(button.dataset.action);
            }
        });
    });
}

// Set up keyboard support
function setupKeyboardSupport() {
    // Register keyboard shortcuts if SypnexAPI is available
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
        try {
            sypnexAPI.registerKeyboardShortcuts({
                'escape': clearAll,
                'delete': clearAll,
                'backspace': backspace,
                'enter': () => handleAction('equals'),
                '=': () => handleAction('equals'),
                '+': () => handleAction('add'),
                '-': () => handleAction('subtract'),
                '*': () => handleAction('multiply'),
                '/': () => handleAction('divide'),
                '%': () => handleAction('percentage'),
                '.': () => handleAction('decimal'),
                '0': () => handleNumber('0'),
                '1': () => handleNumber('1'),
                '2': () => handleNumber('2'),
                '3': () => handleNumber('3'),
                '4': () => handleNumber('4'),
                '5': () => handleNumber('5'),
                '6': () => handleNumber('6'),
                '7': () => handleNumber('7'),
                '8': () => handleNumber('8'),
                '9': () => handleNumber('9')
            });
            console.log('Keyboard shortcuts registered successfully');
        } catch (error) {
            console.warn('Failed to register keyboard shortcuts:', error);
        }
    }
}

// Handle number input
function handleNumber(number) {
    if (shouldResetDisplay) {
        currentInput = number;
        shouldResetDisplay = false;
    } else {
        currentInput = currentInput === '0' ? number : currentInput + number;
    }
    updateDisplay();
}

// Handle calculator actions
function handleAction(action) {
    switch (action) {
        case 'clear':
            clear();
            break;
        case 'backspace':
            backspace();
            break;
        case 'decimal':
            addDecimal();
            break;
        case 'sign':
            toggleSign();
            break;
        case 'percentage':
            percentage();
            break;
        case 'add':
        case 'subtract':
        case 'multiply':
        case 'divide':
            setOperation(action);
            break;
        case 'equals':
            calculate();
            break;
    }
}

// Clear current input
function clear() {
    currentInput = '0';
    updateDisplay();
}

// Clear all
function clearAll() {
    currentInput = '0';
    expression = '';
    shouldResetDisplay = false;
    lastOperation = null;
    updateDisplay();
}

// Backspace
function backspace() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

// Add decimal point
function addDecimal() {
    if (!currentInput.includes('.')) {
        currentInput += '.';
        updateDisplay();
    }
}

// Toggle sign
function toggleSign() {
    if (currentInput !== '0') {
        currentInput = currentInput.startsWith('-') 
            ? currentInput.slice(1) 
            : '-' + currentInput;
        updateDisplay();
    }
}

// Calculate percentage
function percentage() {
    const num = parseFloat(currentInput);
    currentInput = (num / 100).toString();
    updateDisplay();
}

// Set operation
function setOperation(operation) {
    if (lastOperation && !shouldResetDisplay) {
        calculate();
    }
    
    lastOperation = operation;
    expression = currentInput + ' ' + getOperatorSymbol(operation) + ' ';
    shouldResetDisplay = true;
    updateDisplay();
    
    // Highlight the operator button
    highlightOperator(operation);
}

// Calculate result
function calculate() {
    if (!lastOperation || shouldResetDisplay) return;
    
    const prev = parseFloat(expression.split(' ')[0]);
    const current = parseFloat(currentInput);
    let result;
    
    try {
        switch (lastOperation) {
            case 'add':
                result = prev + current;
                break;
            case 'subtract':
                result = prev - current;
                break;
            case 'multiply':
                result = prev * current;
                break;
            case 'divide':
                if (current === 0) {
                    throw new Error('Division by zero');
                }
                result = prev / current;
                break;
            default:
                return;
        }
        
        // Round to specified decimal precision
        const precision = parseInt(decimalPrecision);
        result = Math.round(result * Math.pow(10, precision)) / Math.pow(10, precision);
        
        // Update display
        expression = expression + currentInput + ' = ';
        currentInput = result.toString();
        shouldResetDisplay = true;
        lastOperation = null;
        
        updateDisplay();
        clearOperatorHighlight();
        
    } catch (error) {
        showError(error.message);
    }
}

// Show error
function showError(message) {
    resultDisplay.textContent = 'Error';
    resultDisplay.classList.add('display-error');
    
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI) {
        sypnexAPI.showNotification(`Calculator error: ${message}`, 'error');
    }
    
    setTimeout(() => {
        resultDisplay.classList.remove('display-error');
        clearAll();
    }, 2000);
}

// Update display
function updateDisplay() {
    if (resultDisplay) {
        resultDisplay.textContent = currentInput;
    }
    if (expressionDisplay) {
        expressionDisplay.textContent = expression;
    }
}

// Get operator symbol
function getOperatorSymbol(operation) {
    const symbols = {
        'add': '+',
        'subtract': '−',
        'multiply': '×',
        'divide': '÷'
    };
    return symbols[operation] || operation;
}

// Highlight operator button
function highlightOperator(operation) {
    clearOperatorHighlight();
    const button = document.querySelector(`[data-action="${operation}"]`);
    if (button) {
        button.classList.add('active');
    }
}

// Clear operator highlight
function clearOperatorHighlight() {
    document.querySelectorAll('.operator-btn.active').forEach(btn => {
        btn.classList.remove('active');
    });
}
