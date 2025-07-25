"""
Math Data Processor for Enhanced Workflow Runner
Handles mathematical operations and calculations
"""

import math
from typing import Dict, Any
from ..node_executors.base_executor import BaseNodeExecutor


class MathDataProcessor(BaseNodeExecutor):
    """Processor for mathematical operations"""
    
    def get_node_types(self) -> list:
        return ['math']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute math operations node - enhanced to match frontend behavior"""
        config = node['config']
        operation = config['operation']['value']
        config_value_a = float(config['value_a']['value']) if 'value_a' in config else 0
        config_value_b = float(config['value_b']['value']) if 'value_b' in config else 0
        decimal_places = int(config['decimal_places']['value']) if 'decimal_places' in config else 0
        
        try:
            # Get values from inputs or config
            value_a = config_value_a
            value_b = config_value_b
            
            if isinstance(input_data, dict):
                if 'value_a' in input_data:
                    value_a = float(input_data['value_a']) if input_data['value_a'] is not None else config_value_a
                elif 'number_a' in input_data:
                    value_a = float(input_data['number_a']) if input_data['number_a'] is not None else config_value_a
                
                if 'value_b' in input_data:
                    value_b = float(input_data['value_b']) if input_data['value_b'] is not None else config_value_b
                elif 'number_b' in input_data:
                    value_b = float(input_data['number_b']) if input_data['number_b'] is not None else config_value_b
                
                # Try to extract from other common fields
                if 'data' in input_data and input_data['data'] is not None:
                    try:
                        value_a = float(input_data['data'])
                    except (ValueError, TypeError):
                        pass
            
            print(f"  🧮 Math Op: {operation}, A={value_a}, B={value_b}")
            
            result = 0
            
            if operation == 'add':
                result = value_a + value_b
            elif operation == 'subtract':
                result = value_a - value_b
            elif operation == 'multiply':
                result = value_a * value_b
            elif operation == 'divide':
                if value_b == 0:
                    raise ValueError('Division by zero')
                result = value_a / value_b
            elif operation == 'modulo':
                if value_b == 0:
                    raise ValueError('Modulo by zero')
                result = value_a % value_b
            elif operation == 'power':
                result = value_a ** value_b
            elif operation == 'min':
                result = min(value_a, value_b)
            elif operation == 'max':
                result = max(value_a, value_b)
            elif operation == 'abs':
                result = abs(value_a)
            elif operation == 'round':
                result = round(value_a)
            elif operation == 'floor':
                result = math.floor(value_a)
            elif operation == 'ceil':
                result = math.ceil(value_a)
            else:
                result = value_a
            
            # Apply decimal places
            if decimal_places >= 0:
                result = round(result, decimal_places)
            
            return {
                'result': result,
                'data': result,
                'text': str(result),
                'formatted': f"{result:.{decimal_places}f}" if decimal_places > 0 else str(result)
            }
            
        except Exception as e:
            print(f"  ✗ Math operation error: {e}")
            return {'error': str(e)}
