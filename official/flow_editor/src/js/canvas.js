// canvas.js - Canvas event handlers and drawing logic for Flow Editor

// Start dragging a node
function startDraggingNode(nodeId, e) {
    e.preventDefault();
    e.stopPropagation();
    
    const node = flowEditor.nodes.get(nodeId);
    if (!node) return;
    
    flowEditor.draggingNode = nodeId;
    
    // Calculate offset from mouse to node corner using scaled coordinates
    const nodeElement = document.getElementById(nodeId);
    const rect = (typeof sypnexAPI !== 'undefined' && sypnexAPI.getScaledBoundingClientRect) ? 
        sypnexAPI.getScaledBoundingClientRect(nodeElement) : 
        nodeElement.getBoundingClientRect();
    const mouseCoords = (typeof sypnexAPI !== 'undefined' && sypnexAPI.getScaledMouseCoords) ? 
        sypnexAPI.getScaledMouseCoords(e) : 
        { x: e.clientX, y: e.clientY };
    
    flowEditor.dragOffset = {
        x: mouseCoords.x - rect.left,
        y: mouseCoords.y - rect.top
    };
    
    nodeElement.style.cursor = 'grabbing';
    nodeElement.style.zIndex = '1000'; // Bring to front while dragging
    
    // Cache canvas rect for performance (scaled)
    flowEditor.canvasRect = (typeof sypnexAPI !== 'undefined' && sypnexAPI.getScaledBoundingClientRect) ? 
        sypnexAPI.getScaledBoundingClientRect(flowEditor.canvas) : 
        flowEditor.canvas.getBoundingClientRect();
}

// Select a node
function selectNode(nodeId) {
    // Remove previous selection
    document.querySelectorAll('.flow-node.selected').forEach(node => {
        node.classList.remove('selected');
    });
    
    // Select new node
    const nodeElement = document.getElementById(nodeId);
    if (nodeElement) {
        nodeElement.classList.add('selected');
        flowEditor.selectedNode = nodeId;
        showNodeConfig(nodeId);
    }
}


// Start a connection from a port
function startConnection(nodeId, portName, isOutput) {
    if (isOutput) {
        // Starting from output port
        flowEditor.connectingFrom = {
            nodeId: nodeId,
            portName: portName,
            isOutput: true
        };
    } else {
        // Starting from input port - check if we have a pending connection
        if (flowEditor.connectingFrom && flowEditor.connectingFrom.isOutput) {
            // Complete the connection
            const fromNodeId = flowEditor.connectingFrom.nodeId;
            const fromPort = flowEditor.connectingFrom.portName;
            
            createConnection(fromNodeId, fromPort, nodeId, portName);
            flowEditor.connectingFrom = null;
        }
    }
}

// Update connections for a specific node
function updateConnectionsForNode(nodeId) {
    for (const connection of flowEditor.connections.values()) {
        if (connection.from.nodeId === nodeId || connection.to.nodeId === nodeId) {
            updateConnection(connection);
        }
    }
}

// Update a single connection
function updateConnection(connection) {
    const fromNode = document.getElementById(connection.from.nodeId);
    const toNode = document.getElementById(connection.to.nodeId);
    
    if (!fromNode || !toNode || !connection.svg) {
        return;
    }
    
    // Get node data positions
    const fromNodeData = flowEditor.nodes.get(connection.from.nodeId);
    const toNodeData = flowEditor.nodes.get(connection.to.nodeId);
    
    if (!fromNodeData || !toNodeData) {
        return;
    }
    
    // Get actual node dimensions from computed styles
    const fromStyles = window.getComputedStyle(fromNode);
    const toStyles = window.getComputedStyle(toNode);
    
    const fromWidth = parseFloat(fromStyles.width) || 200;
    const fromHeight = parseFloat(fromStyles.height) || 80;
    const toWidth = parseFloat(toStyles.width) || 200;
    const toHeight = parseFloat(toStyles.height) || 80;
    
    // Calculate connection positions directly from node data (no extra transforms)
    // From output port (right side of from node, middle vertically)
    const fromX = fromNodeData.x + fromWidth;
    const fromY = fromNodeData.y + fromHeight / 2;
    
    // To input port (left side of to node, middle vertically)  
    const toX = toNodeData.x;
    const toY = toNodeData.y + toHeight / 2;
    
    
    // Update the path
    const path = connection.svg.querySelector('path');
    if (path) {
        const controlPoint1X = fromX + (toX - fromX) * 0.5;
        const controlPoint2X = fromX + (toX - fromX) * 0.5;
        const pathD = `M ${fromX} ${fromY} C ${controlPoint1X} ${fromY} ${controlPoint2X} ${toY} ${toX} ${toY}`;
        path.setAttribute('d', pathD);
    } else {
    }
}

// Redraw all connections (for window resize, etc.)
function redrawAllConnections() {
    // Prevent overwhelming the system with too many redraws
    if (flowEditor.redrawInProgress) return;
    flowEditor.redrawInProgress = true;
    
    // Use requestAnimationFrame for smooth redrawing
    requestAnimationFrame(() => {
        for (const connection of flowEditor.connections.values()) {
            updateConnection(connection);
        }
        flowEditor.redrawInProgress = false;
    });
}

