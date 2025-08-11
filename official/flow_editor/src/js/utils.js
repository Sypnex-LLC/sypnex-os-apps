// utils.js - Utility functions for Flow Editor

// Canvas-specific coordinate transformation utilities
// (App scaling utilities are now centralized in sypnexAPI.scaling)

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Utility function to debounce function calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


// Helper method for template processing
function processTemplates(template, data) {
    let result = template;
    if (typeof data === 'object' && data !== null) {
        // Check if data.data is a JSON string and try to parse it
        let templateData = data;
        if (data.data && typeof data.data === 'string') {
            try {
                const parsedData = JSON.parse(data.data);
                // Merge the parsed JSON with the original data object
                templateData = { ...data, ...parsedData };
            } catch (e) {
                // If parsing fails, just use the original data
                templateData = data;
            }
        }
        
        // Find all template patterns like {{key}} or {{path.to.value}}
        const templatePattern = /\{\{([^}]+)\}\}/g;
        result = result.replace(templatePattern, (match, path) => {
            // Try to get nested value using dot notation
            const value = extractNestedValue(templateData, path);
            // Return the value if found, otherwise keep the original template
            return value !== null && value !== undefined ? value : match;
        });
    }
    return result;
}

// Helper method for extracting nested JSON values
function extractNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined) {
            return null;
        }

        // Handle array access like "items[0].name"
        const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
            const arrayKey = arrayMatch[1];
            const arrayIndex = parseInt(arrayMatch[2]);

            if (current[arrayKey] && Array.isArray(current[arrayKey])) {
                current = current[arrayKey][arrayIndex];
            } else {
                return null;
            }
        } else {
            current = current[key];
        }
    }

    return current;
}

// Helper method to detect image type from base64 data
function detectImageTypeFromBase64(base64Data) {
    // Check the first few bytes to determine image type
    try {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Check file signatures
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return 'image/jpeg';
        } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            return 'image/png';
        } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
            return 'image/gif';
        } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            return 'image/webp';
        } else {
            // Default to PNG if we can't determine
            return 'image/png';
        }
    } catch (e) {
        // Default to PNG if there's an error
        return 'image/png';
    }
}

// Convert viewport coordinates to canvas coordinates (accounting for pan and zoom)
function viewportToCanvasCoords(viewportX, viewportY) {
    if (typeof flowEditor === 'undefined') {
        return { x: viewportX, y: viewportY };
    }
    
    return {
        x: (viewportX - flowEditor.panOffset.x) / flowEditor.zoomLevel,
        y: (viewportY - flowEditor.panOffset.y) / flowEditor.zoomLevel
    };
}

// Convert canvas coordinates to viewport coordinates (accounting for pan and zoom)
function canvasToViewportCoords(canvasX, canvasY) {
    if (typeof flowEditor === 'undefined') {
        return { x: canvasX, y: canvasY };
    }
    
    return {
        x: (canvasX * flowEditor.zoomLevel) + flowEditor.panOffset.x,
        y: (canvasY * flowEditor.zoomLevel) + flowEditor.panOffset.y
    };
}

// Get the center of the current viewport in canvas coordinates
function getViewportCenterInCanvas() {
    if (typeof flowEditor === 'undefined' || !flowEditor.canvas) {
        return { x: 0, y: 0 };
    }
    
    const container = flowEditor.canvas.parentElement;
    if (!container) {
        return { x: 0, y: 0 };
    }
    
    const containerRect = container.getBoundingClientRect();
    const viewportCenterX = containerRect.width / 2;
    const viewportCenterY = containerRect.height / 2;
    
    return viewportToCanvasCoords(viewportCenterX, viewportCenterY);
}

// Center the viewport on specific canvas coordinates
function centerViewportOnCanvas(canvasX, canvasY) {
    if (typeof flowEditor === 'undefined' || !flowEditor.canvas) {
        return;
    }
    
    const container = flowEditor.canvas.parentElement;
    if (!container) {
        return;
    }
    
    const containerRect = container.getBoundingClientRect();
    const viewportCenterX = containerRect.width / 2;
    const viewportCenterY = containerRect.height / 2;
    
    // Calculate pan offset to center the specified canvas coordinates in the viewport
    flowEditor.panOffset.x = viewportCenterX - (canvasX * flowEditor.zoomLevel);
    flowEditor.panOffset.y = viewportCenterY - (canvasY * flowEditor.zoomLevel);
    
    // Update the transform
    if (sypnexAPI.getAppWindow().canvasManager && sypnexAPI.getAppWindow().canvasManager.updateCanvasTransform) {
        sypnexAPI.getAppWindow().canvasManager.updateCanvasTransform();
    }
}

