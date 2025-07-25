// Text Node Executor
async function executeTextNode(engine, node, inputData, executed) {
    const textContent = node.config.text_content.value;

    return { text: textContent };
}


// JSON Extract Node Executor
async function executeJsonExtractNode(engine, node, inputData, executed) {
    const fieldPath = node.config.field_path.value;
    const defaultValue = node.config.default_value?.value || '';

    // Accept any input data, not just json_data
    let jsonData = null;

    // Try to find JSON data from any input
    if (inputData.json_data) {
        jsonData = inputData.json_data;
    } else if (inputData.data) {
        jsonData = inputData.data;
    } else if (inputData.text) {
        jsonData = inputData.text;
    } else if (inputData.response) {
        jsonData = inputData.response;
    } else {
        // Use the first available input
        const firstInput = Object.values(inputData)[0];
        jsonData = firstInput;
    }


    let extractedValue = null;

    try {
        // Parse JSON if it's a string
        if (typeof jsonData === 'string') {
            jsonData = JSON.parse(jsonData);
        }

        // Extract value using dot notation
        extractedValue = window.flowEditorUtils.extractNestedValue(jsonData, fieldPath);

        // Use default value if extraction failed
        if (extractedValue === null || extractedValue === undefined) {
            extractedValue = defaultValue;
        }

        // Format the output as string for consistency
        let formattedValue = String(extractedValue);

        // Store for display in config panel
        node.lastExtractedValue = formattedValue;
        node.lastFieldPath = fieldPath;

        // Debug logging

        return {
            data: formattedValue,
            text: formattedValue,
            json: extractedValue,
            extracted_value: formattedValue,
            field_path: fieldPath,
            original: jsonData
        };
    } catch (error) {
        console.error('JSON Extract error:', error);
        return {
            data: defaultValue,
            text: defaultValue,
            json: null,
            extracted_value: defaultValue,
            field_path: fieldPath,
            original: jsonData,
            error: error.message
        };
    }
}


// Random Line Node Executor
async function executeRandomQuoteNode(engine, node, inputData, executed) {
    const skipEmpty = node.config.skip_empty.value === 'true';
    const trimWhitespace = node.config.trim_whitespace.value === 'true';
    const maxLength = parseInt(node.config.max_length.value);


    let text = inputData.text;
    if (typeof text !== 'string') {
        text = JSON.stringify(text);
    }


    const lines = text.split('\n');

    let validLines = lines;

    if (skipEmpty) {
        validLines = lines.filter(line => line.trim().length > 0);
    }

    if (trimWhitespace) {
        validLines = validLines.map(line => line.trim());
    }

    if (validLines.length === 0) {
        return { random_line: null, line_number: 0, total_lines: 0 };
    }

    const randomIndex = Math.floor(Math.random() * validLines.length);
    let randomLine = validLines[randomIndex];


    if (maxLength > 0 && randomLine.length > maxLength) {
        randomLine = randomLine.substring(0, maxLength) + '...';
    }

    const result = {
        random_line: randomLine,
        line_number: randomIndex + 1,
        total_lines: validLines.length
    };

    return result;
}

// Math Operations Node Executor
async function executeMathNode(engine, node, inputData, executed) {
    const operation = node.config.operation.value;
    const configValueA = parseFloat(node.config.value_a.value) || 0;
    const configValueB = parseFloat(node.config.value_b.value) || 0;
    let decimalPlaces = parseInt(node.config.decimal_places.value);
    if (isNaN(decimalPlaces)) decimalPlaces = 0; // Default to 0 if not a number

    // Get values from inputs or config
    let valueA = inputData.value_a !== undefined ? inputData.value_a : 
                 inputData.number_a !== undefined ? inputData.number_a : configValueA;
    let valueB = inputData.value_b !== undefined ? inputData.value_b : 
                 inputData.number_b !== undefined ? inputData.number_b : configValueB;

    // Convert to numbers
    if (typeof valueA === 'string') valueA = parseFloat(valueA) || 0;
    if (typeof valueB === 'string') valueB = parseFloat(valueB) || 0;
    if (typeof valueA === 'object' && valueA !== null) {
        // Try to extract numeric value from object
        valueA = parseFloat(valueA.value || valueA.result || valueA.data || 0);
    }
    if (typeof valueB === 'object' && valueB !== null) {
        valueB = parseFloat(valueB.value || valueB.result || valueB.data || 0);
    }

    let result = 0;

    try {
        switch (operation) {
            case 'add':
                result = valueA + valueB;
                break;
            case 'subtract':
                result = valueA - valueB;
                break;
            case 'multiply':
                result = valueA * valueB;
                break;
            case 'divide':
                if (valueB === 0) throw new Error('Division by zero');
                result = valueA / valueB;
                break;
            case 'modulo':
                if (valueB === 0) throw new Error('Modulo by zero');
                result = valueA % valueB;
                break;
            case 'power':
                result = Math.pow(valueA, valueB);
                break;
            case 'min':
                result = Math.min(valueA, valueB);
                break;
            case 'max':
                result = Math.max(valueA, valueB);
                break;
            case 'abs':
                result = Math.abs(valueA);
                break;
            case 'round':
                result = Math.round(valueA);
                break;
            case 'floor':
                result = Math.floor(valueA);
                break;
            case 'ceil':
                result = Math.ceil(valueA);
                break;
            default:
                result = valueA;
        }

        // Round to specified decimal places
        if (decimalPlaces >= 0) {
            result = parseFloat(result.toFixed(decimalPlaces));
        }

        // Store for display in config panel
        node.lastValueA = valueA;
        node.lastValueB = valueB;
        node.lastResult = result;
        node.lastOperation = operation;

        return {
            result: result,
            data: result,
            text: result.toString(),
            formatted: decimalPlaces === 0 ? result.toString() : result.toFixed(decimalPlaces)
        };
    } catch (error) {
        console.error('Math operation error:', error);
        return {
            result: 0,
            data: 0,
            text: "0",
            formatted: decimalPlaces === 0 ? "0" : "0.00",
            error: error.message
        };
    }
}

