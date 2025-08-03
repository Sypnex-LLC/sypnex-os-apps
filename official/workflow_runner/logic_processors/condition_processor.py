"""
Condition Processor for Enhanced Workflow Runner
Handles condition and comparison logic
"""

from typing import Dict, Any
from ..node_executors.base_executor import BaseNodeExecutor


class ConditionProcessor(BaseNodeExecutor):
    """Processor for condition and comparison operations"""
    
    def get_node_types(self) -> list:
        return ['condition']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute condition node for comparing values - enhanced to match frontend behavior"""
        config = node['config']
        operator = config['operator']['value']
        compare_value = config['compare_value']['value']
        case_sensitive = config.get('case_sensitive', {}).get('value', 'true') == 'true'
        
        try:
            # Handle structured input data (like frontend)
            value = None
            
            # If input_data is a dict, look for value port first
            if isinstance(input_data, dict):
                if 'value' in input_data:
                    value = input_data['value']
                    print(f"  🔍 Condition: Found value port: {value}")
                else:
                    # Try common field names
                    for field in ['extracted_value', 'data', 'response', 'text']:
                        if field in input_data and input_data[field] is not None:
                            value = input_data[field]
                            print(f"  🔍 Condition: Found {field}: {value}")
                            break
                    
                    if value is None:
                        # Use the entire input_data if nothing else matches
                        value = input_data
                        print(f"  🔍 Condition: Using entire input_data: {value}")
            else:
                value = input_data
            
            # Map operator names to actual operators
            operator_map = {
                'equals': '==',
                'not_equals': '!=',
                'greater_than': '>',
                'less_than': '<',
                'greater_than_or_equal': '>=',
                'less_than_or_equal': '<=',
                'contains': 'contains',
                'not_contains': 'not_contains',
                'starts_with': 'starts_with',
                'ends_with': 'ends_with',
                'is_empty': 'is_empty',
                'is_not_empty': 'is_not_empty'
            }
            
            actual_operator = operator_map.get(operator, operator)
            
            # Convert values for comparison
            try:
                # Handle special operators first
                if actual_operator == 'is_empty':
                    result = not value or str(value).strip() == ''
                elif actual_operator == 'is_not_empty':
                    result = value and str(value).strip() != ''
                elif actual_operator == 'not_contains':
                    result = compare_value not in str(value)
                # Handle boolean comparisons
                elif actual_operator in ['==', '!='] and (isinstance(value, bool) or compare_value.lower() in ['true', 'false']):
                    # Convert both to boolean for comparison
                    if isinstance(value, bool):
                        value_bool = value
                    else:
                        value_bool = str(value).lower() == 'true'
                    
                    if isinstance(compare_value, bool):
                        compare_bool = compare_value
                    else:
                        compare_bool = str(compare_value).lower() == 'true'
                    
                    if actual_operator == '==':
                        result = value_bool == compare_bool
                    else:  # !=
                        result = value_bool != compare_bool
                # Try to convert both to numbers for numeric comparison
                elif actual_operator in ['==', '!=', '>', '<', '>=', '<=']:
                    value_num = float(value) if isinstance(value, (int, float, str)) else value
                    compare_num = float(compare_value) if isinstance(compare_value, (int, float, str)) else compare_value
                    
                    # Perform numeric comparison
                    if actual_operator == '==':
                        result = value_num == compare_num
                    elif actual_operator == '!=':
                        result = value_num != compare_num
                    elif actual_operator == '>':
                        result = value_num > compare_num
                    elif actual_operator == '<':
                        result = value_num < compare_num
                    elif actual_operator == '>=':
                        result = value_num >= compare_num
                    elif actual_operator == '<=':
                        result = value_num <= compare_num
                else:
                    # String comparison
                    value_str = str(value)
                    compare_str = str(compare_value)
                    
                    if actual_operator == 'contains':
                        result = compare_str in value_str
                    elif actual_operator == 'starts_with':
                        result = value_str.startswith(compare_str)
                    elif actual_operator == 'ends_with':
                        result = value_str.endswith(compare_str)
                    else:
                        result = value_str == compare_str
                        
            except (ValueError, TypeError):
                # Fallback to string comparison
                value_str = str(value)
                compare_str = str(compare_value)
                
                if actual_operator == 'contains':
                    result = compare_str in value_str
                elif actual_operator == 'starts_with':
                    result = value_str.startswith(compare_str)
                elif actual_operator == 'ends_with':
                    result = value_str.endswith(compare_str)
                elif actual_operator == '==':
                    result = value_str == compare_str
                elif actual_operator == '!=':
                    result = value_str != compare_str
                else:
                    result = False
            
            print(f"  🔍 Condition: {value} {operator} ({actual_operator}) {compare_value} = {result}")
            return {'result': result, 'value': value, 'compare_value': compare_value}
            
        except Exception as e:
            return {'error': str(e)}