// Delete a node and all its connections
async function deleteNode(nodeId) {
    const confirmed = await sypnexAPI.showConfirmation(
        'Delete Node',
        'Are you sure you want to delete this node?',
        {
            type: 'danger',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            icon: 'fas fa-cube'
        }
    );
    
    if (confirmed) {
        const node = flowEditor.nodes.get(nodeId);
        
        // Clean up audio elements if this is an audio node
        if (node && node.type === 'audio' && node.audioElement) {
            // Pause and stop the audio
            node.audioElement.pause();
            node.audioElement.currentTime = 0;
            
            // Remove event listeners properly
            if (node.audioEventListeners) {
                node.audioElement.removeEventListener('ended', node.audioEventListeners.ended);
                node.audioElement.removeEventListener('error', node.audioEventListeners.error);
                node.audioEventListeners = null;
            }
            
            // Store the src before clearing it for cleanup
            const audioSrc = node.audioElement.src;
            node.audioElement.src = '';
            
            // Revoke blob URL if it exists
            if (audioSrc && audioSrc.startsWith('blob:')) {
                URL.revokeObjectURL(audioSrc);
            }
            
            // Clear the audio element reference
            node.audioElement = null;
        }
        
        // Remove all connections involving this node
        const connectionsToDelete = [];
        for (const [connectionId, connection] of flowEditor.connections.entries()) {
            if (connection.from.nodeId === nodeId || connection.to.nodeId === nodeId) {
                connectionsToDelete.push(connectionId);
            }
        }
        
        // Delete connections
        for (const connectionId of connectionsToDelete) {
            deleteConnection(connectionId);
        }
        
        // Remove node from data structure
        flowEditor.nodes.delete(nodeId);
        
        // Remove node element from DOM
        const nodeElement = document.getElementById(nodeId);
        if (nodeElement) {
            nodeElement.remove();
        }
        
        // Deselect if this was the selected node
        if (flowEditor.selectedNode === nodeId) {
            flowEditor.selectedNode = null;
            document.getElementById('node-config').innerHTML = '<p class="text-muted">Select a node to configure it</p>';
        }
        
    }
}

// Delete a connection
function deleteConnection(connectionId) {
    const connection = flowEditor.connections.get(connectionId);
    if (connection && connection.svg) {
        connection.svg.remove();
    }
    flowEditor.connections.delete(connectionId);
}

// Delete selected node
async function deleteSelectedNode() {
    if (flowEditor.selectedNode) {
        await deleteNode(flowEditor.selectedNode);
    }
}

// Handle port mouse events for connections
function handlePortMouseDown(e, nodeId, portName, isOutput) {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutput) {
        flowEditor.connectingFrom = { nodeId, portName };
        e.target.classList.add('connecting');
    } else {
        if (flowEditor.connectingFrom) {
            createConnection(flowEditor.connectingFrom.nodeId, flowEditor.connectingFrom.portName, nodeId, portName);
            flowEditor.connectingFrom = null;
            document.querySelectorAll('.flow-node-port').forEach(port => port.classList.remove('connecting'));
        }
    }
}

// Create a connection between nodes
function createConnection(fromNodeId, fromPort, toNodeId, toPort) {
    // Check if connection already exists
    for (const connection of flowEditor.connections.values()) {
        if (connection.from.nodeId === fromNodeId && 
            connection.from.portName === fromPort &&
            connection.to.nodeId === toNodeId && 
            connection.to.portName === toPort) {
            return;
        }
    }
    
    const connectionId = `conn_${fromNodeId}_${fromPort}_${toNodeId}_${toPort}`;
    const connection = {
        id: connectionId,
        from: { nodeId: fromNodeId, portName: fromPort },
        to: { nodeId: toNodeId, portName: toPort }
    };
    
    flowEditor.connections.set(connectionId, connection);
    drawConnection(connection);
    
}

// Draw a connection on the canvas
function drawConnection(connection) {
    const fromNode = document.getElementById(connection.from.nodeId);
    const toNode = document.getElementById(connection.to.nodeId);
    
    if (!fromNode || !toNode) return;
    
    // Create SVG element for the connection
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none'; // Don't capture events by default
    svg.style.zIndex = '1';
    svg.dataset.connectionId = connection.id;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', '#4CAF50');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    path.style.cursor = 'pointer';
    path.style.pointerEvents = 'auto'; // Only the path captures events
    
    // Add hover effects
    path.addEventListener('mouseenter', () => {
        path.setAttribute('stroke-width', '4');
        path.setAttribute('stroke', '#ff6b6b');
        // Show delete tooltip
        showConnectionTooltip(connection.id, 'Click to delete connection');
    });
    
    path.addEventListener('mouseleave', () => {
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke', '#4CAF50');
        hideConnectionTooltip();
    });
    
    // Add click to delete
    path.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await sypnexAPI.showConfirmation(
            'Delete Connection',
            'Are you sure you want to delete this connection?',
            {
                type: 'danger',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                icon: 'fas fa-link'
            }
        );
        
        if (confirmed) {
            deleteConnection(connection.id);
        }
    });
    
    svg.appendChild(path);
    flowEditor.canvas.appendChild(svg);
    
    // Store SVG reference
    connection.svg = svg;
    
    // Update connection position
    updateConnection(connection);
}

