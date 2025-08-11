// main.js - Entry point for Flow Editor

// Global variables (scoped to avoid global pollution)
let flowEditor = {
    nodes: new Map(),
    connections: new Map(),
    selectedNode: null,
    draggingNode: null,
    connectingFrom: null,
    canvas: null,
    nodeCounter: 0,
    isRunning: false,
    currentFilePath: null,
    isActive: true,
    // Canvas panning state
    isPanning: false,
    panStart: { x: 0, y: 0 },
    panOffset: { x: -5000, y: -5000 }, // Center the large canvas initially
    lastPanOffset: { x: -5000, y: -5000 },
    // Zoom state
    zoomLevel: 1.0,
    minZoom: 0.1,
    maxZoom: 3.0,
    zoomStep: 0.1,
    // Tag system
    tags: new Map(),
    tagCounter: 0,
    draggingTag: null,
    tagDragOffset: null,
    tagUpdateTimeout: null,
    // Visual performance flags
    transformUpdateRequested: false,
    isZooming: false,
    isResetting: false,
    redrawInProgress: false,
    lastWheelTime: 0,
    // Timeout IDs for cleanup
    zoomRedrawTimeout: null,
    zoomFitTimeout: null,
    resetTimeout: null
};

// Initialize when DOM is ready
async function initFlowEditor() {
    
    // Check if SypnexAPI is available (local variable in sandboxed environment)
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI) {
        console.warn('SypnexAPI not available - running in standalone mode');
        return;
    }

    
    // Initialize scale detection for app scaling compensation
    if (typeof sypnexAPI !== 'undefined' && sypnexAPI.initScaleDetection) {
        sypnexAPI.initScaleDetection((newScale, oldScale) => {
            // Redraw connections when scale changes
            if (typeof redrawAllConnections === 'function') {
                redrawAllConnections();
            }
        });
    }
    
    // Test VFS API
    try {
        const testResult = await sypnexAPI.listVirtualFiles('/');
    } catch (error) {
        console.error('VFS API test failed:', error);
    }
    
    // Initialize canvas
    flowEditor.canvas = document.getElementById('flow-canvas');
    if (!flowEditor.canvas) {
        console.error('Flow canvas not found');
        return;
    }
    
    // Create SVG marker definitions for connection arrows
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#4CAF50');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    
    // Create a temporary SVG container for the marker definition
    const markerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    markerSvg.style.position = 'absolute';
    markerSvg.style.width = '0';
    markerSvg.style.height = '0';
    markerSvg.appendChild(defs);
    flowEditor.canvas.appendChild(markerSvg);
    
    // Initialize canvas transform for panning
    sypnexAPI.getAppWindow().canvasManager.updateCanvasTransform();
    
    // Load nodes from VFS
    await nodeRegistry.loadNodesFromVFS();
    
    // Populate toolbox with loaded nodes
    sypnexAPI.getAppWindow().uiManager.populateToolbox();
    
    // Set up event handlers
    sypnexAPI.getAppWindow().uiManager.setupEventHandlers();
    
    // Set up keyboard shortcuts using new SypnexAPI
    setupKeyboardShortcuts();
    
    // Handle fullscreen changes to prevent visual flashing
    function handleFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        
        if (isFullscreen) {
            // Add no-transitions class when entering fullscreen
            document.body.classList.add('no-transitions');
            setTimeout(() => {
                document.body.classList.remove('no-transitions');
                // Redraw connections after fullscreen transition
                requestAnimationFrame(() => {
                    redrawAllConnections();
                });
            }, 500); // Allow fullscreen transition to complete
        } else {
            // Add no-transitions class when exiting fullscreen
            document.body.classList.add('no-transitions');
            setTimeout(() => {
                document.body.classList.remove('no-transitions');
                // Redraw connections after fullscreen transition
                requestAnimationFrame(() => {
                    redrawAllConnections();
                });
            }, 500);
        }
    }
    
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Handle window resize to update connections with debouncing
    let resizeTimeout;
    sypnexAPI.getAppWindow().addEventListener('resize', () => {
        // Add no-transitions class during resize to prevent flashing
        document.body.classList.add('no-transitions');
        
        // Debounce resize events to prevent overwhelming the system
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Remove no-transitions class
            document.body.classList.remove('no-transitions');
            // Use requestAnimationFrame for smooth updates
            requestAnimationFrame(() => {
                redrawAllConnections();
            });
        }, 150); // 150ms debounce
    });
    
    // Handle app cleanup when window is unloaded
    sypnexAPI.getAppWindow().addEventListener('beforeunload', cleanupFlowEditor);
    sypnexAPI.getAppWindow().addEventListener('pagehide', cleanupFlowEditor);
    sypnexAPI.getAppWindow().addEventListener('unload', cleanupFlowEditor);
    
    // Flow Editor loaded successfully (no notification needed)
    
    // Update filename display
    sypnexAPI.getAppWindow().fileManager.updateFilenameDisplay();
    
}

