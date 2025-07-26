// workflow.js - Workflow execution logic for Flow Editor

// Run the workflow
async function runWorkflow() {
    if (flowEditor.isRunning) {
        return;
    }
    
    flowEditor.isRunning = true;
    document.getElementById('run-workflow').style.display = 'none';
    document.getElementById('stop-workflow').style.display = 'inline-flex';
    
    // Clear all visual states from previous runs
    document.querySelectorAll('.flow-node').forEach(node => {
        node.classList.remove('running', 'waiting-inputs', 'completed', 'error');
    });
    
    // Clear output
    const output = document.getElementById('execution-output');
    output.innerHTML = '<div class="log-entry info">Starting workflow execution...</div>';
    
    try {
        // Find start nodes (nodes with no inputs that are part of a connected workflow)
        const startNodes = Array.from(flowEditor.nodes.values()).filter(node => {
            const nodeDef = nodeRegistry.getNodeType(node.type);
            if (!nodeDef) {
                console.warn(`No node definition found for type: ${node.type}`);
                return false;
            }
            
            
            // Timer and Repeater nodes are start nodes (can trigger themselves)
            if (node.type === 'timer' || node.type === 'repeater') {
                if (node.type === 'repeater') {
                    const isRunning = node.repeaterState && node.repeaterState.isRunning;
                }
                // Timer/Repeater is a start node if it has connected outputs
                const hasConnectedOutputs = Array.from(flowEditor.connections.values()).some(conn => 
                    conn.from.nodeId === node.id
                );
                return hasConnectedOutputs; // Timer/Repeater is a start node if connected
            }
            
            // If node has no inputs, check if it's part of a connected workflow
            if (nodeDef.inputs.length === 0) {
                // Check if this node has any outputs that are connected to other nodes
                const hasConnectedOutputs = Array.from(flowEditor.connections.values()).some(conn => 
                    conn.from.nodeId === node.id
                );
                
                
                // Only include if it's connected to the workflow
                return hasConnectedOutputs;
            }
            
            // Special handling for nodes with optional inputs
            const optionalInputs = nodeDef.inputs.filter(input => input.optional);
            if (optionalInputs.length > 0) {
                // Check if this node has connected outputs
                const hasConnectedOutputs = Array.from(flowEditor.connections.values()).some(conn => 
                    conn.from.nodeId === node.id
                );
                return hasConnectedOutputs;
            }
            
            // Nodes with required inputs are not start nodes - they should be triggered by other nodes
            return false;
        });
        
        if (startNodes.length === 0) {
            throw new Error('No start nodes found. Add nodes with no inputs (Timer) or nodes with optional inputs that aren\'t connected (HTTP Request)');
        }
        
        // Execute workflow
        const results = await executeWorkflow(startNodes);
        
        // Display results
        output.innerHTML += '<div class="log-entry success">Workflow completed successfully!</div>';
        for (const result of results) {
            output.innerHTML += `<div class="log-entry info">${result.nodeId}: ${result.output}</div>`;
        }
        
        // Send completion via WebSocket
        if (sypnexAPI && sypnexAPI.sendMessage) {
            sypnexAPI.sendMessage('workflow_completed', {
                results: results,
                timestamp: Date.now()
            }, 'flow-editor');
        }
        
    } catch (error) {
        console.error('Workflow execution error:', error);
        output.innerHTML += `<div class="log-entry error">Error: ${error.message}</div>`;
    } finally {
        flowEditor.isRunning = false;
        document.getElementById('run-workflow').style.display = 'inline-flex';
        document.getElementById('stop-workflow').style.display = 'none';
    }
}

// Execute workflow
async function executeWorkflow(startNodes) {
    const results = [];
    const executed = new Set();
    const nodeInputBuffer = new Map(); // Track inputs for multi-input nodes
    
    for (const startNode of startNodes) {
        const result = await executeNode(startNode, {}, executed, nodeInputBuffer);
        if (result) results.push(result);
    }
    
    return results;
}

