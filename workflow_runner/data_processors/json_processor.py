"""
JSON Data Processor for Enhanced Workflow Runner
Handles JSON extraction and manipulation nodes
"""

import json
import re
from typing import Dict, Any
from ..node_executors.base_executor import BaseNodeExecutor
from ..utils.data_utils import DataUtils


class JSONDataProcessor(BaseNodeExecutor):
    """Processor for JSON data manipulation nodes"""
    
    def get_node_types(self) -> list:
        return ['json_extract']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute JSON extract node - enhanced to match frontend behavior"""
        config = node['config']
        field_path = config['field_path']['value']
        display_format = config['display_format']['value']
        
        print(f"  🔍 JSON Extract: field_path='{field_path}', display_format='{display_format}'")
        print(f"  🔍 JSON Extract: input_data type={type(input_data)}")
        print(f"  🔍 JSON Extract: input_data={input_data}")
        print(f"  🔍 JSON Extract: input_data keys={list(input_data.keys()) if isinstance(input_data, dict) else 'N/A'}")
        
        try:
            # Handle structured input data (like frontend)
            json_data = None
            
            # If input_data is a dict, look for json port first (matching frontend connections)
            if isinstance(input_data, dict):
                if 'json' in input_data:
                    json_data = input_data['json']
                    print(f"  🔍 JSON Extract: Found json port: {json_data}")
                elif 'parsed_json' in input_data:
                    json_data = input_data['parsed_json']
                    print(f"  🔍 JSON Extract: Found parsed_json port: {json_data}")
                elif 'text' in input_data:
                    json_data = input_data['text']
                    print(f"  🔍 JSON Extract: Found text port: {json_data}")
                elif 'data' in input_data:
                    json_data = input_data['data']
                    print(f"  🔍 JSON Extract: Found data port: {json_data}")
                else:
                    # Use the entire input_data
                    json_data = input_data
                    print(f"  🔍 JSON Extract: Using entire input_data: {json_data}")
            else:
                # Direct value input
                json_data = input_data
                print(f"  🔍 JSON Extract: Using direct input: {json_data}")
            
            # Parse JSON if it's a string
            if isinstance(json_data, str):
                try:
                    json_data = json.loads(json_data)
                    print(f"  🔍 JSON Extract: Parsed string to JSON: {json_data}")
                except json.JSONDecodeError:
                    print(f"  🔍 JSON Extract: Failed to parse as JSON: {json_data[:100]}...")
                    # If it's not valid JSON, try to treat it as a file path or other data
                    if json_data.startswith('/'):
                        return {'error': f'JSON path "{json_data}" appears to be a file path, not JSON data'}
                    else:
                        return {'error': f'Invalid JSON data: {json_data[:100]}...'}
            
            # Extract value using enhanced dot notation with array support
            value = DataUtils.extract_nested_value(json_data, field_path)
            
            if value is None:
                return {'error': f'Field path "{field_path}" not found'}
            
            print(f"  🔍 JSON Extract: Extracted value: {value}, type: {type(value)}")
            
            # Format output based on display_format (matching frontend)
            formatted_value = value
            if display_format == 'json':
                formatted_value = json.dumps(value, indent=2)
            elif display_format == 'text':
                # For text format, return the actual value without JSON stringification
                if isinstance(value, str):
                    formatted_value = value  # Keep as-is, don't add quotes
                else:
                    formatted_value = str(value)
            
            print(f"  🔍 JSON Extract: Final formatted value: {formatted_value}")
            return {
                'data': formatted_value,
                'text': formatted_value,
                'json': value,
                'extracted_value': formatted_value,
                'field_path': field_path,
                'original': json_data
            }
            
        except Exception as e:
            print(f"  🔍 JSON Extract: Exception: {e}")
            return {'error': str(e)}
