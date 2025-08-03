"""
Delay Node Executor for Enhanced Workflow Runner
Handles delaying execution for a specified amount of time
"""

import time
from typing import Dict, Any
from .base_executor import BaseNodeExecutor


class DelayNodeExecutor(BaseNodeExecutor):
    """Executor for delay nodes - delays execution then passes data through"""
    
    def get_node_types(self) -> list:
        return ['delay']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute delay node - wait for specified time then return input data"""
        try:
            config = node['config']
            
            # Get delay in milliseconds, convert to seconds for backend
            delay_ms = config.get('delay_ms', {}).get('value', 1000)
            delay_seconds = float(delay_ms) / 1000.0
            
            print(f"  Delay node starting {delay_ms}ms ({delay_seconds}s) delay")
            
            # Get the input data to pass through after delay
            data_to_pass_through = None
            if input_data and isinstance(input_data, dict):
                # Try to get 'data' field first, then any other available input
                data_to_pass_through = input_data.get('data')
                if data_to_pass_through is None and input_data:
                    # Use the first available input
                    first_key = next(iter(input_data.keys()))
                    data_to_pass_through = input_data[first_key]
            else:
                # If input_data is not a dict, use it directly
                data_to_pass_through = input_data
            
            # Wait for the specified delay
            time.sleep(delay_seconds)
            
            print(f"  Delay node completed after {delay_ms}ms")
            
            # Return the same data that was input
            return {
                'data': data_to_pass_through,
                'original_data': data_to_pass_through,
                'processed_data': data_to_pass_through,
                'delay_ms': delay_ms,
                'timestamp': int(time.time() * 1000)  # Current timestamp in milliseconds
            }
            
        except Exception as e:
            print(f"  ✗ Exception in delay node: {str(e)}")
            return {'error': str(e)}