// Execute a single node (dynamic version)
async function executeNode(node, inputData, executed, nodeInputBuffer) {
    if (executed.has(node.id)) {
        return null;
    }
    executed.add(node.id);
    
    // Mark node as running
    const nodeElement = document.getElementById(node.id);
    if (nodeElement) nodeElement.classList.add('running');
    
    try {
        // Use the dynamic execution engine
        const output = await executionEngine.executeNode(node, inputData, executed);
        
        // Store output data for config panel display
        node.lastOutputData = output;
        node.lastExecutionTime = new Date().toISOString();
        
        // Check if output indicates execution should stop (logical gate specific)
        if (output && typeof output === 'object' && output.__stop_execution === true) {
            
            // Mark node as completed
            if (nodeElement) {
                nodeElement.classList.remove('running');
                nodeElement.classList.add('completed');
            }
            
            return { nodeId: node.id, output: null };
        }
        
        // Check for for_each control flag - skip downstream execution, let interval handle it
        if (output && typeof output === 'object' && output.__for_each_control === true) {
            
            // Mark node as completed but don't execute downstream nodes
            if (nodeElement) {
                nodeElement.classList.remove('running');
                nodeElement.classList.add('completed');
            }
            
            return { nodeId: node.id, output: output };
        }
        
        // Find connected nodes and execute them
        const connectedNodes = findConnectedNodes(node.id);
        
        for (const connectedNode of connectedNodes) {
            // Check for cycles before executing
            if (executed.has(connectedNode.node.id)) {
                continue;
            }
            
            
            // Handle output mapping to input ports - DIRECT MAPPING
            let inputValue = output;
            
            if (output instanceof Blob) {
                // Blob output - pass directly to the input port
                inputValue = output;
            } else if (typeof output === 'object' && output !== null) {
                // Object output - extract the EXACT output port field
                
                if (connectedNode.outputPort in output) {
                    inputValue = output[connectedNode.outputPort];
                } else {
                    console.error(`Node ${node.id} -> ${connectedNode.node.id}: ERROR - Output port '${connectedNode.outputPort}' not found in output!`);
                    console.error(`Available fields:`, Object.keys(output));
                    // Skip this connection instead of passing null
                    continue;
                }
            } else {
                // Simple value output - pass directly
            }
            
            
            try {
                // Use smart execution that handles multi-input synchronization
                await executeNodeSmart(connectedNode.node, connectedNode.inputPort, inputValue, executed, nodeInputBuffer);
            } catch (error) {
                console.error(`Error executing connected node ${connectedNode.node.id}:`, error);
                const outputPanel = document.getElementById('execution-output');
                outputPanel.innerHTML += `<div class="log-entry error">Error in connected node ${connectedNode.node.id}: ${error.message}</div>`;
            }
        }
        
        // Mark node as completed
        if (nodeElement) {
            nodeElement.classList.remove('running');
            nodeElement.classList.add('completed');
        }
        
        return { nodeId: node.id, output: output };
        
    } catch (error) {
        console.error(`Error executing node ${node.id}:`, error);
        
        // Mark node as error
        if (nodeElement) {
            nodeElement.classList.remove('running');
            nodeElement.classList.add('error');
    }
    
        throw error;
    } finally {
        // Remove running state
        if (nodeElement) nodeElement.classList.remove('running');
    }
}

// Smart execution function that handles multi-input synchronization
async function executeNodeSmart(node, inputPort, inputValue, executed, nodeInputBuffer) {
    const nodeId = node.id;
    
    // Get all connected input ports for this node
    const connectedInputPorts = getConnectedInputPorts(nodeId);
    
    
    // If node has 0 or 1 input connections, execute immediately
    if (connectedInputPorts.length <= 1) {
        return await executeNode(node, { [inputPort]: inputValue }, executed, nodeInputBuffer);
    }
    
    // Multi-input node - need to collect all inputs before executing
    if (!nodeInputBuffer.has(nodeId)) {
        nodeInputBuffer.set(nodeId, {
            receivedInputs: {},
            connectedPorts: connectedInputPorts
        });
        
        // Mark node as waiting for inputs (visual feedback)
        const nodeElement = document.getElementById(nodeId);
        if (nodeElement) {
            nodeElement.classList.add('waiting-inputs');
            nodeElement.classList.remove('completed', 'error');
        }
    }
    
    const buffer = nodeInputBuffer.get(nodeId);
    
    // Store this input
    buffer.receivedInputs[inputPort] = inputValue;
    
    
    // Check if we have all required inputs
    const hasAllInputs = buffer.connectedPorts.every(port => port in buffer.receivedInputs);
    
    if (!hasAllInputs) {
        // Still waiting for more inputs
        return null;
    }
    
    // All inputs ready - remove waiting state and execute!
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement) {
        nodeElement.classList.remove('waiting-inputs');
    }
    
    
    // Clear buffer for next execution
    nodeInputBuffer.delete(nodeId);
    
    // Execute with all aggregated inputs
    return await executeNode(node, buffer.receivedInputs, executed, nodeInputBuffer);
}

