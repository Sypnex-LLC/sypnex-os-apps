
// HTTP Node Executor
async function executeHttpNode(engine, node, inputData, executed) {
    const url = node.config.url.value;
    const method = node.config.method.value;
    const headers = JSON.parse(node.config.headers.value || '{}');
    const body = node.config.body.value;
    const useTemplate = (node.config.use_template?.value || 'false') === 'true';

    let processedBody = body;

    // Parse body as JSON if it's a string and looks like JSON
    if (typeof processedBody === 'string' && processedBody.trim().startsWith('{')) {
        try {
            processedBody = JSON.parse(processedBody);
        } catch (e) {
            console.warn('Failed to parse body as JSON, using as string:', e);
        }
    }

    if (useTemplate && inputData.template_data) {
        processedBody = window.flowEditorUtils.processTemplates(processedBody, inputData.template_data);
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

        // Return blob directly for backward compatibility with image/audio nodes
        // The workflow execution will handle mapping to the correct ports
        return blob;
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
    const filePath = node.config.file_path.value;
    const format = node.config.format.value;


    try {
        let data = null;

        if (format === 'json') {
            data = await sypnexAPI.readVirtualFileJSON(filePath);
        } else if (format === 'text') {
            data = await sypnexAPI.readVirtualFileText(filePath);
        } else {
            // For binary files, use the direct URL method
            const fileUrl = sypnexAPI.getVirtualFileUrl(filePath);

            // Check file extension to determine if it's audio
            const extension = filePath.split('.').pop()?.toLowerCase();
            const isAudioFile = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension);
            const isImageFile = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension);

            if (isAudioFile) {
            } else if (isImageFile) {
            } else {
            }

            // Fetch the binary data as a Blob
            const response = await fetch(fileUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch binary file: ${response.status} ${response.statusText}`);
            }

            data = await response.blob();
        }

        // Store the loaded data for display in config panel
        node.lastLoadedFile = filePath;
        node.lastLoadedData = data;

        // Return structured output with appropriate port names
        const result = {
            data: data,
            file_path: filePath,  // Return the actual file path string
            json_data: format === 'json' ? data : null
        };
        return result;
    } catch (error) {
        console.error('VFS Load error:', error);
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
            const textData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
            success = await sypnexAPI.writeVirtualFile(filePath, textData);
        } else {
            // For binary data (like Blobs), convert to data URL
            if (data instanceof Blob) {
                // Convert Blob to data URL
                const reader = new FileReader();
                const dataUrl = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(data);
                });
                success = await sypnexAPI.writeVirtualFile(filePath, dataUrl);
            } else if (typeof data === 'string') {
                // If it's already a data URL, save it directly
                success = await sypnexAPI.writeVirtualFile(filePath, data);
            } else {
                // Fallback to JSON string
                const textData = JSON.stringify(data, null, 2);
                success = await sypnexAPI.writeVirtualFile(filePath, textData);
            }
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