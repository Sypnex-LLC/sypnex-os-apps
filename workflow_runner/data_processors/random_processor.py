"""
Random Data Processor for Enhanced Workflow Runner
Handles random number generation nodes
"""

import random
from typing import Dict, Any
from ..node_executors.base_executor import BaseNodeExecutor


class RandomDataProcessor(BaseNodeExecutor):
    """Processor for random number generation nodes"""
    
    def get_node_types(self) -> list:
        return ['random']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute random number generation node"""
        config = node['config']
        min_value = float(config['min_value']['value'])
        max_value = float(config['max_value']['value'])
        decimal_places = int(config['decimal_places']['value'])
        output_type = config['output_type']['value']
        
        print(f"  🎲 Random: min={min_value}, max={max_value}, decimal_places={decimal_places}, output_type={output_type}")
        
        # Validate range
        if min_value >= max_value:
            print("  ⚠️ Random: Minimum value must be less than maximum value")
            return {
                'number': 0,
                'text': '0',
                'data': '0',
                'integer': 0,
                'float': 0.0,
                'error': 'Invalid range: minimum must be less than maximum'
            }
        
        try:
            # Generate random number between min and max
            random_value = random.uniform(min_value, max_value)
            
            # Apply output type and decimal places
            if output_type == 'integer' or decimal_places == 0:
                random_value = round(random_value)
            else:
                random_value = round(random_value, decimal_places)
            
            print(f"  ✓ Random: Generated {random_value} ({output_type}) in range {min_value}-{max_value}")
            
            return {
                'number': random_value,
                'text': str(random_value),  # Convert to string for VFS compatibility
                'data': str(random_value),  # Convert to string for VFS compatibility
                'integer': int(round(random_value)),
                'float': float(random_value) if decimal_places > 0 else float(random_value)
            }
            
        except Exception as e:
            print(f"  ✗ Random execution error: {str(e)}")
            return {
                'number': 0,
                'text': '0',
                'data': '0',
                'integer': 0,
                'float': 0.0,
                'error': str(e)
            }
