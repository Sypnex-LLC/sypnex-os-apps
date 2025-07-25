"""
String Data Processor for Enhanced Workflow Runner
Handles string manipulation and operations
"""

import re
from typing import Dict, Any
from ..node_executors.base_executor import BaseNodeExecutor


class StringDataProcessor(BaseNodeExecutor):
    """Processor for string manipulation nodes"""
    
    def get_node_types(self) -> list:
        return ['string']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute string operations node - enhanced to match frontend behavior"""
        config = node['config']
        operation = config['operation']['value']
        config_text_b = config['text_b']['value']
        separator = config['separator']['value'] if 'separator' in config else ','
        search_text = config['search_text']['value'] if 'search_text' in config else ''
        replace_text = config['replace_text']['value'] if 'replace_text' in config else ''
        start_index = int(config['start_index']['value']) if 'start_index' in config else 0
        end_index = int(config['end_index']['value']) if 'end_index' in config else 0
        repeat_count = int(config['repeat_count']['value']) if 'repeat_count' in config else 1
        case_sensitive = config['case_sensitive']['value'] == 'true' if 'case_sensitive' in config else True
        
        try:
            # Get text inputs - handle structured input data
            text_a = ''
            text_b = config_text_b
            
            if isinstance(input_data, dict):
                if 'text' in input_data:
                    text_a = input_data['text']
                elif 'data' in input_data:
                    text_a = input_data['data']
                
                if 'text_b' in input_data:
                    text_b = input_data['text_b']
            elif input_data is not None:
                text_a = input_data
            
            # Convert to strings
            text_a = str(text_a) if text_a is not None else ''
            text_b = str(text_b) if text_b is not None else ''
            
            print(f"  🔤 String Op: {operation}, textA='{text_a[:50]}...', textB='{text_b[:50]}...'")
            
            result = ''
            
            if operation == 'concatenate':
                result = text_a + text_b
            elif operation == 'split':
                result = text_a.split(separator)
            elif operation == 'replace':
                if case_sensitive:
                    result = text_a.replace(search_text, replace_text)
                else:
                    result = re.sub(re.escape(search_text), replace_text, text_a, flags=re.IGNORECASE)
            elif operation == 'trim':
                result = text_a.strip()
            elif operation == 'uppercase':
                result = text_a.upper()
            elif operation == 'lowercase':
                result = text_a.lower()
            elif operation == 'substring':
                end = end_index if end_index > 0 else len(text_a)
                result = text_a[start_index:end]
            elif operation == 'regex_match':
                flags = 0 if case_sensitive else re.IGNORECASE
                matches = re.findall(search_text, text_a, flags)
                result = matches
            elif operation == 'regex_replace':
                flags = 0 if case_sensitive else re.IGNORECASE
                result = re.sub(search_text, replace_text, text_a, flags=flags)
            elif operation == 'starts_with':
                if case_sensitive:
                    result = text_a.startswith(search_text)
                else:
                    result = text_a.lower().startswith(search_text.lower())
            elif operation == 'ends_with':
                if case_sensitive:
                    result = text_a.endswith(search_text)
                else:
                    result = text_a.lower().endswith(search_text.lower())
            elif operation == 'contains':
                if case_sensitive:
                    result = search_text in text_a
                else:
                    result = search_text.lower() in text_a.lower()
            elif operation == 'repeat':
                result = text_a * min(max(0, repeat_count), 100)
            elif operation == 'last_line':
                lines = text_a.split('\n')
                non_empty_lines = [line for line in lines if line.strip()]
                result = non_empty_lines[-1] if non_empty_lines else ''
            else:
                result = text_a
            
            # Convert result based on type
            result_str = str(result) if not isinstance(result, list) else result
            
            return {
                'result': result_str,
                'data': result,
                'array': result if isinstance(result, list) else None,
                'length': len(str(result)),
                'word_count': len(str(result).strip().split()) if str(result).strip() else 0
            }
            
        except Exception as e:
            print(f"  ✗ String operation error: {e}")
            return {'error': str(e)}