// Array Operations Node Executor
async function executeArrayNode(engine, node, inputData, executed) {
    const operation = node.config.operation.value;
    const fieldPath = node.config.field_path.value;
    const filterValue = node.config.filter_value.value;
    const filterOperator = node.config.filter_operator.value;
    const joinSeparator = node.config.join_separator.value || ', ';
    const sliceStart = parseInt(node.config.slice_start.value) || 0;
    const sliceEnd = parseInt(node.config.slice_end.value) || 0;

    // Get array from input
    let array = inputData.array || inputData.data;
    
    // Parse if it's a string
    if (typeof array === 'string') {
        try {
            array = JSON.parse(array);
        } catch (e) {
            console.error('Failed to parse array:', e);
            return { result: null, error: 'Invalid array data' };
        }
    }

    if (!Array.isArray(array)) {
        return { result: null, error: 'Input is not an array' };
    }

    let result = null;

    try {
        switch (operation) {
            case 'map':
                if (fieldPath) {
                    result = array.map(item => window.flowEditorUtils.extractNestedValue(item, fieldPath));
                } else {
                    result = array.slice(); // Return copy of array
                }
                break;
            case 'filter':
                result = array.filter(item => {
                    let value = fieldPath ? window.flowEditorUtils.extractNestedValue(item, fieldPath) : item;
                    return performFilterOperation(value, filterValue, filterOperator);
                });
                break;
            case 'length':
                result = array.length;
                break;
            case 'join':
                result = array.map(item => {
                    if (fieldPath) {
                        return window.flowEditorUtils.extractNestedValue(item, fieldPath);
                    }
                    return typeof item === 'object' ? JSON.stringify(item) : String(item);
                }).join(joinSeparator);
                break;
            case 'first':
                result = array.length > 0 ? array[0] : null;
                break;
            case 'last':
                result = array.length > 0 ? array[array.length - 1] : null;
                break;
            case 'slice':
                const end = sliceEnd > 0 ? sliceEnd : array.length;
                result = array.slice(sliceStart, end);
                break;
            case 'reverse':
                result = array.slice().reverse();
                break;
            case 'sort':
                result = array.slice().sort((a, b) => {
                    let valueA = fieldPath ? window.flowEditorUtils.extractNestedValue(a, fieldPath) : a;
                    let valueB = fieldPath ? window.flowEditorUtils.extractNestedValue(b, fieldPath) : b;
                    return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
                });
                break;
            case 'unique':
                if (fieldPath) {
                    const seen = new Set();
                    result = array.filter(item => {
                        const value = window.flowEditorUtils.extractNestedValue(item, fieldPath);
                        if (seen.has(value)) return false;
                        seen.add(value);
                        return true;
                    });
                } else {
                    result = [...new Set(array)];
                }
                break;
            default:
                result = array;
        }

        // Store for display in config panel
        node.lastArray = array;
        node.lastResult = result;
        node.lastOperation = operation;

        return {
            result: result,
            data: result,
            text: Array.isArray(result) ? JSON.stringify(result) : String(result),
            length: Array.isArray(result) ? result.length : Array.isArray(array) ? array.length : 0,
            first: Array.isArray(array) && array.length > 0 ? array[0] : null,
            last: Array.isArray(array) && array.length > 0 ? array[array.length - 1] : null
        };
    } catch (error) {
        console.error('Array operation error:', error);
        return {
            result: null,
            data: null,
            text: "",
            length: 0,
            first: null,
            last: null,
            error: error.message
        };
    }
}

