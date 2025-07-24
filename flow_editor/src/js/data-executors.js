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


// Export to global scope
window.dataExecutors = {
    executeTextNode,
    executeJsonExtractNode,
    executeRandomQuoteNode
};