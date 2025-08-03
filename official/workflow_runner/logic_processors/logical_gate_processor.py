"""
Logical Gate Processor for Enhanced Workflow Runner
Handles logical gate operations and flow control
"""

from typing import Dict, Any
from ..node_executors.base_executor import BaseNodeExecutor


class LogicalGateProcessor(BaseNodeExecutor):
    """Processor for logical gate operations"""
    
    def get_node_types(self) -> list:
        return ['logical_gate']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute logical gate node for conditional execution control - enhanced to match frontend behavior"""
        config = node['config']
        invert = config['invert']['value'] == 'true'
        description = config.get('description', {}).get('value', '')
        
        try:
            # Handle structured input data (like frontend)
            condition = None
            
            # If input_data is a dict, look for condition port first
            if isinstance(input_data, dict):
                if 'condition' in input_data:
                    condition = input_data['condition']
                    print(f"  🔀 Logical Gate: Found condition port: {condition}")
                elif 'value' in input_data:
                    # Convert value to boolean
                    condition = bool(input_data['value'])
                    print(f"  🔀 Logical Gate: Using value port as condition: {condition}")
                else:
                    # Try common field names
                    for field in ['result', 'data', 'response', 'text']:
                        if field in input_data and input_data[field] is not None:
                            condition = bool(input_data[field])
                            print(f"  🔀 Logical Gate: Using {field} as condition: {condition}")
                            break
                    
                    if condition is None:
                        # Use any non-None value as True
                        condition = any(v is not None for v in input_data.values())
                        print(f"  🔀 Logical Gate: Using any non-None value as condition: {condition}")
            else:
                condition = bool(input_data)
                print(f"  🔀 Logical Gate: Using direct input as condition: {condition}")
            
            # Apply invert logic
            if invert:
                condition = not condition
            
            print(f"  🔀 Logical Gate: condition={condition}, invert={invert}")
            
            if condition:
                # Continue execution - pass through the input data
                return {'trigger': input_data if input_data is not None else True}
            else:
                # Stop execution
                print(f"  🛑 Logical Gate: Stopping execution (condition={condition})")
                return {'__stop_execution': True}
                
        except Exception as e:
            return {'error': str(e)}
