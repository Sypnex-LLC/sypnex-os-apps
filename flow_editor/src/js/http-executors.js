
// HTTP Node Executor
async function executeHttpNode(engine, node, inputData, executed) {
    const url = node.config.url.value;
    const method = node.config.method.value;
    const headers = JSON.parse(node.config.headers.value || '{}');
    const body = node.config.body.value;
    const useTemplate = true; // Always enable template processing

    let processedBody = body;

    // Process templates first on the string body
    if (useTemplate && inputData) {
        processedBody = window.flowEditorUtils.processTemplates(processedBody, inputData);
    }

    // Then parse as JSON if it's a string and looks like JSON
    if (typeof processedBody === 'string' && processedBody.trim().startsWith('{')) {
        try {
            processedBody = JSON.parse(processedBody);
        } catch (e) {
            console.warn('Failed to parse body as JSON, using as string:', e);
        }
    }

    // Use OS proxy to bypass CORS
    const proxyRequest = {
        url: url,
        method: method,
        headers: headers,
        body: processedBody,
        timeout: 30
    };


    const proxyResponse = await sypnexAPI.proxyHTTP(proxyRequest);

    if (!proxyResponse || proxyResponse.status < 200 || proxyResponse.status >= 300) {
        throw new Error(`Proxy request failed: ${proxyResponse?.status || 'Unknown error'}`);
    }

    const proxyData = proxyResponse;

    if (proxyData.error) {
        throw new Error(`HTTP request failed: ${proxyData.error}`);
    }

    // Check if response is binary (audio, image, etc.)
    if (proxyData.is_binary) {

        // Convert base64 content to blob for binary data
        const binaryData = atob(proxyData.content);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
        }
        const contentType = proxyData.headers['content-type'] || proxyData.headers['Content-Type'] || 'application/octet-stream';
        const blob = new Blob([bytes], { type: contentType });

        // Return structured output for binary responses with all ports
        return {
            original_data: blob,
            processed_data: blob,
            response: blob,
            status_code: proxyData.status || 200,
            headers: proxyData.headers || {},
            parsed_json: null,
            // Also provide the raw response as 'data' for compatibility
            data: blob,
            // Add the missing output ports from node definition
            text: null,
            json: null,
            url: url,
            binary: bytes,  // Raw binary data as Uint8Array
            blob: blob      // Blob object for compatibility
        };
    }

    // For text responses, try to parse as JSON and return structured output

    let parsedJson = null;
    try {
        // Try to parse as JSON
        parsedJson = JSON.parse(proxyData.content);
    } catch (e) {
    }

    // Return structured output for text responses matching new node architecture
    return {
        original_data: proxyData.content,
        processed_data: parsedJson || proxyData.content,
        response: proxyData.content,
        status_code: proxyData.status || 200,
        headers: proxyData.headers || {},
        parsed_json: parsedJson,
        // Also provide the raw response as 'data' for compatibility
        data: proxyData.content,
        // Add the missing output ports from node definition
        text: proxyData.content,
        json: parsedJson,
        url: url
    };
}

// VFS Load Node Executor
async function executeVfsLoadNode(engine, node, inputData, executed) {
    let filePath = node.config.file_path.value;
    const format = node.config.format.value;

    // Process template variables in file path
    const currentDate = new Date();
    const dateTemplates = {
        '{{DATE}}': currentDate.toISOString().split('T')[0], // YYYY-MM-DD
        '{{YYYY}}': currentDate.getFullYear().toString(),
        '{{MM}}': (currentDate.getMonth() + 1).toString().padStart(2, '0'),
        '{{DD}}': currentDate.getDate().toString().padStart(2, '0'),
        '{{TIMESTAMP}}': currentDate.getTime().toString(),
        '{{ISO_DATE}}': currentDate.toISOString()
    };

    // Replace all template variables using simple string replacement
    for (const [template, value] of Object.entries(dateTemplates)) {
        filePath = filePath.replaceAll(template, value);
    }

    console.log('VFS Load Debug:', {
        originalPath: node.config.file_path.value,
        processedPath: filePath,
        format: format,
        dateTemplates: dateTemplates
    });

    try {
        let data = null;

        console.log('VFS Load attempting to read:', filePath, 'format:', format);

        if (format === 'json') {
            data = await sypnexAPI.readVirtualFileJSON(filePath);
        } else if (format === 'text') {
            data = await sypnexAPI.readVirtualFileText(filePath);
        } else if (format === 'blob') {
            // For blob format, read as text (data URLs are stored as text)
            data = await sypnexAPI.readVirtualFileText(filePath);
        } else if (format === 'binary') {
            // For binary files, use the direct URL method to get Blob
            const fileUrl = sypnexAPI.getVirtualFileUrl(filePath);
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch binary file: ${response.status} ${response.statusText}`);
            }
            data = await response.blob();
        } else {
            throw new Error('Unknown format: ' + format + '. Supported formats are: json, text, blob, binary');
        }

        // Store the loaded data for display in config panel
        node.lastLoadedFile = filePath;
        node.lastLoadedData = data;

        console.log('VFS Load success:', {
            filePath: filePath,
            dataType: typeof data,
            dataLength: data ? data.length : 0,
            dataPreview: data ? (typeof data === 'string' ? data.substring(0, 100) : JSON.stringify(data).substring(0, 100)) : null
        });

        // Return structured output with appropriate port names
        const result = {
            data: data,
            file_path: filePath,  // Return the actual processed file path string
            json_data: format === 'json' ? data : null
        };
        return result;
    } catch (error) {
        console.error('VFS Load error:', {
            originalPath: node.config.file_path.value,
            processedPath: filePath,
            format: format,
            error: error.message,
            errorStack: error.stack
        });
        return { data: null, error: error.message };
    }
}


// VFS Save Node Executor
async function executeVfsSaveNode(engine, node, inputData, executed) {
    const filePath = node.config.file_path.value;
    const format = node.config.format.value;
    const overwrite = node.config.overwrite.value === 'true';
    const append = node.config.append.value === 'true';

    try {
        let data = inputData.data;
        let success = false;

        if (format === 'json') {
            success = await sypnexAPI.writeVirtualFileJSON(filePath, data);
        } else if (format === 'text') {
            if (typeof data === 'string') {
                success = await sypnexAPI.writeVirtualFile(filePath, data);
            } else {
                throw new Error('Text format requires string data, received: ' + typeof data + '. Use JSON format for objects.');
            }
        } else if (format === 'binary') {
            // Handle binary data properly using the binary upload endpoint
            if (data instanceof Uint8Array) {
                // Use the binary upload method for raw binary data
                success = await sypnexAPI.writeVirtualFileBinary(filePath, data);
            } else {
                // Binary format only supports Uint8Array for raw binary data
                throw new Error('Binary format requires Uint8Array data for raw binary, received: ' + typeof data + '. Use blob format for Blob data.');
            }
        } else if (format === 'blob') {
            // Handle Blob to data URL conversion
            if (data instanceof Blob) {
                // Convert Blob to data URL
                const reader = new FileReader();
                const dataUrl = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(data);
                });
                success = await sypnexAPI.writeVirtualFile(filePath, dataUrl);
            } else {
                throw new Error('Blob format requires Blob data, received: ' + typeof data);
            }
        } else {
            // Unknown format
            throw new Error('Unknown format: ' + format + '. Supported formats are: json, text, binary, blob');
        }

        return { success: success };
    } catch (error) {
        console.error('VFS Save error:', error);
        return { success: false, error: error.message };
    }
}

// Export to global scope
window.httpExecutors = {
    executeHttpNode,
    executeVfsLoadNode,
    executeVfsSaveNode
};