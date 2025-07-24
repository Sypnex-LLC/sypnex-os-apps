// node-registry.js - Dynamic node registry for Flow Editor

class NodeRegistry {
    constructor() {
        this.nodeTypes = new Map();
        this.executors = new Map();
        this.loaded = false;
    }
    
    async loadNodesFromVFS() {
        if (this.loaded) return;
        
        try {
            
            // Load the packed nodes file directly
            const packFilePath = '/nodes/nodes-pack.json';
            
            const content = await sypnexAPI.readVirtualFileText(packFilePath);
            const packData = JSON.parse(content);
            
            
            // Register all nodes from the pack
            for (const [nodeId, nodeDef] of Object.entries(packData.nodes)) {
                this.registerNode(nodeDef);
            }
            
            this.loaded = true;
            
        } catch (error) {
            console.error('Failed to load nodes from VFS packed file:', error);
            throw error; // Re-throw to indicate failure
        }
    }
    
    async loadNodeFile(filePath) {
        try {
            const content = await sypnexAPI.readVirtualFileText(filePath);
            const nodeDef = JSON.parse(content);
            this.registerNode(nodeDef);
        } catch (error) {
            console.error(`Failed to load node from ${filePath}:`, error);
        }
    }
    
    registerNode(nodeDef) {
        this.nodeTypes.set(nodeDef.id, nodeDef);
    }
    
    registerExecutor(name, executor) {
        this.executors.set(name, executor);
    }
    
    getNodeType(id) {
        return this.nodeTypes.get(id);
    }
    
    getExecutor(name) {
        return this.executors.get(name);
    }
    
    getAllNodeTypes() {
        return Array.from(this.nodeTypes.values());
    }
    
    getNodeTypesByCategory(category) {
        return this.getAllNodeTypes().filter(node => node.category === category);
    }
}

// Global node registry instance
const nodeRegistry = new NodeRegistry();
