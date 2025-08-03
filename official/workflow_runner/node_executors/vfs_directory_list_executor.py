"""
VFS Directory List Node Executor for Enhanced Workflow Runner
Handles VFS directory listing operations
"""

import json
from typing import Dict, Any, List
from .base_executor import BaseNodeExecutor
from ..utils.template_utils import TemplateUtils


class VFSDirectoryListNodeExecutor(BaseNodeExecutor):
    """Executor for VFS directory list nodes"""
    
    def get_node_types(self) -> list:
        return ['vfs_directory_list']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute VFS directory list node"""
        try:
            config = node['config']
            
            # Get directory path from config or input
            directory_path = config['directory_path']['value']
            if input_data and isinstance(input_data, dict) and 'directory_path' in input_data:
                directory_path = str(input_data['directory_path'])
            
            # Handle template placeholders
            directory_path = TemplateUtils.replace_template_placeholders(directory_path)
            
            # Get other config options
            filter_extensions = config.get('filter_extensions', {}).get('value', '').strip()
            include_directories = config.get('include_directories', {}).get('value', 'true').lower() == 'true'
            recursive = config.get('recursive', {}).get('value', 'false').lower() == 'true'
            
            print(f"  Listing directory: {directory_path}")
            print(f"  Filter extensions: {filter_extensions if filter_extensions else 'all'}")
            print(f"  Include directories: {include_directories}")
            print(f"  Recursive: {recursive}")
            
            # Make API request to list directory
            response = self.session.get(f'{self.server_url}/api/virtual-files/list', params={'path': directory_path})
            
            if response.status_code != 200:
                error_msg = f'Failed to list directory: {response.status_code}'
                try:
                    error_data = response.json()
                    error_msg += f' - {error_data.get("error", "Unknown error")}'
                except:
                    error_msg += f' - {response.text}'
                return {'error': error_msg}
            
            # Parse response
            dir_data = response.json()
            items = dir_data.get('items', [])
            
            # Process items based on configuration
            all_items = []
            file_paths = []
            file_names = []
            directories = []
            files_only = []
            
            # Parse filter extensions
            extensions_filter = []
            if filter_extensions:
                extensions_filter = [ext.strip().lower() for ext in filter_extensions.split(',')]
            
            def process_items(items_list, current_path=""):
                """Process items recursively if needed"""
                for item in items_list:
                    item_name = item.get('name', '')
                    item_type = item.get('type', 'file')
                    is_directory = item.get('is_directory', item_type == 'directory')
                    item_path = f"{current_path}/{item_name}" if current_path else f"{directory_path.rstrip('/')}/{item_name}"
                    
                    if is_directory:
                        if include_directories:
                            all_items.append({
                                'name': item_name,
                                'path': item_path,
                                'type': 'directory'
                            })
                            directories.append(item_path)
                        
                        # Handle recursive listing
                        if recursive and 'children' in item:
                            process_items(item['children'], item_path)
                        # If recursive is enabled but API doesn't provide children, make additional requests
                        elif recursive:
                            try:
                                sub_response = self.session.get(f'{self.server_url}/api/virtual-files/list', params={'path': item_path})
                                if sub_response.status_code == 200:
                                    sub_data = sub_response.json()
                                    process_items(sub_data.get('items', []), item_path)
                            except Exception as e:
                                print(f"  Warning: Failed to list subdirectory {item_path}: {e}")
                    
                    else:  # file
                        # Apply extension filter if specified
                        if extensions_filter:
                            file_ext = item_name.split('.')[-1].lower() if '.' in item_name else ''
                            if file_ext not in extensions_filter:
                                continue
                        
                        all_items.append({
                            'name': item_name,
                            'path': item_path,
                            'type': 'file'
                        })
                        file_paths.append(item_path)
                        file_names.append(item_name)
                        files_only.append(item_path)
            
            # Process all items
            process_items(items)
            
            result = {
                'file_list': all_items,
                'file_paths': file_paths,
                'file_names': file_names,
                'count': len(file_paths),
                'directories': directories,
                'files_only': files_only
            }
            
            print(f"  ✓ Found {len(file_paths)} files and {len(directories)} directories")
            return result
            
        except Exception as e:
            print(f"  ✗ Exception in VFS directory list: {str(e)}")
            return {'error': str(e)}
