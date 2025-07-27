
// Timer Node Executor
async function executeTimerNode(engine, node, inputData, executed) {
    const interval = node.config.interval.value;
    const count = node.config.count.value;

    return new Promise((resolve) => {
        setTimeout(() => {
            const timestamp = Date.now();
            resolve({
                trigger: timestamp,
                original_data: timestamp,
                processed_data: timestamp,
                timestamp: timestamp,
                elapsed: interval
            });
        }, interval);
    });
}

// Display Node Executor
async function executeDisplayNode(engine, node, inputData, executed) {
    const format = node.config.format.value;
    const maxLength = node.config.maxLength.value;
    const inputPort = node.config.input_port?.value || 'auto';

    // Try to find content based on configured input port or auto-detect
    let content = null;

    if (inputPort !== 'auto') {
        // Use the specified input port
        content = inputData[inputPort];
    } else {
        // Auto-detect: Priority order: text, json, data, binary
        if (inputData.text !== undefined) {
            content = inputData.text;
        } else if (inputData.json !== undefined) {
            content = inputData.json;
        } else if (inputData.data !== undefined) {
            content = inputData.data;
        } else if (inputData.binary !== undefined) {
            content = inputData.binary;
        } else {
            // Use the first available input
            const firstInput = Object.values(inputData)[0];
            content = firstInput;
        }
    }


    // Only convert to JSON string if format is 'json' or if it's an object and format is not specified
    if (typeof content === 'object' && format === 'json') {
        content = JSON.stringify(content, null, 2);
    } else if (typeof content === 'object' && format === 'text') {
        // For text format, extract the actual value from common fields
        if (content === null) {
            content = 'null';
        } else if (Array.isArray(content)) {
            content = content.join(', ');
        } else if (typeof content === 'object') {
            // Look for the actual value in common fields
            if (content.extracted_value !== undefined) {
                content = String(content.extracted_value);
            } else if (content.value !== undefined) {
                content = String(content.value);
            } else if (content.text !== undefined) {
                content = String(content.text);
            } else if (content.data !== undefined) {
                content = String(content.data);
            } else {
                // If no common fields found, just show the first value
                const firstValue = Object.values(content)[0];
                content = String(firstValue);
            }
        }
    }

    if (content && content.length > maxLength) {
        content = content.substring(0, maxLength) + '...';
    }

    // Update display node content
    updateDisplayNodeContent(node.id, content, format);

    return {
        original_data: content,
        displayed: content,
        processed_data: content
    };
}


// Repeater Node Executor
async function executeRepeaterNode(engine, node, inputData, executed) {
    const interval = parseInt(node.config.interval.value);
    const count = parseInt(node.config.count.value);

    // Initialize repeater state if not exists
    if (!node.repeaterState) {
        node.repeaterState = {
            count: 0,
            interval: null,
            isRunning: false
        };
    }

    // If this is a manual trigger (not from interval), start the repeater
    if (!node.repeaterState.isRunning) {
        node.repeaterState.isRunning = true;
        node.repeaterState.count = 0;

        // Start the interval
        node.repeaterState.interval = setInterval(async () => {
            node.repeaterState.count++;

            // Execute the connected workflow
            try {
                const connectedNodes = findConnectedNodes(node.id);
                const executed = new Set();

                for (const connectedNode of connectedNodes) {
                    await executeNode(connectedNode.node, { trigger: Date.now() }, executed);
                }
            } catch (error) {
                console.error('Error executing repeater workflow:', error);
            }

            // Stop if count limit reached
            if (count > 0 && node.repeaterState.count >= count) {
                engine.stopRepeater(node);
            }
        }, interval);
    }

    return { trigger: Date.now(), count: node.repeaterState.count, isRunning: node.repeaterState.isRunning };
}

