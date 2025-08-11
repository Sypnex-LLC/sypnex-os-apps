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
        extractedValue = sypnexAPI.getAppWindow().flowEditorUtils.extractNestedValue(jsonData, fieldPath);

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
    let object = inputData.object || inputData.data;
    
    // For object operations, we work with objects instead of arrays
    if (['object_keys', 'object_values', 'object_entries'].includes(operation)) {
        // Parse object if it's a string
        if (typeof object === 'string') {
            try {
                object = JSON.parse(object);
            } catch (e) {
                console.error('Failed to parse object:', e);
                return { result: null, error: 'Invalid object data' };
            }
        }

        if (typeof object !== 'object' || Array.isArray(object) || object === null) {
            return { result: null, error: 'Input is not an object' };
        }
    } else {
        // Parse array if it's a string (existing logic)
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
    }

    let result = null;

    try {
        switch (operation) {
            case 'map':
                if (fieldPath) {
                    result = array.map(item => sypnexAPI.getAppWindow().flowEditorUtils.extractNestedValue(item, fieldPath));
                } else {
                    result = array.slice(); // Return copy of array
                }
                break;
            case 'filter':
                result = array.filter(item => {
                    let value = fieldPath ? sypnexAPI.getAppWindow().flowEditorUtils.extractNestedValue(item, fieldPath) : item;
                    return performFilterOperation(value, filterValue, filterOperator);
                });
                break;
            case 'length':
                result = array.length;
                break;
            case 'join':
                result = array.map(item => {
                    if (fieldPath) {
                        return sypnexAPI.getAppWindow().flowEditorUtils.extractNestedValue(item, fieldPath);
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
            case 'random':
                if (array.length === 0) {
                    result = null;
                } else {
                    const randomIndex = Math.floor(Math.random() * array.length);
                    result = array[randomIndex];
                }
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
                    let valueA = fieldPath ? sypnexAPI.getAppWindow().flowEditorUtils.extractNestedValue(a, fieldPath) : a;
                    let valueB = fieldPath ? sypnexAPI.getAppWindow().flowEditorUtils.extractNestedValue(b, fieldPath) : b;
                    return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
                });
                break;
            case 'unique':
                if (fieldPath) {
                    const seen = new Set();
                    result = array.filter(item => {
                        const value = sypnexAPI.getAppWindow().flowEditorUtils.extractNestedValue(item, fieldPath);
                        if (seen.has(value)) return false;
                        seen.add(value);
                        return true;
                    });
                } else {
                    result = [...new Set(array)];
                }
                break;
            case 'object_keys':
                result = Object.keys(object);
                break;
            case 'object_values':
                result = Object.values(object);
                break;
            case 'object_entries':
                result = Object.entries(object).map(([key, value]) => ({
                    key: key,
                    value: value
                }));
                break;
            default:
                result = array;
        }

        // Store for display in config panel
        if (['object_keys', 'object_values', 'object_entries'].includes(operation)) {
            node.lastArray = object;
            node.lastObject = object;
        } else {
            node.lastArray = array;
        }
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
    
    // Process escape sequences in separator (e.g., \n, \r\n, \t, etc.)
    let separator = node.config.separator.value || ',';
    separator = separator
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    
    const searchText = node.config.search_text.value;
    const replaceText = node.config.replace_text.value;
    const startIndex = parseInt(node.config.start_index.value) || 0;
    const endIndex = parseInt(node.config.end_index.value) || 0;
    const repeatCount = parseInt(node.config.repeat_count.value) || 1;
    const caseSensitive = node.config.case_sensitive.value === 'true';

    // Get text inputs
    let textA = inputData.text || inputData.data || '';
    let textB = inputData.text_b || configTextB || '';



    // Convert to strings
    if (typeof textA !== 'string') textA = String(textA);
    if (typeof textB !== 'string') textB = String(textB);

    let result = '';

    try {
        switch (operation) {
            case 'concatenate':
                result = textA + separator + textB;
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
            case 'last_line':
                const lines = textA.split('\n').filter(line => line.trim().length > 0);
                result = lines.length > 0 ? lines[lines.length - 1] : '';
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

// Node Reference Node Executor
async function executeNodeReferenceNode(engine, node, inputData, executed) {
    const sourceNodeId = node.config.source_node_id.value;
    const outputPortId = node.config.output_port_id.value;
    const fallbackValue = node.config.fallback_value.value || null;

    // Validate inputs
    if (!sourceNodeId) {
        console.warn('Node Reference: No source node selected');
        return {
            data: fallbackValue,
            text: String(fallbackValue || ''),
            json: fallbackValue,
            number: isNaN(Number(fallbackValue)) ? 0 : Number(fallbackValue),
            boolean: Boolean(fallbackValue),
            binary: null,
            original: fallbackValue,
            error: 'No source node selected'
        };
    }

    if (!outputPortId) {
        console.warn('Node Reference: No output port selected');
        return {
            data: fallbackValue,
            text: String(fallbackValue || ''),
            json: fallbackValue,
            number: isNaN(Number(fallbackValue)) ? 0 : Number(fallbackValue),
            boolean: Boolean(fallbackValue),
            binary: null,
            original: fallbackValue,
            error: 'No output port selected'
        };
    }

    try {
        // Get the referenced data using the existing function
        const referencedData = getOutputPortData(sourceNodeId, outputPortId);
        
        if (referencedData === null || referencedData === undefined) {
            console.warn(`Node Reference: No data found for node ${sourceNodeId}, port ${outputPortId}`);
            const fallback = fallbackValue !== '' ? fallbackValue : null;
            
            return {
                data: fallback,
                text: String(fallback || ''),
                json: fallback,
                number: isNaN(Number(fallback)) ? 0 : Number(fallback),
                boolean: Boolean(fallback),
                binary: null,
                original: fallback,
                error: `No data found for node ${sourceNodeId}, port ${outputPortId}`
            };
        }

        // Successfully got the data - format it for all output types
        let textValue = String(referencedData);
        let jsonValue = referencedData;
        let numberValue = 0;
        let booleanValue = Boolean(referencedData);

        // Handle different data types appropriately
        if (typeof referencedData === 'number') {
            numberValue = referencedData;
        } else if (typeof referencedData === 'string') {
            const parsed = Number(referencedData);
            numberValue = isNaN(parsed) ? 0 : parsed;
        }

        // For JSON output, try to preserve object structure
        if (typeof referencedData === 'object') {
            jsonValue = referencedData;
            textValue = JSON.stringify(referencedData, null, 2);
        } else if (typeof referencedData === 'string') {
            try {
                // Try to parse as JSON
                jsonValue = JSON.parse(referencedData);
            } catch {
                // Not valid JSON, keep as string
                jsonValue = referencedData;
            }
        }


        return {
            data: referencedData,
            text: textValue,
            json: jsonValue,
            number: numberValue,
            boolean: booleanValue,
            binary: (referencedData instanceof Blob || referencedData instanceof ArrayBuffer) ? referencedData : null,
            original: referencedData
        };

    } catch (error) {
        console.error('Node Reference execution error:', error);
        const fallback = fallbackValue !== '' ? fallbackValue : null;
        
        return {
            data: fallback,
            text: String(fallback || ''),
            json: fallback,
            number: isNaN(Number(fallback)) ? 0 : Number(fallback),
            boolean: Boolean(fallback),
            binary: null,
            original: fallback,
            error: error.message
        };
    }
}

// Random Number Node Executor
async function executeRandomNode(engine, node, inputData, executed) {
    const minValue = parseFloat(node.config.min_value.value) || 0;
    const maxValue = parseFloat(node.config.max_value.value) || 100;
    const decimalPlaces = parseInt(node.config.decimal_places.value) || 0;
    const outputType = node.config.output_type.value || 'integer';

    // Validate range
    if (minValue >= maxValue) {
        console.error('Random: Minimum value must be less than maximum value');
        return {
            number: 0,
            text: '0',
            data: '0',
            integer: 0,
            float: 0.0,
            error: 'Invalid range: minimum must be less than maximum'
        };
    }

    try {
        // Generate random number between min and max
        let randomValue = Math.random() * (maxValue - minValue) + minValue;

        // Apply output type and decimal places
        if (outputType === 'integer' || decimalPlaces === 0) {
            randomValue = Math.round(randomValue);
        } else {
            randomValue = parseFloat(randomValue.toFixed(decimalPlaces));
        }

        // Store for display in config panel
        node.lastRandomValue = randomValue;
        node.lastRange = `${minValue} - ${maxValue}`;
        node.lastOutputType = outputType;


        return {
            number: randomValue,
            text: String(randomValue), // Convert to string for VFS compatibility
            data: String(randomValue), // Convert to string for VFS compatibility  
            integer: Math.round(randomValue),
            float: parseFloat(randomValue.toFixed(Math.max(decimalPlaces, 1)))
        };

    } catch (error) {
        console.error('Random execution error:', error);
        return {
            number: 0,
            text: '0',
            data: '0',
            integer: 0,
            float: 0.0,
            error: error.message
        };
    }
}

// Export to global scope
sypnexAPI.getAppWindow().dataExecutors = {
    executeTextNode,
    executeJsonExtractNode,
    executeRandomQuoteNode,
    executeMathNode,
    executeArrayNode,
    executeStringNode,
    executeNodeReferenceNode,
    executeRandomNode
};