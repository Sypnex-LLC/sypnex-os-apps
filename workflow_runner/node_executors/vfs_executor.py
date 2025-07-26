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
        append = config['append']['value'] == 'true'
        
        try:
            print(f"  Saving to {file_path} (format: {format_type}, overwrite: {overwrite}, append: {append})")
            
            # Extract data from input_data using workflow-based approach
            actual_data = None
            
            if isinstance(input_data, dict):
                # Handle structured workflow data - extract from specific ports
                if 'data' in input_data:
                    actual_data = input_data['data']
                elif 'input_data' in input_data:
                    # Handle nested workflow structure
                    inner_data = input_data['input_data']
                    if isinstance(inner_data, dict):
                        # Look for common data fields in workflow results
                        for field in ['result', 'data', 'array', 'content', 'output']:
                            if field in inner_data:
                                actual_data = inner_data[field]
                                break
                    else:
                        actual_data = inner_data
                
                # If still no data found, use the whole input_data
                if actual_data is None:
                    actual_data = input_data
            else:
                # Direct data (not wrapped in workflow structure)
                actual_data = input_data
            
            # For JSON format, ensure we don't corrupt array/object structures
            if format_type == 'json' and actual_data is None:
                # Only use the binary extraction as last resort for JSON
                actual_data = DataUtils.extract_actual_data_for_vfs(input_data, node_results, parent_node_id)
            elif format_type != 'json' and actual_data is None:
                # For non-JSON formats, use the binary extraction logic
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
            
            # Handle file existence logic (matching frontend behavior)
            if file_exists:
                if not overwrite and not append:
                    return {'error': f'File exists and neither overwrite nor append is enabled: {file_path}'}
                elif overwrite and not append:
                    print(f"  🔄 File exists, deleting for overwrite...")
                    try:
                        delete_response = self.session.delete(f'{self.server_url}/api/virtual-files/delete{file_path}')
                        if delete_response.status_code != 200:
                            print(f"  ⚠️  Warning: Could not delete existing file: {delete_response.status_code}")
                    except Exception as e:
                        print(f"  ⚠️  Warning: Could not delete existing file: {str(e)}")
                        # Continue anyway - the create/upload might overwrite
                # For append mode, we'll handle file deletion after reading the existing content
            
            # Handle each format explicitly (matching frontend logic)
            if format_type == 'json':
                # JSON format expects objects, arrays, or JSON strings
                content_data = actual_data
                
                # Handle append mode for JSON (matching frontend logic)
                if append and not overwrite and file_exists:
                    try:
                        print(f"  📖 Reading existing JSON file for append...")
                        read_response = self.session.get(f'{self.server_url}/api/virtual-files/read{file_path}')
                        if read_response.status_code == 200:
                            existing_file = read_response.json()
                            existing_content = existing_file.get('content', '')
                            existing_data = json.loads(existing_content) if existing_content else []
                            
                            if isinstance(existing_data, list):
                                # If existing data is array, append to it
                                existing_data.append(content_data)
                                content_data = existing_data
                            else:
                                # If existing data is not array, create new array
                                content_data = [existing_data, content_data]
                            
                            print(f"  📝 Appending to existing JSON array (now {len(content_data)} items)")
                            
                            # Delete existing file so we can create with new content
                            print(f"  🗑️  Deleting existing file to replace with appended content...")
                            delete_response = self.session.delete(f'{self.server_url}/api/virtual-files/delete{file_path}')
                            if delete_response.status_code != 200:
                                print(f"  ⚠️  Warning: Could not delete existing file: {delete_response.status_code}")
                        else:
                            # File doesn't exist or can't be read, create new array
                            content_data = [content_data]
                            print(f"  📝 Creating new JSON array for append")
                    except Exception as e:
                        print(f"  ⚠️  Warning: Could not read existing file for append: {e}")
                        content_data = [content_data]
                
                import os
                content_str = json.dumps(content_data, indent=2) if not isinstance(content_data, str) else content_data
                save_data = {
                    'name': os.path.basename(file_path),
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/',
                    'content': content_str
                }
                save_response = self.session.post(f'{self.server_url}/api/virtual-files/create-file', json=save_data)
                
            elif format_type == 'text':
                # Text format - just convert to string, no interpretation
                content_str = str(actual_data)
                
                # Handle append mode for text (matching frontend logic)
                if append and not overwrite and file_exists:
                    try:
                        print(f"  📖 Reading existing text file for append...")
                        read_response = self.session.get(f'{self.server_url}/api/virtual-files/read{file_path}')
                        if read_response.status_code == 200:
                            existing_file = read_response.json()
                            existing_content = existing_file.get('content', '')
                            content_str = existing_content + '\n' + content_str
                            print(f"  📝 Appending to existing text file")
                            
                            # Delete existing file so we can create with new content
                            print(f"  🗑️  Deleting existing file to replace with appended content...")
                            delete_response = self.session.delete(f'{self.server_url}/api/virtual-files/delete{file_path}')
                            if delete_response.status_code != 200:
                                print(f"  ⚠️  Warning: Could not delete existing file: {delete_response.status_code}")
                        else:
                            print(f"  📝 File doesn't exist, creating new text file")
                    except Exception as e:
                        print(f"  ⚠️  Warning: Could not read existing file for append: {e}")
                
                import os
                save_data = {
                    'name': os.path.basename(file_path),
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/',
                    'content': content_str
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
                # Blob format - extract binary data from workflow-provided structured input
                blob_data = None
                
                # The input_data comes from workflow connections and is properly mapped by execution manager
                # In workflow execution, this will always be a structured dict
                workflow_data = input_data.get('data') if isinstance(input_data, dict) else actual_data
                
                print(f"  🔍 Processing blob format for {node['id']}, input type: {type(workflow_data)}")
                
                if isinstance(workflow_data, dict):
                    # Handle dict from workflow - extract binary data from structured result
                    print(f"  🔍 Workflow data is dict with keys: {list(workflow_data.keys())}")
                    
                    # Check if this is a structured workflow result with 'input_data' field
                    if 'input_data' in workflow_data:
                        inner_data = workflow_data['input_data']
                        print(f"  🔍 Found input_data field, type: {type(inner_data)}")
                        
                        if isinstance(inner_data, bytes):
                            # Direct binary data in input_data
                            import base64
                            blob_data = f"data:application/octet-stream;base64,{base64.b64encode(inner_data).decode('utf-8')}"
                            print(f"  🔄 Extracted binary data from 'input_data' field and converted to blob format")
                        elif isinstance(inner_data, dict):
                            # Check for binary data in specific workflow port fields
                            binary_found = False
                            for field_name in ['data', 'audio_data', 'image_data']:
                                if field_name in inner_data and isinstance(inner_data[field_name], bytes):
                                    import base64
                                    blob_data = f"data:application/octet-stream;base64,{base64.b64encode(inner_data[field_name]).decode('utf-8')}"
                                    print(f"  🔄 Extracted binary data from 'input_data.{field_name}' field and converted to blob format")
                                    binary_found = True
                                    break
                            
                            if not binary_found:
                                return {'error': f'Blob format: input_data contains no binary data in expected ports. Type: {type(inner_data)}, Keys: {list(inner_data.keys())}'}
                        else:
                            return {'error': f'Blob format: input_data contains no binary data. Type: {type(inner_data)}, Keys: {list(inner_data.keys()) if isinstance(inner_data, dict) else "N/A"}'}
                    else:
                        return {'error': f'Blob format: workflow dict contains no binary data in expected structure. Available keys: {list(workflow_data.keys())}'}
                        
                else:
                    # This shouldn't happen in normal workflow execution, but handle it just in case
                    return {'error': f'Blob format: expected workflow dict structure, received: {type(workflow_data).__name__}'}
                
                if blob_data is None:
                    return {'error': f'Blob format: failed to process workflow data into blob format'}
                
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