// Export utilities for use in other modules
// Canvas-specific utilities only - scaling utilities are now in sypnexAPI.scaling
sypnexAPI.getAppWindow().flowEditorUtils = {
    // Canvas-specific coordinate transformations
    viewportToCanvasCoords,
    canvasToViewportCoords,
    getViewportCenterInCanvas,
    centerViewportOnCanvas,
    
    // General utilities
    escapeHtml,
    formatFileSize,
    debounce,
    processTemplates,
    extractNestedValue,
    detectImageTypeFromBase64
};

// Replace template placeholders in JSON body
function replaceTemplatePlaceholders(body, templateData) {

    if (!body) {
        return body;
    }

    // Handle both string and object inputs
    let bodyString;
    let isJsonString = false;

    if (typeof body === 'string') {
        bodyString = body;
        // Check if it's already a JSON string
        try {
            JSON.parse(body);
            isJsonString = true;
        } catch (e) {
            // Not a JSON string, treat as regular string
        }
    } else if (typeof body === 'object') {
        bodyString = JSON.stringify(body);
        isJsonString = true;
    } else {
        return body;
    }


    // Replace placeholders with template data
    if (templateData !== undefined && templateData !== null) {
        const beforeReplace = bodyString;


        // Simple JSON field replacement - just {{field}} or {{nested.field}}
        if (typeof templateData === 'object') {

            // Use a simpler, more explicit regex
            const placeholderRegex = /\{\{([^}]+)\}\}/g;

            // Test if the regex finds anything
            const matches = bodyString.match(placeholderRegex);

            bodyString = bodyString.replace(placeholderRegex, (match, fieldPath) => {
                const value = getNestedValue(templateData, fieldPath);
                if (value !== undefined) {
                    let replacement;
                    if (typeof value === 'string') {
                        // Always escape the string properly for JSON context
                        replacement = value.replace(/\\/g, '\\\\')
                            .replace(/"/g, '\\"')
                            .replace(/\n/g, '\\n')
                            .replace(/\r/g, '\\r')
                            .replace(/\t/g, '\\t');
                    } else {
                        // For non-strings, convert to JSON string
                        replacement = JSON.stringify(value);
                    }
                    return replacement;
                } else {
                    return match;
                }
            });
        } else if (typeof templateData === 'string') {
            // For strings, just replace {{VALUE}} as a fallback
            bodyString = bodyString.replace(/{{VALUE}}/g, JSON.stringify(templateData));
        }

    } else {
    }

    if (typeof body === 'object') {
        try {
            return JSON.parse(bodyString);
        } catch (error) {
            console.error('Failed to parse template-replaced body:', error);
            console.error('Body string was:', bodyString);
            return body;
        }
    } else {
        return bodyString;
    }
}

// Get nested value from object using dot notation
function getNestedValue(obj, path) {
    const result = path.split('.').reduce((current, key) => {
        const value = current && current[key] !== undefined ? current[key] : undefined;
        return value;
    }, obj);
    return result;
}


// Update JSON extract node display
function updateJsonExtractDisplay(nodeId, label, value, status = 'normal') {
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement) {
        const contentElement = nodeElement.querySelector('.flow-node-content');
        if (contentElement) {
            const statusClass = status === 'error' ? 'text-danger' : status === 'success' ? 'text-success' : 'text-muted';

            // Show just a status on the node, full content will be in config panel
            const truncatedValue = typeof value === 'string' && value.length > 50 ?
                value.substring(0, 50) + '...' : value;

            contentElement.innerHTML = `
                <div class="node-status">
                    <div class="status-text">Value extracted</div>
                    <div class="status-info">
                        <small>${label}: ${escapeHtml(String(truncatedValue))}</small>
                    </div>
                </div>
            `;
        }
    }
}

// Add execution log entry
function addExecutionLog(message, type = 'info') {
    const output = document.getElementById('execution-output');
    if (output) {
        const timestamp = new Date().toLocaleTimeString();
        output.innerHTML += `<div class="log-entry ${type}">[${timestamp}] ${message}</div>`;
        output.scrollTop = output.scrollHeight;
    }
}

// Clear execution output
function clearOutput() {
    const output = document.getElementById('execution-output');
    if (output) {
        output.innerHTML = '<div class="log-entry info">Output cleared</div>';
    }
}


