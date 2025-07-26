"""
VFS Node Executor for Enhanced Workflow Runner
Handles VFS load and save nodes
"""

import json
from typing import Dict, Any
from .base_executor import BaseNodeExecutor
from ..utils.template_utils import TemplateUtils
from ..utils.data_utils import DataUtils


class VFSNodeExecutor(BaseNodeExecutor):
    """Executor for VFS nodes"""
    
    def get_node_types(self) -> list:
        return ['vfs_load', 'vfs_save']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute VFS node"""
        if node['type'] == 'vfs_load':
            return self._execute_vfs_load(node)
        elif node['type'] == 'vfs_save':
            return self._execute_vfs_save(node, input_data, node_results, parent_node_id)
        else:
            return {'error': f'Unknown VFS node type: {node["type"]}'}
    
    def _execute_vfs_load(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Execute VFS load node with explicit format selection (matching frontend logic)"""
        config = node['config']
        file_path = config['file_path']['value']
        format_type = config['format']['value']
        
        # Handle template placeholders
        file_path = TemplateUtils.replace_template_placeholders(file_path)
        
        try:
            print(f"  Loading from {file_path} (format: {format_type})")
            
            if format_type == 'json':
                # For JSON format, expect JSON content
                response = self.session.get(f'{self.server_url}/api/virtual-files/read{file_path}')
                if response.status_code == 200:
                    file_data = response.json()
                    content = file_data['content']
                    try:
                        import json
                        parsed_data = json.loads(content)
                        return {
                            'data': parsed_data,
                            'file_path': file_path,
                            'json_data': parsed_data
                        }
                    except json.JSONDecodeError as e:
                        return {'error': f'Failed to parse JSON content: {str(e)}'}
                else:
                    return {'error': f'Failed to load file: {response.status_code}'}
                    
            elif format_type == 'text':
                # For text format, return as string
                response = self.session.get(f'{self.server_url}/api/virtual-files/read{file_path}')
                if response.status_code == 200:
                    file_data = response.json()
                    content = file_data['content']
                    return {
                        'data': content,
                        'file_path': file_path,
                        'json_data': None
                    }
                else:
                    return {'error': f'Failed to load file: {response.status_code}'}
                    
            elif format_type == 'blob':
                # For blob format, read as text (data URLs are stored as text)
                response = self.session.get(f'{self.server_url}/api/virtual-files/read{file_path}')
                if response.status_code == 200:
                    file_data = response.json()
                    content = file_data['content']
                    return {
                        'data': content,
                        'file_path': file_path,
                        'json_data': None
                    }
                else:
                    return {'error': f'Failed to load file: {response.status_code}'}
                    
            elif format_type == 'binary':
                # For binary files, fetch directly from the file URL
                response = self.session.get(f'{self.server_url}/api/virtual-files/download{file_path}')
                if response.status_code == 200:
                    binary_data = response.content
                    return {
                        'data': binary_data,
                        'file_path': file_path,
                        'json_data': None
                    }
                else:
                    return {'error': f'Failed to load binary file: {response.status_code}'}
                    
            else:
                return {'error': f'Unknown format: {format_type}. Supported formats are: json, text, blob, binary'}
                
        except Exception as e:
            print(f"VFS Load error: {str(e)}")
            return {'error': str(e)}
    
    def _execute_vfs_save(self, node: Dict[str, Any], input_data: Any, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute VFS save node with explicit format selection (matching frontend logic)"""
        config = node['config']
        file_path = config['file_path']['value']
        format_type = config['format']['value']
        overwrite = config['overwrite']['value'] == 'true'
        
        try:
            print(f"  Saving to {file_path} (format: {format_type})")
            
            # Extract data from input_data (could be port-based dict)
            actual_data = input_data.get('data') if isinstance(input_data, dict) else input_data
            if actual_data is None:
                actual_data = DataUtils.extract_actual_data_for_vfs(input_data, node_results, parent_node_id)
            
            # Check if file exists using the proper info endpoint
            file_exists = False
            try:
                check_response = self.session.get(f'{self.server_url}/api/virtual-files/info{file_path}')
                file_exists = check_response.status_code == 200
            except Exception as e:
                # If we can't check file existence, assume it doesn't exist
                print(f"  🔍 Could not check file existence (assuming new file): {str(e)}")
                file_exists = False
            
            if file_exists:
                if not overwrite:
                    return {'error': f'File exists and overwrite is false: {file_path}'}
                else:
                    print(f"  🔄 File exists, deleting for overwrite...")
                    try:
                        delete_response = self.session.delete(f'{self.server_url}/api/virtual-files/delete{file_path}')
                        if delete_response.status_code != 200:
                            print(f"  ⚠️  Warning: Could not delete existing file: {delete_response.status_code}")
                    except Exception as e:
                        print(f"  ⚠️  Warning: Could not delete existing file: {str(e)}")
                        # Continue anyway - the create/upload might overwrite
            
            # Handle each format explicitly (matching frontend logic)
            if format_type == 'json':
                # JSON format expects objects, arrays, or JSON strings
                import os
                content_str = json.dumps(actual_data, indent=2) if not isinstance(actual_data, str) else actual_data
                save_data = {
                    'name': os.path.basename(file_path),
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/',
                    'content': content_str
                }
                save_response = self.session.post(f'{self.server_url}/api/virtual-files/create-file', json=save_data)
                
            elif format_type == 'text':
                # Text format requires string data
                if not isinstance(actual_data, str):
                    return {'error': f'Text format requires string data, received: {type(actual_data).__name__}. Use JSON format for objects.'}
                
                import os
                save_data = {
                    'name': os.path.basename(file_path),
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/',
                    'content': actual_data
                }
                save_response = self.session.post(f'{self.server_url}/api/virtual-files/create-file', json=save_data)
                
            elif format_type == 'binary':
                # Binary format requires bytes data for raw binary
                if not isinstance(actual_data, bytes):
                    return {'error': f'Binary format requires bytes data for raw binary, received: {type(actual_data).__name__}. Use blob format for other data types.'}
                
                # Use upload-file endpoint for binary data
                from io import BytesIO
                import os
                file_obj = BytesIO(actual_data)
                
                files = {
                    'file': (os.path.basename(file_path), file_obj, 'application/octet-stream')
                }
                data = {
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/'
                }
                save_response = self.session.post(f'{self.server_url}/api/virtual-files/upload-file', files=files, data=data)
                
            elif format_type == 'blob':
                # Blob format - handle multiple data types intelligently
                blob_data = None
                
                # Check if we got a structured input dict (from workflow execution)
                # First check: if input_data has a 'data' field, check if it contains structured workflow data
                if isinstance(input_data, dict) and 'data' in input_data:
                    data_field = input_data['data']
                    
                    # Check if the data field contains structured workflow execution data
                    if isinstance(data_field, dict) and 'input_data' in data_field:
                        # This is structured workflow execution data - extract the actual node output
                        inner_data = data_field['input_data']
                        print(f"  🔍 Found structured workflow data in 'data' field, processing inner node data")
                        
                        # The inner_data should be the actual node output (like HTTP response dict)
                        if isinstance(inner_data, dict):
                            # Handle HTTP response dict - extract binary data from any binary field
                            binary_data = None
                            
                            # Check all possible binary fields
                            for field_name in ['data', 'binary', 'image_data', 'audio_data', 'blob']:
                                if field_name in inner_data and isinstance(inner_data[field_name], bytes):
                                    binary_data = inner_data[field_name]
                                    print(f"  🔄 Found binary data in workflow input '{field_name}' field for {node['id']}")
                                    break
                                elif field_name == 'blob' and field_name in inner_data and isinstance(inner_data[field_name], str):
                                    blob_data = inner_data[field_name]
                                    print(f"  � Using workflow input blob field as data URL for {node['id']}")
                                    break
                            
                            if binary_data:
                                # Convert bytes to data URL
                                import base64
                                blob_data = f"data:application/octet-stream;base64,{base64.b64encode(binary_data).decode('utf-8')}"
                            elif blob_data is None:
                                return {'error': f'Blob format: could not find binary data in workflow input. Available fields: {list(inner_data.keys())}'}
                        else:
                            return {'error': f'Blob format: workflow input inner_data is not a dict: {type(inner_data)}'}
                
                # Second check: if input_data itself has 'input_data' field (direct structured data)
                elif isinstance(input_data, dict) and 'input_data' in input_data:
                    # This is structured workflow execution data - extract the actual node output
                    inner_data = input_data['input_data']
                    print(f"  🔍 Found structured input, processing inner node data")
                    
                    # The inner_data should be the actual node output (like HTTP response dict)
                    if isinstance(inner_data, dict):
                        # Handle HTTP response dict - extract binary data from 'data' field 
                        if 'data' in inner_data and isinstance(inner_data['data'], bytes):
                            binary_data = inner_data['data']
                            print(f"  🔄 Found binary data in structured input 'data' field for {node['id']}")
                            # Convert bytes to data URL
                            import base64
                            blob_data = f"data:application/octet-stream;base64,{base64.b64encode(binary_data).decode('utf-8')}"
                        # Check other possible binary fields
                        elif 'binary' in inner_data and isinstance(inner_data['binary'], bytes):
                            binary_data = inner_data['binary']
                            print(f"  � Found binary data in structured input 'binary' field for {node['id']}")
                            import base64
                            blob_data = f"data:application/octet-stream;base64,{base64.b64encode(binary_data).decode('utf-8')}"
                        elif 'blob' in inner_data:
                            if isinstance(inner_data['blob'], bytes):
                                binary_data = inner_data['blob']
                                print(f"  � Found binary data in structured input 'blob' field for {node['id']}")
                                import base64
                                blob_data = f"data:application/octet-stream;base64,{base64.b64encode(binary_data).decode('utf-8')}"
                            elif isinstance(inner_data['blob'], str):
                                blob_data = inner_data['blob']
                                print(f"  🔍 Using structured input blob field as data URL for {node['id']}")
                        else:
                            return {'error': f'Blob format: could not find binary data in structured input. Available fields: {list(inner_data.keys())}'}
                    else:
                        return {'error': f'Blob format: structured input inner_data is not a dict: {type(inner_data)}'}
                
                # If we didn't get structured input, process actual_data directly
                elif isinstance(actual_data, str):
                    # Assume it's already a data URL
                    blob_data = actual_data
                    print(f"  🔍 Using string data as blob data URL for {node['id']}")
                elif isinstance(actual_data, bytes):
                    # Convert bytes to data URL (edge case when binary data needs to be saved as blob)
                    import base64
                    blob_data = f"data:application/octet-stream;base64,{base64.b64encode(actual_data).decode('utf-8')}"
                    print(f"  🔄 Auto-converted binary data to blob format for {node['id']}")
                elif isinstance(actual_data, dict):
                    # Handle HTTP response dict - extract binary data from various fields
                    binary_data = None
                    
                    # First priority: 'data' field (this is what image display passes through)
                    if 'data' in actual_data and isinstance(actual_data['data'], bytes):
                        binary_data = actual_data['data']
                        print(f"  🔄 Found binary data in 'data' field (image display passthrough) for {node['id']}")
                    # Second priority: 'binary' field (from HTTP node)
                    elif 'binary' in actual_data and isinstance(actual_data['binary'], bytes):
                        binary_data = actual_data['binary']
                        print(f"  🔄 Found binary data in 'binary' field for {node['id']}")
                    # Third priority: 'blob' field (already processed)
                    elif 'blob' in actual_data:
                        if isinstance(actual_data['blob'], bytes):
                            binary_data = actual_data['blob']
                            print(f"  🔄 Found binary data in 'blob' field for {node['id']}")
                        elif isinstance(actual_data['blob'], str):
                            blob_data = actual_data['blob']
                            print(f"  🔍 Using blob field as data URL for {node['id']}")
                    
                    if binary_data:
                        # Convert bytes to data URL
                        import base64
                        blob_data = f"data:application/octet-stream;base64,{base64.b64encode(binary_data).decode('utf-8')}"
                        print(f"  🔄 Auto-converted binary field to blob format for {node['id']}")
                    elif blob_data is None:
                        return {'error': f'Blob format: could not find binary data in dict. Available fields: {list(actual_data.keys())}'}
                else:
                    return {'error': f'Blob format requires string (data URL), bytes, or dict with binary data, received: {type(actual_data).__name__}'}
                
                if blob_data is None:
                    return {'error': f'Blob format: failed to process data into blob format'}
                
                import os
                save_data = {
                    'name': os.path.basename(file_path),
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/',
                    'content': blob_data
                }
                save_response = self.session.post(f'{self.server_url}/api/virtual-files/create-file', json=save_data)
                
            else:
                return {'error': f'Unknown format: {format_type}. Supported formats are: json, text, binary, blob'}
            
            # Check response
            if save_response.status_code == 200:
                result = save_response.json()
                success = (
                    result.get('success', False) or 
                    'created successfully' in result.get('message', '').lower() or
                    'uploaded successfully' in result.get('message', '').lower()
                )
                if success:
                    print(f"  ✓ Successfully saved {file_path}")
                    return {'success': True, 'file_path': file_path}
                else:
                    error_msg = result.get('error', 'Unknown error')
                    print(f"  ✗ Failed to save {file_path}: {error_msg}")
                    return {'error': f'Failed to save file: {error_msg}'}
            else:
                error_msg = f'API request failed: {save_response.status_code}'
                try:
                    error_data = save_response.json()
                    error_msg += f' - {error_data.get("error", "Unknown error")}'
                except:
                    error_msg += f' - {save_response.text}'
                print(f"  ✗ Failed to save {file_path}: {error_msg}")
                return {'error': error_msg}
                
        except Exception as e:
            print(f"  ✗ Exception saving {file_path}: {str(e)}")
            return {'error': str(e)}
