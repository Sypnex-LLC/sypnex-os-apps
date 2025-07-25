"""
Data Utilities for Enhanced Workflow Runner
Contains data manipulation and formatting utilities
"""

import json
import base64
import datetime
import re
from typing import Any, Dict, List, Tuple


class DataUtils:
    """Utility class for data manipulation and formatting"""
    
    @staticmethod
    def normalize_data_for_vfs(data: Any, format_type: str = "auto") -> Tuple[bytes, str]:
        """Normalize data for VFS storage with proper format detection"""
        print(f"    🔍 DEBUG normalize_data_for_vfs: input type={type(data)}, format_type={format_type}")
        print(f"    🔍 DEBUG normalize_data_for_vfs: input data={data}")
        
        if format_type == "auto":
            # Auto-detect format
            if isinstance(data, dict):
                format_type = "json"
            elif isinstance(data, str):
                # Check if it's JSON
                try:
                    json.loads(data)
                    format_type = "json"
                except:
                    format_type = "text"
            elif isinstance(data, bytes):
                format_type = "binary"
            else:
                format_type = "text"
            
            print(f"    🔍 DEBUG normalize_data_for_vfs: auto-detected format={format_type}")
        
        # Convert to appropriate format
        if format_type == "json":
            if isinstance(data, dict):
                content = json.dumps(data, indent=2).encode('utf-8')
            elif isinstance(data, str):
                content = data.encode('utf-8')
            else:
                content = json.dumps(str(data)).encode('utf-8')
        elif format_type == "binary":
            if isinstance(data, bytes):
                content = data
            elif isinstance(data, str):
                # Try to decode base64 if it looks like base64
                if len(data) > 100 and all(c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=' for c in data):
                    try:
                        content = base64.b64decode(data)
                    except:
                        content = data.encode('utf-8')
                else:
                    content = data.encode('utf-8')
            else:
                content = str(data).encode('utf-8')
        else:  # text
            if isinstance(data, str):
                content = data.encode('utf-8')
            else:
                content = str(data).encode('utf-8')
        
        print(f"    🔍 DEBUG normalize_data_for_vfs: output type={type(content)}, length={len(content)}")
        print(f"    🔍 DEBUG normalize_data_for_vfs: output preview={content[:50] if content else 'None'}")
        
        return content, format_type
    
    @staticmethod
    def extract_nested_value(obj: Any, path: str) -> Any:
        """Extract nested value using dot notation with array support (matching frontend)"""
        if obj is None:
            return None
        
        keys = path.split('.')
        current = obj
        
        for key in keys:
            if current is None:
                return None
            
            # Handle array access like "items[0].name"
            array_match = re.match(r'^(.+)\[(\d+)\]$', key)
            if array_match:
                array_key = array_match.group(1)
                array_index = int(array_match.group(2))
                
                if isinstance(current, dict) and array_key in current:
                    if isinstance(current[array_key], list) and 0 <= array_index < len(current[array_key]):
                        current = current[array_key][array_index]
                    else:
                        return None
                else:
                    return None
            else:
                # Regular key access
                if isinstance(current, dict) and key in current:
                    current = current[key]
                else:
                    return None
        
        return current
    
    @staticmethod
    def extract_actual_data_for_vfs(input_data, node_results=None, parent_node_id=None):
        """Robustly extract binary or text data for VFS save, even if input is None or a dict with None values."""
        print(f"  🔍 [VFS EXTRACT] input_data type: {type(input_data)}")
        print(f"  🔍 [VFS EXTRACT] input_data: {input_data}")
        
        def recursive_search_for_binary_data(data, depth=0):
            if depth > 3:  # Prevent infinite recursion
                return None
            
            if isinstance(data, bytes):
                return data
            elif isinstance(data, str) and len(data) > 0:
                return data
            elif isinstance(data, dict):
                # Look for common binary/data field names
                for field in ['data', 'content', 'image_data', 'file_data', 'binary_data', 'text']:
                    if field in data and data[field] is not None:
                        result = recursive_search_for_binary_data(data[field], depth + 1)
                        if result is not None:
                            return result
                # If no specific fields found, try all values
                for value in data.values():
                    if value is not None:
                        result = recursive_search_for_binary_data(value, depth + 1)
                        if result is not None:
                            return result
            elif isinstance(data, list) and len(data) > 0:
                # Take the first non-None item
                for item in data:
                    if item is not None:
                        result = recursive_search_for_binary_data(item, depth + 1)
                        if result is not None:
                            return result
            
            return None
        
        # If input_data is a dict with only None values, try to look up parent node output
        if isinstance(input_data, dict):
            actual_data = recursive_search_for_binary_data(input_data)
            if actual_data is not None:
                return actual_data
            
            # If still None, try parent node output
            if parent_node_id and node_results and parent_node_id in node_results:
                parent_result = node_results[parent_node_id]
                print(f"  🔍 [VFS EXTRACT] Trying parent node {parent_node_id} result: {parent_result}")
                actual_data = recursive_search_for_binary_data(parent_result)
                if actual_data is not None:
                    return actual_data
            
            return input_data  # Return the dict as-is if nothing else works
        else:
            actual_data = recursive_search_for_binary_data(input_data)
            return actual_data if actual_data is not None else input_data
    
    @staticmethod 
    def process_input_data_for_node(node: Dict[str, Any], input_data: Any, node_def: Dict[str, Any]) -> Any:
        """Process input data to match frontend's structured approach"""
        if input_data is None:
            return None
        
        print(f"  🔄 Processing input data for {node['id']}: type={type(input_data)}")
        if isinstance(input_data, dict):
            print(f"  🔄 Input data keys: {list(input_data.keys())}")
        
        # If input_data is already a dict with port names, use it directly
        if isinstance(input_data, dict):
            # Check if it looks like port-based data (has keys that match input ports)
            input_ports = [inp['id'] for inp in node_def.get('inputs', [])]
            if any(port in input_data for port in input_ports):
                print(f"  🔄 Input data appears to be port-based: {list(input_data.keys())}")
                return input_data
        
        # If it's a dict, try to map it to the appropriate input port
        # This matches frontend's intelligent field mapping
        if isinstance(input_data, dict):
            # Look for common field names that might match input ports
            input_ports = [inp['id'] for inp in node_def.get('inputs', [])]
            mapped_data = {}
            
            for port in input_ports:
                # Try to find a matching field in input_data
                if port in input_data:
                    mapped_data[port] = input_data[port]
                else:
                    # Map common field names to ports
                    field_mappings = {
                        'text': ['text', 'content', 'data', 'result', 'response'],
                        'data': ['data', 'content', 'result', 'text', 'value'],
                        'json': ['json', 'parsed_json', 'data', 'result'],
                        'value': ['value', 'data', 'result', 'content', 'text'],
                        'url': ['url', 'uri', 'link', 'address', 'path'],
                        'condition': ['result', 'data', 'content', 'text', 'value'],
                        'image_data': ['data', 'image_data', 'image', 'url', 'file_path'],
                        'audio_data': ['data', 'audio_data', 'audio', 'url', 'file_path'],
                        'prompt': ['text', 'prompt', 'data', 'content', 'value'],
                        'trigger': ['trigger', 'data', 'value']
                    }
                    
                    possible_fields = field_mappings.get(port, [port])
                    for field in possible_fields:
                        if field in input_data:
                            mapped_data[port] = input_data[field]
                            print(f"  🔄 Mapped '{field}' to '{port}' for {node['id']}")
                            break
                    
                    # If no mapping found, use the first available value
                    if port not in mapped_data and input_data:
                        first_value = next(iter(input_data.values()))
                        mapped_data[port] = first_value
                        print(f"  🔄 Using first available value for '{port}' in {node['id']}: {first_value}")
            
            if mapped_data:
                print(f"  🔄 Final mapped data for {node['id']}: {mapped_data}")
                return mapped_data
        
        # Fallback: return input_data as-is
        return input_data