// Condition Node Executor
async function executeConditionNode(engine, node, inputData, executed) {
    const operator = node.config.operator.value;
    const compareValue = node.config.compare_value.value;
    const caseSensitive = node.config.case_sensitive.value === 'true';

    let inputValue = inputData.value;
    let result = false;

    // Convert input to string for comparison if needed
    let inputStr = String(inputValue);
    let compareStr = String(compareValue);

    // Debug logging for string comparisons

    // Handle case sensitivity
    if (!caseSensitive) {
        inputStr = inputStr.toLowerCase();
        compareStr = compareStr.toLowerCase();
    }

    // Perform comparison based on operator
    switch (operator) {
        case 'equals':
            result = inputStr === compareStr;
            break;
        case 'not_equals':
            result = inputStr !== compareStr;
            break;
        case 'greater_than':
            result = Number(inputValue) > Number(compareValue);
            break;
        case 'less_than':
            result = Number(inputValue) < Number(compareValue);
            break;
        case 'greater_than_or_equal':
            result = Number(inputValue) >= Number(compareValue);
            break;
        case 'less_than_or_equal':
            result = Number(inputValue) <= Number(compareValue);
            break;
        case 'contains':
            result = inputStr.includes(compareStr);
            break;
        case 'not_contains':
            result = !inputStr.includes(compareStr);
            break;
        case 'starts_with':
            result = inputStr.startsWith(compareStr);
            break;
        case 'ends_with':
            result = inputStr.endsWith(compareStr);
            break;
        case 'is_empty':
            result = inputStr.trim() === '';
            break;
        case 'is_not_empty':
            result = inputStr.trim() !== '';
            break;
        default:
            result = false;
    }

    // Store for display in config panel
    node.lastInputValue = inputValue;
    node.lastCompareValue = compareValue;
    node.lastResult = result;
    node.lastOperator = operator;

    return { result: result };
}

// Logical Gate Node Executor
async function executeLogicalGateNode(engine, node, inputData, executed) {
    const invert = node.config.invert.value === 'true';
    const description = node.config.description.value;

    let condition = inputData.condition;

    // Convert to boolean if needed
    if (typeof condition === 'string') {
        condition = condition.toLowerCase() === 'true';
    } else if (typeof condition === 'number') {
        condition = condition !== 0;
    } else if (typeof condition === 'object') {
        // If it's an object with a result field (from condition node)
        condition = condition.result === true;
    }

    // Apply inversion if configured
    if (invert) {
        condition = !condition;
    }

    // Store for display in config panel
    node.lastCondition = condition;
    node.lastInverted = invert;
    node.lastDescription = description;

    // Only return trigger if condition is true
    if (condition) {
        return { trigger: Date.now() };
    } else {
        // Return special object to indicate execution should stop
        return { __stop_execution: true };
    }
}