// Helper function for array filtering
function performFilterOperation(value, filterValue, operator) {
    const valueStr = String(value).toLowerCase();
    const filterStr = String(filterValue).toLowerCase();
    
    switch (operator) {
        case 'equals':
            return value == filterValue;
        case 'not_equals':
            return value != filterValue;
        case 'contains':
            return valueStr.includes(filterStr);
        case 'greater_than':
            return Number(value) > Number(filterValue);
        case 'less_than':
            return Number(value) < Number(filterValue);
        case 'starts_with':
            return valueStr.startsWith(filterStr);
        case 'ends_with':
            return valueStr.endsWith(filterStr);
        default:
            return true;
    }
}

// String Operations Node Executor
async function executeStringNode(engine, node, inputData, executed) {
    const operation = node.config.operation.value;
    const configTextB = node.config.text_b.value;
    const separator = node.config.separator.value || ',';
    const searchText = node.config.search_text.value;
    const replaceText = node.config.replace_text.value;
    const startIndex = parseInt(node.config.start_index.value) || 0;
    const endIndex = parseInt(node.config.end_index.value) || 0;
    const repeatCount = parseInt(node.config.repeat_count.value) || 1;
    const caseSensitive = node.config.case_sensitive.value === 'true';

    // Get text inputs
    let textA = inputData.text || inputData.data || '';
    let textB = inputData.text_b || configTextB || '';

    // Debug logging for input synchronization
    console.log(`String Operations Node Debug:`, {
        operation: operation,
        inputData: inputData,
        inputDataKeys: Object.keys(inputData),
        textA: textA,
        textB: textB,
        configTextB: configTextB
    });

    // Convert to strings
    if (typeof textA !== 'string') textA = String(textA);
    if (typeof textB !== 'string') textB = String(textB);

    let result = '';

    try {
        switch (operation) {
            case 'concatenate':
                result = textA + textB;
                break;
            case 'split':
                result = textA.split(separator);
                break;
            case 'replace':
                if (caseSensitive) {
                    result = textA.replace(new RegExp(escapeRegex(searchText), 'g'), replaceText);
                } else {
                    result = textA.replace(new RegExp(escapeRegex(searchText), 'gi'), replaceText);
                }
                break;
            case 'trim':
                result = textA.trim();
                break;
            case 'uppercase':
                result = textA.toUpperCase();
                break;
            case 'lowercase':
                result = textA.toLowerCase();
                break;
            case 'substring':
                const end = endIndex > 0 ? endIndex : textA.length;
                result = textA.substring(startIndex, end);
                break;
            case 'regex_match':
                const matchFlags = caseSensitive ? 'g' : 'gi';
                const matches = textA.match(new RegExp(searchText, matchFlags));
                result = matches || [];
                break;
            case 'regex_replace':
                const replaceFlags = caseSensitive ? 'g' : 'gi';
                result = textA.replace(new RegExp(searchText, replaceFlags), replaceText);
                break;
            case 'starts_with':
                result = caseSensitive ? textA.startsWith(searchText) : 
                        textA.toLowerCase().startsWith(searchText.toLowerCase());
                break;
            case 'ends_with':
                result = caseSensitive ? textA.endsWith(searchText) : 
                        textA.toLowerCase().endsWith(searchText.toLowerCase());
                break;
            case 'contains':
                result = caseSensitive ? textA.includes(searchText) : 
                        textA.toLowerCase().includes(searchText.toLowerCase());
                break;
            case 'repeat':
                result = textA.repeat(Math.max(0, Math.min(repeatCount, 100)));
                break;
            default:
                result = textA;
        }

        // Store for display in config panel
        node.lastTextA = textA;
        node.lastTextB = textB;
        node.lastResult = result;
        node.lastOperation = operation;

        return {
            result: Array.isArray(result) ? result : String(result),
            data: result,
            array: Array.isArray(result) ? result : null,
            length: String(result).length,
            word_count: String(result).trim().split(/\s+/).filter(word => word.length > 0).length
        };
    } catch (error) {
        console.error('String operation error:', error);
        return {
            result: '',
            data: '',
            array: null,
            length: 0,
            word_count: 0,
            error: error.message
        };
    }
}

// Helper function to escape regex special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export to global scope
window.dataExecutors = {
    executeTextNode,
    executeJsonExtractNode,
    executeRandomQuoteNode,
    executeMathNode,
    executeArrayNode,
    executeStringNode
};