"""
VFS Node Executor for Enhanced Workflow Runner
Handles VFS load and save nodes
"""

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
        """Execute VFS load node with template placeholder support"""
        config = node['config']
        file_path = config['file_path']['value']
        
        # Handle template placeholders
        file_path = TemplateUtils.replace_template_placeholders(file_path)
        
        try:
            print(f"  Loading from {file_path}")
            response = self.session.get(f'{self.server_url}/api/virtual-files/read{file_path}')
            
            if response.status_code == 200:
                file_data = response.json()
                content = file_data['content']
                
                # Try to parse as JSON first
                try:
                    import json
                    parsed_json = json.loads(content)
                    return {
                        'data': content,
                        'text': content,
                        'json': parsed_json,
                        'parsed_json': parsed_json,
                        'file_path': file_path
                    }
                except json.JSONDecodeError:
                    # Not JSON, return as text
                    return {
                        'data': content,
                        'text': content,
                        'file_path': file_path
                    }
            else:
                return {'error': f'Failed to load file: {response.status_code}'}
                
        except Exception as e:
            return {'error': str(e)}
    
    def _execute_vfs_save(self, node: Dict[str, Any], input_data: Any, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute VFS save node with robust data extraction and enhanced data handling"""
        # EXACT COPY of execute_vfs_save_node from original enhanced_workflow_runner.py
        config = node['config']
        file_path = config['file_path']['value']
        format_type = config['format']['value']
        overwrite = config['overwrite']['value'] == 'true'
        
        try:
            print(f"  Saving to {file_path} (format: {format_type})")
            print(f"  🔍 DEBUG: input_data type: {type(input_data)}")
            print(f"  🔍 DEBUG: input_data: {input_data}")
            
            # Robustly extract actual data
            actual_data = DataUtils.extract_actual_data_for_vfs(input_data, node_results, parent_node_id)
            print(f"  🔍 DEBUG: actual_data type: {type(actual_data)}")
            print(f"  🔍 DEBUG: actual_data: {actual_data}")
            
            # Normalize data for storage
            content, detected_format = DataUtils.normalize_data_for_vfs(actual_data, format_type)
            
            # Check if file exists and handle overwrite
            check_response = self.session.get(f'{self.server_url}/api/virtual-files/read{file_path}')
            file_exists = check_response.status_code == 200
            
            if file_exists:
                if not overwrite:
                    return {'error': f'File exists and overwrite is false: {file_path}'}
                else:
                    print(f"  🔄 File exists, deleting for overwrite...")
                    # Delete existing file first
                    delete_response = self.session.delete(f'{self.server_url}/api/virtual-files/delete{file_path}')
                    if delete_response.status_code != 200:
                        print(f"  ⚠️  Warning: Could not delete existing file: {delete_response.status_code}")
            
            # Save file based on format
            if detected_format == "binary" or format_type == "binary":
                # Use upload-file endpoint for binary data
                from io import BytesIO
                import os
                file_obj = BytesIO(content)
                
                files = {
                    'file': (os.path.basename(file_path), file_obj, 'application/octet-stream')
                }
                data = {
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/'
                }
                
                save_response = self.session.post(
                    f'{self.server_url}/api/virtual-files/upload-file', 
                    files=files, 
                    data=data
                )
            else:
                # Use create-file endpoint for text/JSON data
                import os
                content_str = content.decode('utf-8') if isinstance(content, bytes) else str(content)
                save_data = {
                    'name': os.path.basename(file_path),
                    'parent_path': os.path.dirname(file_path) if os.path.dirname(file_path) != '' else '/',
                    'content': content_str
                }
                
                save_response = self.session.post(
                    f'{self.server_url}/api/virtual-files/create-file', 
                    json=save_data
                )
            
            if save_response.status_code == 200:
                result = save_response.json()
                # Check for success in different response formats
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