// For Each Node Executor
async function executeForEachNode(engine, node, inputData, executed) {
    const stopOnError = node.config.stop_on_error.value === 'true';
    
    // Get the iteration delay from config (in milliseconds)
    const iterationDelay = node.config.iteration_delay?.value || 0;
    
    // Get the array from input
    let array = inputData.array;
    
    // If array is not provided, try other common input names
    if (!Array.isArray(array)) {
        array = inputData.data || inputData.file_names || inputData.items;
    }
    
    // Ensure we have a valid array
    if (!Array.isArray(array)) {
        throw new Error('For Each node requires an array input');
    }

    console.log('For Each Debug:', {
        arrayLength: array.length,
        arrayPreview: array.slice(0, 3),
        stopOnError: stopOnError,
        iterationDelay: iterationDelay
    });

    // Initialize iteration state if not exists
    if (!node.forEachState) {
        node.forEachState = {
            currentIndex: 0,
            array: array,
            isIterating: false,
            isExecutingIteration: false,
            interval: null
        };
    }

    // If this is a manual trigger (not from interval), start the iterator
    if (!node.forEachState.isIterating) {
        node.forEachState.isIterating = true;
        node.forEachState.currentIndex = 0;
        node.forEachState.array = array;

        // Start the iteration processing with proper timing
        node.forEachState.interval = setInterval(async () => {
            // Skip if previous iteration is still running
            if (node.forEachState.isExecutingIteration) {
                console.log('For Each: Skipping iteration - previous still running');
                return;
            }
            
            if (node.forEachState.currentIndex < node.forEachState.array.length) {
                node.forEachState.isExecutingIteration = true;
                const currentItem = node.forEachState.array[node.forEachState.currentIndex];
                const currentIndex = node.forEachState.currentIndex;
                
                console.log(`For Each iteration ${currentIndex + 1}/${node.forEachState.array.length}:`, currentItem);

                // Clear buffer for multi-input nodes at start of each iteration
                if (window.globalNodeInputBuffer) {
                    // Clear any downstream multi-input node buffers to ensure fresh state for this iteration
                    // But be more selective - only clear nodes that aren't immediate children
                    const immediateChildIds = [];
                    const allDownstreamIds = [];
                    
                    for (const connection of flowEditor.connections.values()) {
                        if (connection.from.nodeId === node.id) {
                            immediateChildIds.push(connection.to.nodeId);
                        }
                    }
                    
                    // Find all downstream nodes (children of children)
                    const findAllDownstream = (nodeIds, visited = new Set()) => {
                        for (const nodeId of nodeIds) {
                            if (visited.has(nodeId)) continue;
                            visited.add(nodeId);
                            allDownstreamIds.push(nodeId);
                            
                            const childIds = [];
                            for (const connection of flowEditor.connections.values()) {
                                if (connection.from.nodeId === nodeId) {
                                    childIds.push(connection.to.nodeId);
                                }
                            }
                            findAllDownstream(childIds, visited);
                        }
                    };
                    
                    findAllDownstream(immediateChildIds);
                    
                    // Only clear buffers for downstream nodes that aren't immediate children
                    const nodesToClear = allDownstreamIds.filter(id => !immediateChildIds.includes(id));
                    
                    for (const nodeId of nodesToClear) {
                        if (window.globalNodeInputBuffer.has(nodeId)) {
                            window.globalNodeInputBuffer.delete(nodeId);
                            console.log(`🧹 Cleared buffer for downstream node ${nodeId} at start of iteration ${currentIndex + 1}`);
                        }
                    }
                }

                // Execute the connected workflow - use the execution engine directly
                try {
                    // Find nodes connected to the current_item output port
                    const connectedNodes = [];
                    for (const connection of flowEditor.connections.values()) {
                        if (connection.from.nodeId === node.id) {
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

                    // Set all connected nodes to running state before execution
                    for (const connectedNodeInfo of connectedNodes) {
                        const nodeElement = document.getElementById(connectedNodeInfo.node.id);
                        if (nodeElement) {
                            nodeElement.classList.remove('completed', 'error', 'waiting-inputs');
                            nodeElement.classList.add('running');
                        }
                    }

                    // Execute each connected node with the appropriate data
                    // Use shared buffer for the entire iteration so multi-input nodes can accumulate
                    const iterationExecuted = new Set();
                    const iterationInputBuffer = new Map();
                    
                    // Copy any existing buffer data from global buffer that might be needed
                    if (window.globalNodeInputBuffer) {
                        for (const [nodeId, bufferData] of window.globalNodeInputBuffer.entries()) {
                            iterationInputBuffer.set(nodeId, {
                                receivedInputs: { ...bufferData.receivedInputs },
                                connectedPorts: [...bufferData.connectedPorts]
                            });
                        }
                    }
                    
                    for (const connectedNodeInfo of connectedNodes) {
                        let inputValue;
                        
                        // Map the For Each outputs to the connected node's input
                        if (connectedNodeInfo.outputPort === 'current_item') {
                            inputValue = currentItem;
                        } else if (connectedNodeInfo.outputPort === 'current_index') {
                            // Convert index to string for compatibility with text-based nodes
                            inputValue = String(currentIndex);
                        } else {
                            inputValue = currentItem; // Default to current item
                        }
                        
                        // Create input data for the connected node
                        const nodeInputData = {};
                        nodeInputData[connectedNodeInfo.inputPort] = inputValue;
                        
                        try {
                            // Use the workflow execution system to ensure downstream nodes execute
                            // This will trigger the complete execution chain (llm → http → etc.)
                            
                            await executeNodeSmart(
                                connectedNodeInfo.node, 
                                connectedNodeInfo.inputPort, 
                                inputValue, 
                                iterationExecuted, // Use shared executed set for this iteration
                                iterationInputBuffer  // Use shared buffer for this iteration
                            );
                            
                            // Mark node as completed after successful execution
                            const nodeElement = document.getElementById(connectedNodeInfo.node.id);
                            if (nodeElement) {
                                nodeElement.classList.remove('running');
                                nodeElement.classList.add('completed');
                            }
                        } catch (nodeError) {
                            // Mark node as error if execution fails
                            const nodeElement = document.getElementById(connectedNodeInfo.node.id);
                            if (nodeElement) {
                                nodeElement.classList.remove('running');
                                nodeElement.classList.add('error');
                            }
                            // Re-throw the error to be handled by the outer catch
                            throw nodeError;
                        }
                    }
                    
                    // Mark this iteration as complete
                    node.forEachState.isExecutingIteration = false;
                    
                } catch (error) {
                    console.error('Error executing for each iteration:', error);
                    
                    // Mark this iteration as complete even on error
                    node.forEachState.isExecutingIteration = false;
                    
                    // Mark any still-running connected nodes as error
                    const connectedNodes = [];
                    for (const connection of flowEditor.connections.values()) {
                        if (connection.from.nodeId === node.id) {
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
                    
                    for (const connectedNodeInfo of connectedNodes) {
                        const nodeElement = document.getElementById(connectedNodeInfo.node.id);
                        if (nodeElement && nodeElement.classList.contains('running')) {
                            nodeElement.classList.remove('running');
                            nodeElement.classList.add('error');
                        }
                    }
                    
                    if (stopOnError) {
                        // Stop the iteration
                        clearInterval(node.forEachState.interval);
                        node.forEachState.isIterating = false;
                        node.forEachState.interval = null;
                        return;
                    }
                }

                // Move to next item
                node.forEachState.currentIndex++;

                // Stop if we've processed all items
                if (node.forEachState.currentIndex >= node.forEachState.array.length) {
                    clearInterval(node.forEachState.interval);
                    node.forEachState.isIterating = false;
                    node.forEachState.interval = null;
                    console.log('For Each completed all items');
                    
                    // Ensure all connected nodes show final completed status
                    const connectedNodes = [];
                    for (const connection of flowEditor.connections.values()) {
                        if (connection.from.nodeId === node.id) {
                            const targetNode = flowEditor.nodes.get(connection.to.nodeId);
                            if (targetNode) {
                                connectedNodes.push(targetNode);
                            }
                        }
                    }
                    
                    for (const connectedNode of connectedNodes) {
                        const nodeElement = document.getElementById(connectedNode.id);
                        if (nodeElement && !nodeElement.classList.contains('error')) {
                            nodeElement.classList.remove('running', 'waiting-inputs');
                            nodeElement.classList.add('completed');
                        }
                    }
                }
            }
        }, iterationDelay); // Use configurable iteration delay
        
        // Don't return any data immediately - let the interval handle all executions
        // Use a special flag to prevent main workflow from executing downstream nodes
        return {
            started: true,
            total_items: array.length,
            iteration_delay: iterationDelay,
            message: `For Each iteration started with ${iterationDelay}ms delay`,
            __for_each_control: true  // Special flag to prevent downstream execution by main workflow
        };
    }

    // If already iterating, return current state
    return {
        isIterating: node.forEachState.isIterating,
        current_index: node.forEachState.currentIndex,
        total_items: node.forEachState.array.length
    };
}

// Export to global scope
window.flowExecutors = {
    executeTimerNode,
    executeDisplayNode,
    executeRepeaterNode,
    executeConditionNode,
    executeLogicalGateNode,
    executeForEachNode
};