// Helper function to get connected input ports for a node
function getConnectedInputPorts(nodeId) {
    let connections = null;
    
    // Debug: Log what's available on flowEditor (try both window.flowEditor and flowEditor)
    
    // Try to access flowEditor directly (not via window)
    let editor = null;
    if (typeof flowEditor !== 'undefined' && flowEditor) {
        editor = flowEditor;
    } else if (window.flowEditor) {
        editor = window.flowEditor;
    } else {
        return [];
    }
    
    
    // Try multiple ways to access connections data
    if (editor.connections) {
        connections = editor.connections;
    } else if (editor.workflow && editor.workflow.connections) {
        connections = new Map(editor.workflow.connections.map(conn => [conn.id, conn]));
    } else {
        return [];
    }
    
    const allConnections = Array.from(connections.values());
    
    // Log all connections for debugging
    allConnections.forEach((conn, index) => {
    });
    
    const connectedPorts = allConnections
        .filter(conn => {
            const matches = conn.to.nodeId === nodeId;
            if (matches) {
            }
            return matches;
        })
        .map(conn => conn.to.portName);
        
    return connectedPorts;
}
    
// Helper function to update display node content (used by execution engine)
function updateDisplayNodeContent(nodeId, content, format) {
    const nodeElement = document.getElementById(nodeId);
    if (!nodeElement) return;
    
    const displayText = nodeElement.querySelector('.display-text');
    const formatElement = nodeElement.querySelector('.display-format span');
    
    if (displayText) {
        let formattedContent = content;
        
    switch (format) {
        case 'json':
            try {
                    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
                    formattedContent = JSON.stringify(parsed, null, 2);
            } catch (e) {
                    formattedContent = content;
            }
            break;
        case 'html':
                formattedContent = content;
            break;
        case 'text':
        default:
                formattedContent = content;
            break;
    }
    
        displayText.innerHTML = `<pre class="content-text">${escapeHtml(formattedContent)}</pre>`;
    }
    
    if (formatElement) {
        formatElement.textContent = format;
    }
    
    // Store for config panel display
    const node = flowEditor.nodes.get(nodeId);
    if (node) {
        node.lastContent = content;
        node.lastFormat = format;
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to replace template placeholders
function replaceTemplatePlaceholders(template, data) {
    if (typeof template !== 'object' || template === null) {
        return template;
    }
    
    if (Array.isArray(template)) {
        return template.map(item => replaceTemplatePlaceholders(item, data));
    }
    
    const result = {};
    for (const [key, value] of Object.entries(template)) {
        if (typeof value === 'string') {
            let replacedValue = value;
    
            // Replace {{VALUE}} with the full data object
            if (value.includes('{{VALUE}}')) {
                replacedValue = value.replace('{{VALUE}}', JSON.stringify(data));
}

            // Replace {{JSON:field}} with specific field
            const jsonMatches = value.match(/\{\{JSON:([^}]+)\}\}/g);
            if (jsonMatches) {
                for (const match of jsonMatches) {
                    const field = match.match(/\{\{JSON:([^}]+)\}\}/)[1];
                    const fieldValue = getNestedValue(data, field);
                    replacedValue = replacedValue.replace(match, JSON.stringify(fieldValue));
                }
    }
    
            // Replace {{field}} with specific field value
            const fieldMatches = value.match(/\{\{([^}]+)\}\}/g);
            if (fieldMatches) {
                for (const match of fieldMatches) {
                    const field = match.match(/\{\{([^}]+)\}\}/)[1];
                    if (field !== 'VALUE' && !field.startsWith('JSON:')) {
                        const fieldValue = getNestedValue(data, field);
                        replacedValue = replacedValue.replace(match, fieldValue);
                    }
                }
            }
            
            result[key] = replacedValue;
        } else if (typeof value === 'object' && value !== null) {
            result[key] = replaceTemplatePlaceholders(value, data);
                    } else {
            result[key] = value;
        }
    }
    
    return result;
}