// Show connection tooltip
function showConnectionTooltip(connectionId, message) {
    // Check if app is still active
    if (!flowEditor.isActive) {
        return;
    }
    
    // Remove existing tooltip
    hideConnectionTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'connection-tooltip';
    tooltip.textContent = message;
    tooltip.style.cssText = `
        position: fixed;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 10000;
        white-space: nowrap;
        display: none;
    `;
    
    tooltip.id = 'connection-tooltip';
    
    // Try to append to app container first, fallback to body
    const appContainer = document.querySelector('.app-container');
    const container = appContainer || document.body;
    container.appendChild(tooltip);
    
    // Position tooltip near mouse (will be updated on mousemove)
    const tooltipMouseMoveHandler = (e) => updateTooltipPosition(e);
    document.addEventListener('mousemove', tooltipMouseMoveHandler);
    
    // Store the handler reference for cleanup
    window.flowEditorTooltipHandler = tooltipMouseMoveHandler;
    
    // Show the tooltip after a small delay to prevent flickering
    setTimeout(() => {
        if (tooltip.parentNode && flowEditor.isActive) {
            tooltip.style.display = 'block';
        }
    }, 10);
}

// Update tooltip position
function updateTooltipPosition(e) {
    const tooltip = document.getElementById('connection-tooltip');
    if (tooltip) {
        // Use scaled coordinates for tooltip positioning
        const mouseCoords = (typeof sypnexAPI !== 'undefined' && sypnexAPI.getScaledMouseCoords) ? 
            sypnexAPI.getScaledMouseCoords(e) : 
            { x: e.clientX, y: e.clientY };
        tooltip.style.left = (mouseCoords.x + 10) + 'px';
        tooltip.style.top = (mouseCoords.y - 10) + 'px';
    }
}

// Hide connection tooltip
function hideConnectionTooltip() {
    const tooltip = document.getElementById('connection-tooltip');
    if (tooltip) {
        // Remove the specific event listener we added
        if (window.flowEditorTooltipHandler) {
            document.removeEventListener('mousemove', window.flowEditorTooltipHandler);
            window.flowEditorTooltipHandler = null;
        }
        
        // Hide and remove the tooltip
        tooltip.style.display = 'none';
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    }
}

// Clear the canvas
async function clearCanvas() {
    const confirmed = await sypnexAPI.showConfirmation(
        'Clear Canvas',
        'Are you sure you want to clear the canvas? This will delete all nodes and connections.',
        {
            type: 'danger',
            confirmText: 'Clear All',
            cancelText: 'Cancel',
            icon: 'fas fa-trash-alt'
        }
    );
    
    if (confirmed) {
        clearCanvasSilent();
    }
}

// Clear the canvas without confirmation (used internally)
function clearCanvasSilent() {
    // Hide any active tooltips
    hideConnectionTooltip();
        
        // Clear all connections
        for (const connection of flowEditor.connections.values()) {
            if (connection.svg) {
                connection.svg.remove();
            }
        }
        flowEditor.connections.clear();
        
        // Clear all nodes
        for (const nodeId of flowEditor.nodes.keys()) {
            const nodeElement = document.getElementById(nodeId);
            if (nodeElement) {
                nodeElement.remove();
            }
        }
        flowEditor.nodes.clear();
        
        // Clear all tags
        for (const tagId of flowEditor.tags.keys()) {
            const tagElement = document.getElementById(tagId);
            if (tagElement) {
                tagElement.remove();
            }
        }
        flowEditor.tags.clear();
        
        // Update tag panel to reflect cleared tags
        if (typeof window.tagManager.updateTagPanel === 'function') {
            window.tagManager.updateTagPanel();
        }
        
        // Reset counters
        flowEditor.nodeCounter = 0;
        flowEditor.tagCounter = 0;
        flowEditor.selectedNode = null;
        
        // Clear current file path
        flowEditor.currentFilePath = null;
        
        // Reset pan offset to center of large canvas
        flowEditor.panOffset = { x: -5000, y: -5000 };
        
        // Reset zoom level
        flowEditor.zoomLevel = 1.0;
        
        if (typeof window.canvasManager.updateCanvasTransform === 'function') {
            window.canvasManager.updateCanvasTransform();
        }
        
        // Update filename display
        if (typeof window.fileManager.updateFilenameDisplay === 'function') {
            window.fileManager.updateFilenameDisplay();
        }
        
        // Clear config panel
        document.getElementById('node-config').innerHTML = '<p class="text-muted">Select a node to configure it</p>';
} 
