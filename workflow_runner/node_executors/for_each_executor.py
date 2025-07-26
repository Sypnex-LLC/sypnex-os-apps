"""
For Each Node Executor for Enhanced Workflow Runner
Handles iteration through arrays and controls downstream execution
"""

import json
from typing import Dict, Any, List
from .base_executor import BaseNodeExecutor


class ForEachNodeExecutor(BaseNodeExecutor):
    """Executor for for_each nodes - handles iteration and execution control"""
    
    def get_node_types(self) -> list:
        return ['for_each']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute for_each node - this is a special node that controls downstream execution"""
        try:
            config = node['config']
            stop_on_error = config.get('stop_on_error', {}).get('value', 'true').lower() == 'true'
            
            # Get the iteration delay from config (in milliseconds, convert to seconds for backend)
            iteration_delay_ms = config.get('iteration_delay', {}).get('value', 0)
            iteration_delay = float(iteration_delay_ms) / 1000.0 if iteration_delay_ms else 0.0
            
            # Get the array to iterate over from input_data (matching frontend logic)
            array_data = None
            if input_data and isinstance(input_data, dict):
                # Try multiple input names like frontend does
                array_data = input_data.get('array') or input_data.get('data') or input_data.get('file_names') or input_data.get('items')
            
            # Ensure we have a valid array
            if not isinstance(array_data, list):
                return {'error': 'for_each node requires an array input'}
            
            print(f"  for_each processing array with {len(array_data)} items")
            print(f"  stop_on_error: {stop_on_error}")
            print(f"  iteration_delay: {iteration_delay}s ({iteration_delay_ms}ms)")
            
            # Return a special marker indicating this is a for_each control node
            # The execution manager will handle the actual iteration
            return {
                'for_each_control': True,
                'array_data': array_data,
                'stop_on_error': stop_on_error,
                'iteration_delay': iteration_delay,
                'node_id': node['id'],
                'total_items': len(array_data)
            }
            
        except Exception as e:
            print(f"  ✗ Exception in for_each: {str(e)}")
            return {'error': str(e)}
