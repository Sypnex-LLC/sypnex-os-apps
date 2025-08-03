
// HTTP Node Executor
async function executeHttpNode(engine, node, inputData, executed) {
    const url = node.config.url.value;
    const method = node.config.method.value;
    const headers = JSON.parse(node.config.headers.value || '{}');
    const body = node.config.body.value;
    const useTemplate = true; // Always enable template processing

    let processedBody = body;

    console.log('HTTP Node Debug:', {
        inputData: inputData,
        originalBody: body,
        useTemplate: useTemplate
    });

    // Process templates first on the string body
    if (useTemplate && inputData) {
        processedBody = window.flowEditorUtils.processTemplates(processedBody, inputData);
        console.log('HTTP Node Template Processing:', {
            originalBody: body,
            processedBody: processedBody,
            inputData: inputData
        });
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


    try {
        let data = null;


        if (format === 'json') {
            data = await sypnexAPI.readVirtualFileJSON(filePath);
        } else if (format === 'text') {
            data = await sypnexAPI.readVirtualFileText(filePath);
        } else if (format === 'blob') {
            // For blob format, read as text (data URLs are stored as text)
            data = await sypnexAPI.readVirtualFileText(filePath);
        } else if (format === 'binary') {
            // For binary files, use the new SypnexAPI method to get Blob
            data = await sypnexAPI.readVirtualFileBlob(filePath);
        } else {
            throw new Error('Unknown format: ' + format + '. Supported formats are: json, text, blob, binary');
        }

        // Store the loaded data for display in config panel
        node.lastLoadedFile = filePath;
        node.lastLoadedData = data;


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

        console.log('VFS Save Debug:', {
            filePath: filePath,
            format: format,
            overwrite: overwrite,
            append: append,
            dataType: typeof data,
            data: data
        });

        if (format === 'json') {
            // For JSON format with append mode, we need to handle it specially
            if (append && !overwrite) {
                try {
                    // Try to read existing file first
                    const existingData = await sypnexAPI.readVirtualFileJSON(filePath);
                    if (Array.isArray(existingData)) {
                        // If existing data is an array, append to it
                        existingData.push(data);
                        data = existingData;
                    } else {
                        // If existing data is not an array, create a new array
                        data = [existingData, data];
                    }
                } catch (error) {
                    // File doesn't exist or can't be read, create new array
                    data = [data];
                }
            }
            success = await sypnexAPI.writeVirtualFileJSON(filePath, data);
        } else if (format === 'text') {
            if (typeof data === 'string') {
                // For text format with append mode
                if (append && !overwrite) {
                    try {
                        // Try to read existing file first
                        const existingText = await sypnexAPI.readVirtualFileText(filePath);
                        data = existingText + '\n' + data;
                    } catch (error) {
                        // File doesn't exist, use data as-is
                    }
                }
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

// VFS Directory List Node Executor
async function executeVfsDirectoryListNode(engine, node, inputData, executed) {
    let directoryPath = node.config.directory_path.value;
    const filterExtensions = node.config.filter_extensions.value;
    const includeDirectories = node.config.include_directories.value === 'true';
    const recursive = node.config.recursive.value === 'true';

    // Debug logging
    console.log('VFS Directory List Debug:', {
        configValue: node.config.directory_path.value,
        inputData: inputData,
        initialDirectoryPath: directoryPath
    });

    // Use input path if provided, otherwise use config
    if (inputData && inputData.directory_path) {
        directoryPath = inputData.directory_path;
        console.log('Using input directory path:', directoryPath);
    }

    // Ensure directoryPath is a string and not empty
    if (typeof directoryPath !== 'string' || !directoryPath) {
        directoryPath = '/';
        console.log('Reset directory path to root:', directoryPath);
    }

    // Process template variables in directory path
    const currentDate = new Date();
    const dateTemplates = {
        '{{DATE}}': currentDate.toISOString().split('T')[0],
        '{{YYYY}}': currentDate.getFullYear().toString(),
        '{{MM}}': (currentDate.getMonth() + 1).toString().padStart(2, '0'),
        '{{DD}}': currentDate.getDate().toString().padStart(2, '0'),
        '{{TIMESTAMP}}': currentDate.getTime().toString(),
        '{{ISO_DATE}}': currentDate.toISOString()
    };

    for (const [template, value] of Object.entries(dateTemplates)) {
        directoryPath = directoryPath.replaceAll(template, value);
    }

    console.log('Final directory path before API call:', directoryPath);

    try {
        // Use the existing sypnexAPI.listVirtualFiles method
        const fileListData = await sypnexAPI.listVirtualFiles(directoryPath);
        
        if (!fileListData || !fileListData.items) {
            return { 
                error: `Directory not found or empty: ${directoryPath}`,
                file_list: [],
                file_paths: [],
                file_names: [],
                count: 0,
                directories: [],
                files_only: []
            };
        }

        let allItems = fileListData.items;
        
        // Handle recursive listing if enabled
        if (recursive) {
            const getAllFilesRecursive = async (items, basePath) => {
                let allFiles = [];
                for (const item of items) {
                    if (item.is_directory) {
                        const subPath = basePath + (basePath.endsWith('/') ? '' : '/') + item.name;
                        try {
                            const subDirData = await sypnexAPI.listVirtualFiles(subPath);
                            if (subDirData && subDirData.items) {
                                const subFiles = await getAllFilesRecursive(subDirData.items, subPath);
                                allFiles = allFiles.concat(subFiles);
                            }
                        } catch (err) {
                            console.warn(`Could not read subdirectory ${subPath}:`, err);
                        }
                    }
                    allFiles.push({...item, fullPath: basePath + (basePath.endsWith('/') ? '' : '/') + item.name});
                }
                return allFiles;
            };
            
            allItems = await getAllFilesRecursive(allItems, directoryPath);
        } else {
            // Add full path for non-recursive
            allItems = allItems.map(item => ({
                ...item, 
                fullPath: directoryPath + (directoryPath.endsWith('/') ? '' : '/') + item.name
            }));
        }

        // Filter by file extensions if specified
        let filteredItems = allItems;
        if (filterExtensions && filterExtensions.trim()) {
            const extensions = filterExtensions.split(',').map(ext => ext.trim().toLowerCase());
            filteredItems = allItems.filter(item => {
                // Always include directories if includeDirectories is true
                if (item.is_directory) return includeDirectories;
                // For files, check the extension
                const itemExt = item.name.split('.').pop()?.toLowerCase();
                return extensions.includes(itemExt);
            });
            console.log('Extension filtering applied:', {
                extensions: extensions,
                beforeFilter: allItems.length,
                afterFilter: filteredItems.length
            });
        } else {
            console.log('No extension filtering - returning all items');
        }

        // Separate files and directories
        const files = filteredItems.filter(item => !item.is_directory);
        const directories = filteredItems.filter(item => item.is_directory);
        
        // Create output arrays
        const filePaths = files.map(file => file.fullPath);
        const fileNames = files.map(file => file.name);
        const directoryPaths = directories.map(dir => dir.fullPath);

        // Final file list based on includeDirectories setting
        // If includeDirectories is true, return all filtered items (files + directories)
        // If includeDirectories is false, return only files
        const finalFileList = includeDirectories ? filteredItems : files;

        console.log('Processing results:', {
            totalFilteredItems: filteredItems.length,
            filesCount: files.length,
            directoriesCount: directories.length,
            includeDirectories: includeDirectories,
            finalFileListCount: finalFileList.length
        });

        // Store results for config panel display
        node.lastDirectoryPath = directoryPath;
        node.lastFileCount = finalFileList.length;
        node.lastFileList = finalFileList;

        return {
            file_list: finalFileList,
            file_paths: filePaths,
            file_names: fileNames,
            count: finalFileList.length,
            directories: directoryPaths,
            files_only: files
        };
        
    } catch (error) {
        console.error('VFS Directory List error:', {
            directoryPath: directoryPath,
            error: error.message,
            errorStack: error.stack
        });
        return { 
            error: error.message,
            file_list: [],
            file_paths: [],
            file_names: [],
            count: 0,
            directories: [],
            files_only: []
        };
    }
}

// Export to global scope
window.httpExecutors = {
    executeHttpNode,
    executeVfsLoadNode,
    executeVfsSaveNode,
    executeVfsDirectoryListNode
};