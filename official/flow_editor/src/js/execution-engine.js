// execution-engine.js - Dynamic execution engine for Flow Editor

class ExecutionEngine {
    constructor(registry) {
        this.registry = registry;
        this.setupExecutors();
    }

    setupExecutors() {
        // Register executors from external files with engine instance passed as first parameter
        this.registry.registerExecutor('http_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().httpExecutors.executeHttpNode(this, node, inputData, executed));
        this.registry.registerExecutor('vfs_save_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().httpExecutors.executeVfsSaveNode(this, node, inputData, executed));
        this.registry.registerExecutor('vfs_load_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().httpExecutors.executeVfsLoadNode(this, node, inputData, executed));
        this.registry.registerExecutor('vfs_directory_list_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().httpExecutors.executeVfsDirectoryListNode(this, node, inputData, executed));
            
        this.registry.registerExecutor('timer_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().flowExecutors.executeTimerNode(this, node, inputData, executed));
        this.registry.registerExecutor('display_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().flowExecutors.executeDisplayNode(this, node, inputData, executed));
        this.registry.registerExecutor('repeater_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().flowExecutors.executeRepeaterNode(this, node, inputData, executed));
        this.registry.registerExecutor('condition_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().flowExecutors.executeConditionNode(this, node, inputData, executed));
        this.registry.registerExecutor('logical_gate_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().flowExecutors.executeLogicalGateNode(this, node, inputData, executed));
        this.registry.registerExecutor('for_each_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().flowExecutors.executeForEachNode(this, node, inputData, executed));
        this.registry.registerExecutor('delay_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().flowExecutors.executeDelayNode(this, node, inputData, executed));
            
        this.registry.registerExecutor('audio_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().mediaExecutors.executeAudioNode(this, node, inputData, executed));
        this.registry.registerExecutor('image_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().mediaExecutors.executeImageNode(this, node, inputData, executed));
            
        this.registry.registerExecutor('json_extract_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().dataExecutors.executeJsonExtractNode(this, node, inputData, executed));
        this.registry.registerExecutor('random_line_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().dataExecutors.executeRandomQuoteNode(this, node, inputData, executed));
        this.registry.registerExecutor('text_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().dataExecutors.executeTextNode(this, node, inputData, executed));
        this.registry.registerExecutor('math_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().dataExecutors.executeMathNode(this, node, inputData, executed));
        this.registry.registerExecutor('array_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().dataExecutors.executeArrayNode(this, node, inputData, executed));
        this.registry.registerExecutor('string_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().dataExecutors.executeStringNode(this, node, inputData, executed));
        this.registry.registerExecutor('node_reference_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().dataExecutors.executeNodeReferenceNode(this, node, inputData, executed));
        this.registry.registerExecutor('random_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().dataExecutors.executeRandomNode(this, node, inputData, executed));
            
        this.registry.registerExecutor('llm_chat_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().aiExecutors.executeLlmChatNode(this, node, inputData, executed));
        this.registry.registerExecutor('terminal_executor', (node, inputData, executed) => 
            sypnexAPI.getAppWindow().aiExecutors.executeTerminalNode(this, node, inputData, executed));
    }

    async executeNode(node, inputData, executed) {
        const nodeDef = this.registry.getNodeType(node.type);
        if (!nodeDef) {
            throw new Error(`No node definition found for type: ${node.type}`);
        }

        const executorName = nodeDef.executor;
        const executor = this.registry.getExecutor(executorName);

        if (!executor) {
            throw new Error(`No executor found for: ${executorName}`);
        }

        return await executor(node, inputData, executed);
    }



    // Stop repeater method
    stopRepeater(node) {
        if (node.repeaterState && node.repeaterState.interval) {
            clearInterval(node.repeaterState.interval);
            node.repeaterState.interval = null;
            node.repeaterState.isRunning = false;
        }
    }

    // Stop for each method
    stopForEach(node) {
        if (node.forEachState && node.forEachState.interval) {
            clearInterval(node.forEachState.interval);
            node.forEachState.interval = null;
            node.forEachState.isIterating = false;
        }
    }




}

// Global execution engine instance
const executionEngine = new ExecutionEngine(nodeRegistry);