// Helper function to get nested object values
function getNestedValue(obj, path) {
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

// Stop workflow execution
function stopWorkflow() {
        flowEditor.isRunning = false;
        document.getElementById('run-workflow').style.display = 'inline-flex';
        document.getElementById('stop-workflow').style.display = 'none';
        
    // Clear running states from all nodes
        document.querySelectorAll('.flow-node.running, .flow-node.waiting-inputs').forEach(node => {
            node.classList.remove('running', 'waiting-inputs');
        });
        
    const output = document.getElementById('execution-output');
    output.innerHTML += '<div class="log-entry warning">Workflow execution stopped by user</div>';
    
}

// Find nodes connected to a specific node
function findConnectedNodes(nodeId) {
    const connectedNodes = [];
    
    for (const connection of flowEditor.connections.values()) {
        if (connection.from.nodeId === nodeId) {
            const targetNode = flowEditor.nodes.get(connection.to.nodeId);
            if (targetNode) {
                connectedNodes.push({
                    node: targetNode,
                    inputPort: connection.to.portName,
                    outputPort: connection.from.portName
                });
            }
        }
    }
    
    return connectedNodes;
}

// Format data for preview in config panel
function formatDataPreview(data, maxLength = 200) {
    if (data === null || data === undefined) {
        return { type: 'null', preview: 'null' };
    }
    
    if (data instanceof Blob) {
        const sizeKB = (data.size / 1024).toFixed(2);
        const sizeMB = data.size > 1024 * 1024 ? ` (${(data.size / (1024 * 1024)).toFixed(2)} MB)` : '';
        return { 
            type: 'Blob', 
            preview: `${data.type || 'unknown'} - ${sizeKB} KB${sizeMB}`,
            size: data.size
        };
    }
    
    if (data instanceof ArrayBuffer) {
        const sizeKB = (data.byteLength / 1024).toFixed(2);
        return { 
            type: 'ArrayBuffer', 
            preview: `Binary data - ${sizeKB} KB`,
            size: data.byteLength
        };
    }
    
    if (data instanceof Uint8Array || data instanceof Int8Array || 
        data instanceof Uint16Array || data instanceof Int16Array ||
        data instanceof Uint32Array || data instanceof Int32Array ||
        data instanceof Float32Array || data instanceof Float64Array) {
        const sizeKB = (data.byteLength / 1024).toFixed(2);
        return { 
            type: data.constructor.name, 
            preview: `Binary array - ${sizeKB} KB`,
            size: data.byteLength
        };
    }
    
    if (Array.isArray(data)) {
        // Check if it's likely binary data (array of numbers 0-255)
        if (data.length > 0 && data.every(item => typeof item === 'number' && item >= 0 && item <= 255)) {
            const sizeKB = (data.length / 1024).toFixed(2);
            return { 
                type: 'Binary Array', 
                preview: `Binary data array - ${sizeKB} KB`,
                length: data.length
            };
        }
        
        const preview = data.length > 3 
            ? `[${data.slice(0, 3).map(item => JSON.stringify(item)).join(', ')}, ...]`
            : JSON.stringify(data);
        const truncated = preview.length > maxLength ? preview.substring(0, maxLength) + '...' : preview;
        return { 
            type: 'Array', 
            preview: truncated,
            length: data.length
        };
    }
    
    if (typeof data === 'object') {
        const keys = Object.keys(data);
        
        // Check if it looks like a large data object (has common large data indicators)
        const hasLargeDataIndicators = keys.some(key => 
            key.toLowerCase().includes('data') || 
            key.toLowerCase().includes('buffer') ||
            key.toLowerCase().includes('base64') ||
            key.toLowerCase().includes('binary')
        );
        
        if (hasLargeDataIndicators) {
            // Check sizes of values that might be large
            let totalSize = 0;
            let hasLargeValues = false;
            const summary = {};
            
            for (const key of keys) {
                const value = data[key];
                if (typeof value === 'string' && value.length > 1000) {
                    summary[key] = `String (${(value.length / 1024).toFixed(2)} KB)`;
                    totalSize += value.length;
                    hasLargeValues = true;
                } else if (value instanceof ArrayBuffer) {
                    summary[key] = `ArrayBuffer (${(value.byteLength / 1024).toFixed(2)} KB)`;
                    totalSize += value.byteLength;
                    hasLargeValues = true;
                } else if (Array.isArray(value) && value.length > 1000) {
                    summary[key] = `Array[${value.length}] (${(value.length / 1024).toFixed(2)} KB est.)`;
                    totalSize += value.length;
                    hasLargeValues = true;
                } else {
                    summary[key] = typeof value === 'string' ? `"${value.substring(0, 30)}..."` : typeof value;
                }
            }
            
            if (hasLargeValues) {
                return { 
                    type: 'Large Object', 
                    preview: JSON.stringify(summary, null, 2),
                    keys: keys.length,
                    estimatedSize: totalSize
                };
            }
        }
        
        // Regular object handling
        const preview = keys.length > 3
            ? `{${keys.slice(0, 3).join(', ')}, ...}`
            : JSON.stringify(data);
        const truncated = preview.length > maxLength ? preview.substring(0, maxLength) + '...' : preview;
        return { 
            type: 'Object', 
            preview: truncated,
            keys: keys.length
        };
    }
    
    if (typeof data === 'string') {
        // Check if it's base64 data
        const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(data) && data.length > 100 && data.length % 4 === 0;
        if (isBase64) {
            const sizeKB = (data.length * 0.75 / 1024).toFixed(2); // Base64 is ~33% larger than binary
            return { 
                type: 'Base64 Data', 
                preview: `Base64 encoded data - ${sizeKB} KB`,
                length: data.length
            };
        }
        
        // Check if it's a data URL
        if (data.startsWith('data:')) {
            const commaIndex = data.indexOf(',');
            const header = commaIndex > 0 ? data.substring(0, commaIndex) : data.substring(0, 50);
            const dataSize = commaIndex > 0 ? data.length - commaIndex - 1 : data.length;
            const sizeKB = (dataSize * 0.75 / 1024).toFixed(2);
            return { 
                type: 'Data URL', 
                preview: `${header}... - ${sizeKB} KB`,
                length: data.length
            };
        }
        
        // Regular string handling
        const truncated = data.length > maxLength ? data.substring(0, maxLength) + '...' : data;
        return { 
            type: 'String', 
            preview: truncated,
            length: data.length
        };
    }
    
    return { 
        type: typeof data, 
        preview: String(data) 
    };
}

// Get output port data for a specific node and port
function getOutputPortData(nodeId, portId) {
    const node = flowEditor.nodes.get(nodeId);
    if (!node || !node.lastOutputData) {
        return null;
    }
    
    // If the output data is an object with named ports, extract the specific port
    if (typeof node.lastOutputData === 'object' && node.lastOutputData !== null && !Array.isArray(node.lastOutputData) && !(node.lastOutputData instanceof Blob) && !(node.lastOutputData instanceof ArrayBuffer)) {
        if (portId in node.lastOutputData) {
            return node.lastOutputData[portId];
        }
        // Port not found in output object
        return null;
    }
    
    // For single output nodes or non-object outputs (Blob, ArrayBuffer, primitives), 
    // only return data for the first/primary output port
    const nodeDef = nodeRegistry.getNodeType(node.type);
    if (nodeDef && nodeDef.outputs && nodeDef.outputs.length > 0) {
        // Only return data for the first output port, others get null
        if (portId === nodeDef.outputs[0].id) {
            return node.lastOutputData;
        }
        return null;
    }
    
    // Fallback: return the data (shouldn't normally reach here)
    return node.lastOutputData;
} 