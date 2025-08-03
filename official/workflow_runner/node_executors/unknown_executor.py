"""
Unknown Node Executor for Enhanced Workflow Runner
Handles unknown node types as fallback
"""

from typing import Dict, Any
from .base_executor import BaseNodeExecutor


class UnknownNodeExecutor(BaseNodeExecutor):
    """Fallback executor for unknown node types"""
    
    def get_node_types(self) -> list:
        return ['unknown']  # Special type for fallback
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute an unknown node type based on its definition"""
        node_type = node['type']
        config = node.get('config', {})
        node_def = self.workflow_runner.load_node_definition(node_type)
        
        print(f"  🔍 Executing unknown node type: {node_type}")
        print(f"  🔍 Node definition: {node_def}")
        
        # Try to determine what this node should do based on its definition
        outputs = node_def.get('outputs', [])
        inputs = node_def.get('inputs', [])
        
        # Create a basic result based on outputs
        result = {}
        for output in outputs:
            output_id = output.get('id', 'data')
            output_type = output.get('type', 'data')
            
            # Generate appropriate default values based on output type
            if output_type == 'text':
                result[output_id] = f"Processed {node_type} output"
            elif output_type == 'json':
                result[output_id] = {"node_type": node_type, "processed": True}
            elif output_type == 'number':
                result[output_id] = 1
            elif output_type == 'boolean':
                result[output_id] = True
            elif output_type == 'binary':
                result[output_id] = b"default_binary_data"
            else:  # data or any other type
                result[output_id] = f"Default {node_type} data"
        
        # Add input data if available
        if input_data:
            result['input_data'] = input_data
        
        # Add node metadata
        result['node_type'] = node_type
        result['node_id'] = node['id']
        result['processed'] = True
        
        return result
