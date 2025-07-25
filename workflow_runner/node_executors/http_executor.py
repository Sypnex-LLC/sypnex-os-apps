"""
HTTP Node Executor for Enhanced Workflow Runner
Handles HTTP request nodes
"""

import json
from typing import Dict, Any
from .base_executor import BaseNodeExecutor


class HTTPNodeExecutor(BaseNodeExecutor):
    """Executor for HTTP nodes"""
    
    def get_node_types(self) -> list:
        return ['http']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute HTTP node using the /api/proxy/http endpoint for CORS and network consistency"""
        # EXACT COPY of execute_http_node from original enhanced_workflow_runner.py
        config = node['config']
        url = config['url']['value']
        method = config['method']['value']
        headers_str = config['headers']['value']
        body_str = config['body']['value']
        
        try:
            # Parse headers
            headers = {}
            if headers_str.strip():
                try:
                    headers = json.loads(headers_str)
                except json.JSONDecodeError:
                    print(f"Warning: Invalid headers JSON for {node['id']}")
            
            # Parse and process body with template replacements and input data
            body = None
            if body_str.strip():
                # Replace input data placeholders first
                processed_body_str = self.replace_input_data_placeholders(body_str, input_data)
                # Then handle template placeholders
                processed_body_str = self.replace_template_placeholders(processed_body_str)
                
                try:
                    body = json.loads(processed_body_str)
                except json.JSONDecodeError:
                    body = processed_body_str
            
            # Use the /api/proxy/http endpoint
            proxy_payload = {
                'url': url,
                'method': method,
                'headers': headers,
                'body': body,
                'timeout': 30
            }
            print(f"  🌐 [PROXY] Requesting {url} via /api/proxy/http")
            response = self.session.post(f'{self.server_url}/api/proxy/http', json=proxy_payload)
            
            # Handle response
            if response.status_code == 200:
                proxy_result = response.json()
                is_binary = proxy_result.get('is_binary', False)
                content_type = proxy_result.get('headers', {}).get('content-type', 'unknown')
                print(f"  🌐 [PROXY] Response content-type: {content_type}, is_binary: {is_binary}")
                
                if is_binary:
                    import base64
                    binary_data = base64.b64decode(proxy_result.get('content', ''))
                    print(f"  📦 [PROXY] Received binary data: {len(binary_data)} bytes, type: {content_type}")
                    # Decide output port based on content-type
                    if 'image' in content_type:
                        return {
                            'image_data': binary_data,
                            'data': binary_data,
                            'binary_data': binary_data,
                            'content_type': content_type
                        }
                    elif 'audio' in content_type:
                        return {
                            'audio_data': binary_data,
                            'data': binary_data,
                            'binary_data': binary_data,
                            'content_type': content_type
                        }
                    else:
                        return {
                            'data': binary_data,
                            'binary_data': binary_data,
                            'content_type': content_type
                        }
                else:
                    # For text responses, content is already text
                    text_content = proxy_result.get('content', '')
                    print(f"  🌐 [PROXY] Text content: {text_content[:200]}...")
                    parsed_json = None
                    
                    # Try to parse as JSON regardless of content-type
                    try:
                        parsed_json = json.loads(text_content)
                        print(f"  🌐 [PROXY] Successfully parsed JSON: {parsed_json}")
                    except json.JSONDecodeError:
                        print(f"  🌐 [PROXY] Failed to parse as JSON: {text_content[:100]}...")
                        # Only try content-type based parsing if direct parsing failed
                        if 'json' in content_type.lower():
                            try:
                                parsed_json = json.loads(text_content)
                                print(f"  🌐 [PROXY] Parsed JSON via content-type: {parsed_json}")
                            except json.JSONDecodeError:
                                pass
                    
                    return {
                        'response': text_content,
                        'data': text_content,
                        'parsed_json': parsed_json,
                        'json': parsed_json,  # Add json output to match frontend expectations
                        'content_type': content_type
                    }
            else:
                return {
                    'response': response.text,
                    'status_code': response.status_code,
                    'headers': {},
                    'parsed_json': None,
                    'error': f'HTTP {response.status_code}'
                }
        except Exception as e:
            return {'error': str(e)}
