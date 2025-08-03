"""
Node Reference Data Processor for Enhanced Workflow Runner
Handles node reference nodes that access output data from previously executed nodes
"""

from typing import Dict, Any
from ..node_executors.base_executor import BaseNodeExecutor


class NodeReferenceDataProcessor(BaseNodeExecutor):
    """Processor for node reference nodes"""
    
    def get_node_types(self) -> list:
        return ['node_reference']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute node reference node - access output data from previously executed nodes"""
        config = node['config']
        source_node_id = config['source_node_id']['value']
        output_port_id = config['output_port_id']['value']
        fallback_value = config['fallback_value']['value']
        
        print(f"  🔗 Node Reference: source_node_id='{source_node_id}', output_port_id='{output_port_id}', fallback='{fallback_value}'")
        
        # Validate inputs
        if not source_node_id:
            print("  ⚠️ Node Reference: No source node selected")
            return self._create_fallback_result(fallback_value, 'No source node selected')
        
        if not output_port_id:
            print("  ⚠️ Node Reference: No output port selected")
            return self._create_fallback_result(fallback_value, 'No output port selected')
        
        try:
            # Get the referenced data from node_results (equivalent to frontend's getOutputPortData)
            if not node_results or source_node_id not in node_results:
                print(f"  ⚠️ Node Reference: No data found for node {source_node_id}")
                return self._create_fallback_result(fallback_value, f'No data found for node {source_node_id}')
            
            source_node_output = node_results[source_node_id]
            
            # Extract the specific output port data
            referenced_data = None
            if isinstance(source_node_output, dict) and output_port_id in source_node_output:
                referenced_data = source_node_output[output_port_id]
            elif isinstance(source_node_output, dict) and len(source_node_output) == 1:
                # Single output node - use the only available value
                referenced_data = list(source_node_output.values())[0]
            else:
                # Fallback - use the entire output
                referenced_data = source_node_output
            
            if referenced_data is None:
                print(f"  ⚠️ Node Reference: No data found for node {source_node_id}, port {output_port_id}")
                return self._create_fallback_result(fallback_value, f'No data found for node {source_node_id}, port {output_port_id}')
            
            # Successfully got the data - format it for all output types (matching frontend)
            print(f"  ✓ Node Reference: Successfully retrieved data from {source_node_id}.{output_port_id}: {type(referenced_data)}")
            
            return self._format_output_data(referenced_data)
            
        except Exception as e:
            print(f"  ✗ Node Reference execution error: {str(e)}")
            return self._create_fallback_result(fallback_value, str(e))
    
    def _create_fallback_result(self, fallback_value: str, error_message: str) -> Dict[str, Any]:
        """Create a result using the fallback value"""
        fallback = fallback_value if fallback_value else None
        
        return {
            'data': fallback,
            'text': str(fallback or ''),
            'json': fallback,
            'number': self._safe_to_number(fallback),
            'boolean': bool(fallback),
            'binary': None,
            'original': fallback,
            'error': error_message
        }
    
    def _format_output_data(self, referenced_data: Any) -> Dict[str, Any]:
        """Format the referenced data for all output types (matching frontend behavior)"""
        text_value = str(referenced_data)
        json_value = referenced_data
        number_value = self._safe_to_number(referenced_data)
        boolean_value = bool(referenced_data)
        
        # Handle different data types appropriately
        if isinstance(referenced_data, (int, float)):
            number_value = referenced_data
        elif isinstance(referenced_data, str):
            # Try to parse as number
            number_value = self._safe_to_number(referenced_data)
        
        # For JSON output, try to preserve object structure
        if isinstance(referenced_data, (dict, list)):
            json_value = referenced_data
            text_value = str(referenced_data)  # Simple string representation
        elif isinstance(referenced_data, str):
            try:
                # Try to parse as JSON
                import json
                json_value = json.loads(referenced_data)
            except (json.JSONDecodeError, ValueError):
                # Not valid JSON, keep as string
                json_value = referenced_data
        
        return {
            'data': referenced_data,
            'text': text_value,
            'json': json_value,
            'number': number_value,
            'boolean': boolean_value,
            'binary': referenced_data if isinstance(referenced_data, bytes) else None,
            'original': referenced_data
        }
    
    def _safe_to_number(self, value: Any) -> float:
        """Safely convert a value to a number, returning 0 if conversion fails"""
        try:
            if isinstance(value, (int, float)):
                return float(value)
            elif isinstance(value, str):
                return float(value)
            else:
                return 0.0
        except (ValueError, TypeError):
            return 0.0