// Cleanup function to remove tooltips and event listeners
function cleanupFlowEditor() {
    // Mark app as inactive to prevent new tooltips
    flowEditor.isActive = false;
    
    // Clear all timeouts to prevent memory leaks
    clearTimeout(flowEditor.zoomRedrawTimeout);
    clearTimeout(flowEditor.zoomFitTimeout);
    clearTimeout(flowEditor.resetTimeout);
    clearTimeout(flowEditor.tagUpdateTimeout);
    clearTimeout(flowEditor.updateTimeout);
    
    // Remove any lingering tooltips (check multiple possible locations)
    const tooltips = document.querySelectorAll('.connection-tooltip, #connection-tooltip');
    tooltips.forEach(tooltip => {
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    });
    
    // Remove global event listeners
    if (sypnexAPI.getAppWindow().flowEditorTooltipHandler) {
        document.removeEventListener('mousemove', sypnexAPI.getAppWindow().flowEditorTooltipHandler);
        sypnexAPI.getAppWindow().flowEditorTooltipHandler = null;
    }
    
    // Clear any other global references
    if (sypnexAPI.getAppWindow().flowEditorTooltipHandler) {
        delete sypnexAPI.getAppWindow().flowEditorTooltipHandler;
    }
    
    // Reset visual state flags
    flowEditor.transformUpdateRequested = false;
    flowEditor.isZooming = false;
    flowEditor.isResetting = false;
    flowEditor.redrawInProgress = false;
    
    // Also remove any tooltips that might be in the body
    const bodyTooltips = document.body.querySelectorAll('.connection-tooltip');
    bodyTooltips.forEach(tooltip => {
        if (tooltip.parentNode) {
            tooltip.parentNode.removeChild(tooltip);
        }
    });
    
}

// Add a new node to the canvas (dynamic version)
function addNode(type) {
    const nodeDef = nodeRegistry.getNodeType(type);
    if (!nodeDef) {
        console.error('Unknown node type:', type);
        return;
    }
    
    const nodeId = `node_${++flowEditor.nodeCounter}`;
    
    // Calculate position relative to current viewport center
    const center = sypnexAPI.getAppWindow().flowEditorUtils ? 
        sypnexAPI.getAppWindow().flowEditorUtils.getViewportCenterInCanvas() :
        { x: 5000, y: 5000 }; // Fallback to canvas center
    
    // Add some random offset around the center
    const offsetX = (Math.random() - 0.5) * 200; // -100 to +100
    const offsetY = (Math.random() - 0.5) * 200; // -100 to +100
    
    const node = {
        id: nodeId,
        type: type,
        x: center.x + offsetX,
        y: center.y + offsetY,
        config: JSON.parse(JSON.stringify(nodeDef.config)), // Deep copy
        data: {}
    };
    
    // Initialize special node states
    if (type === 'repeater') {
        node.repeaterState = {
            count: 0,
            interval: null,
            isRunning: false
        };
    }
    
    flowEditor.nodes.set(nodeId, node);
    
    // Create node element using the renderer
    const nodeElement = nodeRenderer.createNodeElement(node);
    flowEditor.canvas.appendChild(nodeElement);
    
}

// Setup keyboard shortcuts using new SypnexAPI
function setupKeyboardShortcuts() {
    // Check if SypnexAPI keyboard functionality is available
    if (typeof sypnexAPI === 'undefined' || !sypnexAPI || !sypnexAPI.registerKeyboardShortcuts) {
        console.warn('SypnexAPI keyboard shortcuts not available - Flow Editor keyboard shortcuts disabled');
        return;
    }
    
    // Register keyboard shortcuts using the new SypnexAPI
    // Map keys to their handlers, preserving all the original logic from handleKeyDown
    sypnexAPI.registerKeyboardShortcuts({
        'delete': () => {
            if (flowEditor.selectedNode) {
                deleteSelectedNode();
            }
        },
        'ctrl+backspace': () => {
            if (flowEditor.selectedNode) {
                deleteSelectedNode();
            }
        },
        'cmd+backspace': () => {
            if (flowEditor.selectedNode) {
                deleteSelectedNode();
            }
        },
        'escape': () => {
            // Deselect node
            if (flowEditor.selectedNode) {
                const nodeElement = document.getElementById(flowEditor.selectedNode);
                if (nodeElement) nodeElement.classList.remove('selected');
                flowEditor.selectedNode = null;
                document.getElementById('node-config').innerHTML = '<p class="text-muted">Select a node to configure it</p>';
            }
        },
        'ctrl+s': () => {
            sypnexAPI.getAppWindow().fileManager.saveFlow();
        },
        'cmd+s': () => {
            sypnexAPI.getAppWindow().fileManager.saveFlow();
        },
        'ctrl+shift+s': () => {
            sypnexAPI.getAppWindow().fileManager.saveFlowAs();
        },
        'cmd+shift+s': () => {
            sypnexAPI.getAppWindow().fileManager.saveFlowAs();
        },
        'ctrl+o': () => {
            sypnexAPI.getAppWindow().fileManager.loadFlow();
        },
        'cmd+o': () => {
            sypnexAPI.getAppWindow().fileManager.loadFlow();
        },
        'ctrl+=': () => {
            sypnexAPI.getAppWindow().canvasManager.zoomIn();
        },
        'cmd+=': () => {
            sypnexAPI.getAppWindow().canvasManager.zoomIn();
        },
        'ctrl+-': () => {
            sypnexAPI.getAppWindow().canvasManager.zoomOut();
        },
        'cmd+-': () => {
            sypnexAPI.getAppWindow().canvasManager.zoomOut();
        },
        'ctrl+0': () => {
            sypnexAPI.getAppWindow().canvasManager.resetCanvasPan();
        },
        'cmd+0': () => {
            sypnexAPI.getAppWindow().canvasManager.resetCanvasPan();
        },
        'ctrl+shift+f': () => {
            sypnexAPI.getAppWindow().canvasManager.zoomToFit();
        },
        'cmd+shift+f': () => {
            sypnexAPI.getAppWindow().canvasManager.zoomToFit();
        }
    }, {
        preventDefault: true,
        stopPropagation: false
    });
    

}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFlowEditor);
} else {
    // DOM is already loaded
    initFlowEditor();
}


