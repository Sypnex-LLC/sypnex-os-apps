
// Populate toolbox with loaded nodes
function populateToolbox() {
    const toolbox = document.querySelector('.flow-toolbox');
    if (!toolbox) {
        console.error('Toolbox not found');
        return;
    }
    
    // Clear existing toolbox content
    const toolboxContent = toolbox.querySelector('.toolbox-content');
    if (toolboxContent) {
        toolboxContent.innerHTML = '';
    }
    
    // Group nodes by category
    const categories = {};
    const allNodes = nodeRegistry.getAllNodeTypes();
    
    
    allNodes.forEach(nodeDef => {
        const category = nodeDef.category || 'other';
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(nodeDef);
    });
    
    
    // Create toolbox sections for each category
    Object.entries(categories).forEach(([category, nodes]) => {
        const categorySection = document.createElement('div');
        categorySection.className = 'node-category';
        categorySection.innerHTML = `
            <h5>${category.charAt(0).toUpperCase() + category.slice(1)}</h5>
            ${nodes.map(nodeDef => `
                <button class="toolbox-node-btn" data-node-type="${nodeDef.id}" title="${nodeDef.description}">
                    <i class="${nodeDef.icon}"></i>
                    <span>${nodeDef.name}</span>
                </button>
            `).join('')}
        `;
        
        if (toolboxContent) {
            toolboxContent.appendChild(categorySection);
        }
    });
    
    // Re-attach event listeners
    document.querySelectorAll('.toolbox-node-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const nodeType = btn.getAttribute('data-node-type');
            if (nodeType) {
                addNode(nodeType);
            }
        });
    });
    
}

// Set up event handlers
function setupEventHandlers() {
    // Note: Toolbox node button event listeners are set up in populateToolbox()
    // to avoid duplicates when the toolbox is repopulated
    
    // Workflow actions
    document.getElementById('run-workflow')?.addEventListener('click', runWorkflow);
    document.getElementById('stop-workflow')?.addEventListener('click', stopWorkflow);
    // Note: delete-selected, clear-canvas, reset-view, and add-tag are now handled by hamburger menu
    
    // Zoom controls
    document.getElementById('zoom-in')?.addEventListener('click', sypnexAPI.getAppWindow().canvasManager.zoomIn);
    document.getElementById('zoom-out')?.addEventListener('click', sypnexAPI.getAppWindow().canvasManager.zoomOut);
    document.getElementById('zoom-fit')?.addEventListener('click', sypnexAPI.getAppWindow().canvasManager.zoomToFit);
    
    // Note: File operations (save, save-as, load) are now handled by hamburger menu
    document.getElementById('clear-output')?.addEventListener('click', clearOutput);
    
    // Hamburger menu
    setupHamburgerMenu();
    
    // Config panel toggle
    document.getElementById('toggle-config')?.addEventListener('click', toggleConfigPanel);
    
    // Initialize config panel state (without overriding icons)
    const configPanel = document.getElementById('flow-config-panel');
    if (configPanel) {
        // Default expanded (not collapsed)
        configPanel.classList.remove('collapsed');
    }
    
    // Toolbox toggle
    const toolbox = document.getElementById('flow-toolbox');
    const toolboxContent = document.getElementById('toolbox-content');
    const toggleToolboxBtn = document.getElementById('toggle-toolbox');
    if (toolbox && toolboxContent && toggleToolboxBtn) {
        // Default expanded (not collapsed)
        toolbox.classList.remove('collapsed');
        toolboxContent.style.display = '';

        toggleToolboxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleToolbox();
        });
    }
    
    // Output panel toggle
    const outputPanel = document.getElementById('flow-output-panel');
    const outputContent = document.getElementById('output-content');
    const toggleOutputBtn = document.getElementById('toggle-output');
    if (outputPanel && outputContent && toggleOutputBtn) {
        // Default collapsed
        outputPanel.classList.add('collapsed');
        outputContent.style.display = 'none';
        toggleOutputBtn.querySelector('i').className = 'fas fa-chevron-down';

        toggleOutputBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isCollapsed = outputPanel.classList.contains('collapsed');
            if (isCollapsed) {
                outputPanel.classList.remove('collapsed');
                outputContent.style.display = '';
                toggleOutputBtn.querySelector('i').className = 'fas fa-chevron-up';
            } else {
                outputPanel.classList.add('collapsed');
                outputContent.style.display = 'none';
                toggleOutputBtn.querySelector('i').className = 'fas fa-chevron-down';
            }
        });
    }
    
    // Canvas events
    flowEditor.canvas.addEventListener('click', sypnexAPI.getAppWindow().canvasManager.handleCanvasClick);
    flowEditor.canvas.addEventListener('mousedown', sypnexAPI.getAppWindow().canvasManager.startCanvasPan);
    flowEditor.canvas.addEventListener('wheel', sypnexAPI.getAppWindow().canvasManager.handleMouseWheel, { passive: false });
    
    // Document-level mouse events for smooth dragging and panning
    document.addEventListener('mousedown', sypnexAPI.getAppWindow().canvasManager.handleDocumentMouseDown);
    document.addEventListener('mousemove', sypnexAPI.getAppWindow().canvasManager.handleDocumentMouseMove);
    document.addEventListener('mouseup', sypnexAPI.getAppWindow().canvasManager.handleDocumentMouseUp);
    

}