// Interactive helper functions for special node types

// Audio control functions
function playAudio(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || !node.lastAudioUrl) {
        console.error('No audio data available for node:', nodeId);
        return;
    }

    // Create or reuse audio element
    if (!node.audioElement) {
        node.audioElement = new Audio(node.lastAudioUrl);
        node.audioElement.volume = parseFloat(node.config.volume.value);
    }

    node.audioElement.play().catch(error => {
        console.error('Failed to play audio:', error);
    });

}

function stopAudio(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || !node.audioElement) {
        console.error('No audio element found for node:', nodeId);
        return;
    }

    node.audioElement.pause();
    node.audioElement.currentTime = 0;

}

// Image display functions
function showFullImage(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || !node.lastImageUrl) {
        console.error('No image data available for node:', nodeId);
        return;
    }

    // Create a modal to show the full image
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = node.lastImageUrl;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

    modal.appendChild(img);
    document.body.appendChild(modal);

    // Close modal on click
    modal.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

}

// Repeater control functions
function startRepeater(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || node.type !== 'repeater') {
        console.error('Invalid repeater node:', nodeId);
        return;
    }

    // Execute the repeater node to start it
    executionEngine.executeNode(node, {}, new Set()).then(() => {
        // Refresh the config panel to update the UI
        showNodeConfig(nodeId);
    }).catch(error => {
        console.error('Failed to start repeater:', error);
    });
}

function stopRepeater(nodeId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || node.type !== 'repeater') {
        console.error('Invalid repeater node:', nodeId);
        return;
    }

    // Stop the repeater using the execution engine method
    executionEngine.stopRepeater(node);

    // Refresh the config panel to update the UI
    showNodeConfig(nodeId);
}



// Update input mapping when user selects a different output port
function updateInputMapping(nodeId, inputPort, selectedOutputPort) {
    // Find the connection that goes to this input port (ignore from.portName)
    const connection = Array.from(flowEditor.connections.values()).find(conn =>
        conn.to.nodeId === nodeId && conn.to.portName === inputPort
    );
    if (connection) {
        // Remove the old connection
        flowEditor.connections.delete(connection.id);
        if (connection.svg) connection.svg.remove();
        // Create a new connection with the updated port name and new ID
        const newConnectionId = `conn_${connection.from.nodeId}_${selectedOutputPort}_${connection.to.nodeId}_${connection.to.portName}`;
        const newConnection = {
            id: newConnectionId,
            from: { nodeId: connection.from.nodeId, portName: selectedOutputPort },
            to: { nodeId: connection.to.nodeId, portName: connection.to.portName }
        };
        flowEditor.connections.set(newConnectionId, newConnection);
        drawConnection(newConnection);
        // Refresh the node config panel to show updated state
        if (flowEditor.selectedNode === nodeId) {
            showNodeConfig(nodeId);
        }
        // Auto-save the workflow to persist the mapping change
        if (sypnexAPI.getAppWindow().fileManager.saveFlow) {
            sypnexAPI.getAppWindow().fileManager.saveFlow();
        }
    }
}

// Update output mapping when user selects a different output port
function updateOutputMapping(nodeId, outputPort, targetNodeId, selectedOutputPort) {
    // Remove all connections from this node to the target node (regardless of port)
    const connectionsToRemove = Array.from(flowEditor.connections.values()).filter(conn =>
        conn.from.nodeId === nodeId && conn.to.nodeId === targetNodeId
    );
    connectionsToRemove.forEach(conn => {
        flowEditor.connections.delete(conn.id);
        if (conn.svg) conn.svg.remove();
    });
    // Add the new connection
    const newConnectionId = `conn_${nodeId}_${selectedOutputPort}_${targetNodeId}`;
    const newConnection = {
        id: newConnectionId,
        from: { nodeId: nodeId, portName: selectedOutputPort },
        to: { nodeId: targetNodeId, portName: connectionsToRemove[0]?.to.portName || 'data' }
    };
    flowEditor.connections.set(newConnectionId, newConnection);
    drawConnection(newConnection);
    // Refresh the target node if selected
    if (flowEditor.selectedNode === targetNodeId) {
        setTimeout(() => {
            showNodeConfig(targetNodeId);
        }, 10);
    }
    // Auto-save
    if (sypnexAPI.getAppWindow().fileManager.saveFlow) sypnexAPI.getAppWindow().fileManager.saveFlow();
}
