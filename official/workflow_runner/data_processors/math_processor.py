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
        
        # Safely extract config values, handling both numbers and dicts
        def safe_float_extract(config_value, default=0):
            if isinstance(config_value, dict):
                return default  # Config value is likely a connection, use default
            try:
                return float(config_value)
            except (ValueError, TypeError):
                return default
        
        config_value_a = safe_float_extract(config['value_a']['value']) if 'value_a' in config else 0
        config_value_b = safe_float_extract(config['value_b']['value']) if 'value_b' in config else 0
        decimal_places = int(config['decimal_places']['value']) if 'decimal_places' in config else 0
        
        try:
            # Get values from inputs or config
            value_a = config_value_a
            value_b = config_value_b
            
            if isinstance(input_data, dict):
                # Handle structured workflow data
                for port_name in ['value_a', 'number_a', 'data']:
                    if port_name in input_data:
                        port_data = input_data[port_name]
                        
                        # Handle nested workflow structure
                        if isinstance(port_data, dict):
                            if 'input_data' in port_data and isinstance(port_data['input_data'], dict):
                                # Extract from nested structure like {'input_data': {'result': number}}
                                inner_data = port_data['input_data']
                                for field in ['result', 'data', 'value', 'number']:
                                    if field in inner_data:
                                        try:
                                            value_a = float(inner_data[field])
                                            print(f"  🔍 Extracted value_a={value_a} from input_data.{field}")
                                            break
                                        except (ValueError, TypeError):
                                            continue
                            else:
                                # Try direct extraction from port_data
                                for field in ['result', 'data', 'value', 'number']:
                                    if field in port_data:
                                        try:
                                            value_a = float(port_data[field])
                                            print(f"  🔍 Extracted value_a={value_a} from {port_name}.{field}")
                                            break
                                        except (ValueError, TypeError):
                                            continue
                        else:
                            # Direct value
                            try:
                                value_a = float(port_data)
                                print(f"  🔍 Used direct value_a={value_a} from {port_name}")
                            except (ValueError, TypeError):
                                continue
                        break
                
                # Similar handling for value_b
                for port_name in ['value_b', 'number_b']:
                    if port_name in input_data:
                        port_data = input_data[port_name]
                        
                        if isinstance(port_data, dict):
                            if 'input_data' in port_data and isinstance(port_data['input_data'], dict):
                                inner_data = port_data['input_data']
                                for field in ['result', 'data', 'value', 'number']:
                                    if field in inner_data:
                                        try:
                                            value_b = float(inner_data[field])
                                            print(f"  🔍 Extracted value_b={value_b} from input_data.{field}")
                                            break
                                        except (ValueError, TypeError):
                                            continue
                            else:
                                for field in ['result', 'data', 'value', 'number']:
                                    if field in port_data:
                                        try:
                                            value_b = float(port_data[field])
                                            print(f"  🔍 Extracted value_b={value_b} from {port_name}.{field}")
                                            break
                                        except (ValueError, TypeError):
                                            continue
                        else:
                            try:
                                value_b = float(port_data)
                                print(f"  🔍 Used direct value_b={value_b} from {port_name}")
                            except (ValueError, TypeError):
                                continue
                        break
            
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
            
            # Format result properly based on decimal places
            if decimal_places == 0:
                # No decimals - format as integer
                formatted_result = str(int(result))
            elif decimal_places > 0:
                # Specific decimal places
                formatted_result = f"{result:.{decimal_places}f}"
            else:
                # Negative decimal places (shouldn't happen, but fallback)
                formatted_result = str(result)
            
            return {
                'result': result,
                'data': result,
                'text': formatted_result,
                'formatted': formatted_result
            }
            
        except Exception as e:
            print(f"  ✗ Math operation error: {e}")
            return {'error': str(e)}