// Toggle config panel
function toggleConfigPanel() {
    const configPanel = document.getElementById('flow-config-panel');
    const toggleBtn = document.getElementById('toggle-config');
    const icon = toggleBtn.querySelector('i');
    
    if (configPanel.classList.contains('collapsed')) {
        // Expand
        configPanel.classList.remove('collapsed');
        icon.className = 'fas fa-chevron-right';
        toggleBtn.title = 'Collapse Configuration Panel';
    } else {
        // Collapse
        configPanel.classList.add('collapsed');
        icon.className = 'fas fa-chevron-left';
        toggleBtn.title = 'Expand Configuration Panel';
    }
}

// Toggle toolbox
function toggleToolbox() {
    const toolbox = document.getElementById('flow-toolbox');
    const toolboxContent = document.getElementById('toolbox-content');
    const toggleBtn = document.getElementById('toggle-toolbox');
    const icon = toggleBtn.querySelector('i');
    
    if (toolbox.classList.contains('collapsed')) {
        // Expand
        toolbox.classList.remove('collapsed');
        toolboxContent.style.display = '';
        icon.className = 'fas fa-chevron-left';
        toggleBtn.title = 'Collapse Toolbox';
    } else {
        // Collapse
        toolbox.classList.add('collapsed');
        toolboxContent.style.display = 'none';
        icon.className = 'fas fa-chevron-right';
        toggleBtn.title = 'Expand Toolbox';
    }
}

// Setup hamburger menu functionality
function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburger-menu');
    const dropdownMenu = document.getElementById('dropdown-menu');
    
    if (!hamburgerBtn || !dropdownMenu) {
        console.error('Hamburger menu elements not found');
        return;
    }
    
    // Toggle menu on hamburger click
    hamburgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Position the dropdown relative to the hamburger button
        if (!dropdownMenu.classList.contains('show')) {
            // Use scaled mouse coordinates for more intuitive positioning
            const mouseCoords = (typeof sypnexAPI !== 'undefined' && sypnexAPI.getScaledMouseCoords) ? 
                sypnexAPI.getScaledMouseCoords(e) :
                { x: e.clientX, y: e.clientY };
            
            const container = hamburgerBtn.closest('.flow-editor, .app-container');
            const containerRect = (typeof sypnexAPI !== 'undefined' && sypnexAPI.getScaledBoundingClientRect && container) ?
                sypnexAPI.getScaledBoundingClientRect(container) :
                (container ? container.getBoundingClientRect() : { top: 0, left: 0 });
            
            // Position relative to mouse click, offset slightly to avoid covering the button
            const relativeTop = mouseCoords.y - containerRect.top + 5;
            const relativeLeft = mouseCoords.x - containerRect.left - 180 - 10 + 20; // Menu width + small gap, then 20px more to the right
            
            dropdownMenu.style.top = relativeTop + 'px';
            dropdownMenu.style.left = relativeLeft + 'px';
        }
        
        dropdownMenu.classList.toggle('show');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    });
    
    // Handle menu item clicks - ONLY the specific actions requested
    dropdownMenu.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.menu-item');
        if (!menuItem) return;
        
        const action = menuItem.dataset.action;
        if (!action) return;
        
        // Close the menu
        dropdownMenu.classList.remove('show');
        
        // Execute ONLY the requested actions: save, save-as, load, delete, clear-all, reset-view, add-tag
        switch (action) {
            case 'save-flow':
                if (sypnexAPI.getAppWindow().fileManager && sypnexAPI.getAppWindow().fileManager.saveFlow) {
                    sypnexAPI.getAppWindow().fileManager.saveFlow();
                }
                break;
            case 'save-flow-as':
                if (sypnexAPI.getAppWindow().fileManager && sypnexAPI.getAppWindow().fileManager.saveFlowAs) {
                    sypnexAPI.getAppWindow().fileManager.saveFlowAs();
                }
                break;
            case 'load-flow':
                if (sypnexAPI.getAppWindow().fileManager && sypnexAPI.getAppWindow().fileManager.loadFlow) {
                    sypnexAPI.getAppWindow().fileManager.loadFlow();
                }
                break;
            case 'add-tag':
                if (sypnexAPI.getAppWindow().tagManager && sypnexAPI.getAppWindow().tagManager.addTag) {
                    sypnexAPI.getAppWindow().tagManager.addTag();
                }
                break;
            case 'reset-view':
                if (sypnexAPI.getAppWindow().canvasManager && sypnexAPI.getAppWindow().canvasManager.resetCanvasPan) {
                    sypnexAPI.getAppWindow().canvasManager.resetCanvasPan();
                }
                break;
            case 'delete-selected':
                if (typeof deleteSelectedNode === 'function') {
                    deleteSelectedNode();
                }
                break;
            case 'clear-canvas':
                if (typeof clearCanvas === 'function') {
                    clearCanvas();
                }
                break;
        }
    });
}

// Example: ui-manager.js
sypnexAPI.getAppWindow().uiManager = {
    populateToolbox,
    setupEventHandlers,
    toggleConfigPanel,
    toggleToolbox
};