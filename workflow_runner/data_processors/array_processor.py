"""
Array Data Processor for Enhanced Workflow Runner
Handles array operations and manipulations
"""

import json
from typing import Dict, Any
from ..node_executors.base_executor import BaseNodeExecutor
from ..utils.data_utils import DataUtils


class ArrayDataProcessor(BaseNodeExecutor):
    """Processor for array operations"""
    
    def get_node_types(self) -> list:
        return ['array']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute array operations node - enhanced to match frontend behavior"""
        config = node['config']
        operation = config['operation']['value']
        field_path = config['field_path']['value'] if 'field_path' in config else ''
        filter_value = config['filter_value']['value'] if 'filter_value' in config else ''
        filter_operator = config['filter_operator']['value'] if 'filter_operator' in config else 'equals'
        join_separator = config['join_separator']['value'] if 'join_separator' in config else ', '
        slice_start = int(config['slice_start']['value']) if 'slice_start' in config else 0
        slice_end = int(config['slice_end']['value']) if 'slice_end' in config else 0
        
        try:
            # Get array from input
            array = None
            
            if isinstance(input_data, dict):
                if 'array' in input_data:
                    array = input_data['array']
                elif 'data' in input_data:
                    array = input_data['data']
            elif input_data is not None:
                array = input_data
            
            # Parse if it's a string
            if isinstance(array, str):
                try:
                    array = json.loads(array)
                except json.JSONDecodeError:
                    return {'error': 'Invalid array data'}
            
            if not isinstance(array, list):
                return {'error': 'Input is not an array'}
            
            print(f"  🗂️ Array Op: {operation}, length={len(array)}")
            
            result = None
            
            if operation == 'map':
                if field_path:
                    result = [DataUtils.extract_nested_value(item, field_path) for item in array]
                else:
                    result = array.copy()
            elif operation == 'filter':
                result = [item for item in array if self._perform_filter_operation(
                    DataUtils.extract_nested_value(item, field_path) if field_path else item,
                    filter_value, filter_operator
                )]
            elif operation == 'length':
                result = len(array)
            elif operation == 'join':
                if field_path:
                    items = [str(DataUtils.extract_nested_value(item, field_path)) for item in array]
                else:
                    items = [json.dumps(item) if isinstance(item, dict) else str(item) for item in array]
                result = join_separator.join(items)
            elif operation == 'first':
                result = array[0] if array else None
            elif operation == 'last':
                result = array[-1] if array else None
            elif operation == 'slice':
                end = slice_end if slice_end > 0 else len(array)
                result = array[slice_start:end]
            elif operation == 'reverse':
                result = list(reversed(array))
            elif operation == 'sort':
                if field_path:
                    result = sorted(array, key=lambda x: DataUtils.extract_nested_value(x, field_path) or '')
                else:
                    result = sorted(array)
            elif operation == 'unique':
                if field_path:
                    seen = set()
                    result = []
                    for item in array:
                        value = DataUtils.extract_nested_value(item, field_path)
                        if value not in seen:
                            seen.add(value)
                            result.append(item)
                else:
                    result = list(dict.fromkeys(array))  # Preserve order
            else:
                result = array
            
            return {
                'result': result,
                'data': result,
                'text': json.dumps(result) if isinstance(result, list) else str(result),
                'length': len(result) if isinstance(result, list) else len(array),
                'first': array[0] if array else None,
                'last': array[-1] if array else None
            }
            
        except Exception as e:
            print(f"  ✗ Array operation error: {e}")
            return {'error': str(e)}
    
    def _perform_filter_operation(self, value: Any, filter_value: str, operator: str) -> bool:
        """Helper function for array filtering"""
        try:
            value_str = str(value).lower()
            filter_str = str(filter_value).lower()
            
            if operator == 'equals':
                return str(value) == filter_value
            elif operator == 'not_equals':
                return str(value) != filter_value
            elif operator == 'contains':
                return filter_str in value_str
            elif operator == 'greater_than':
                return float(value) > float(filter_value)
            elif operator == 'less_than':
                return float(value) < float(filter_value)
            elif operator == 'starts_with':
                return value_str.startswith(filter_str)
            elif operator == 'ends_with':
                return value_str.endswith(filter_str)
            else:
                return True
        except:
            return False
