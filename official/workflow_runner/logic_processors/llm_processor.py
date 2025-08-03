"""
LLM Processor for Enhanced Workflow Runner
Handles LLM chat and AI operations
"""

from typing import Dict, Any
from ..node_executors.base_executor import BaseNodeExecutor


class LLMProcessor(BaseNodeExecutor):
    """Processor for LLM and AI operations"""
    
    def get_node_types(self) -> list:
        return ['llm_chat']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute LLM chat node"""
        config = node['config']
        endpoint = config['endpoint']['value']
        model = config['model']['value']
        temperature = float(config['temperature']['value'])
        max_tokens = int(config['max_tokens']['value'])
        system_prompt = config['system_prompt']['value']
        
        # Get prompt from input or use default
        if input_data:
            if isinstance(input_data, dict) and 'prompt' in input_data:
                prompt = input_data['prompt']
            elif isinstance(input_data, str):
                prompt = input_data
            else:
                prompt = str(input_data)
        else:
            prompt = "Hello, how can you help me?"
        
        try:
            headers = {
                'Content-Type': 'application/json'
            }
            
            messages = []
            if system_prompt:
                messages.append({'role': 'system', 'content': system_prompt})
            messages.append({'role': 'user', 'content': prompt})
            
            data = {
                'model': model,
                'messages': messages,
                'options': {
                    'temperature': temperature,
                    'num_predict': max_tokens
                }
            }
            
            response = self.session.post(
                f'{endpoint}/chat/completions',
                headers=headers,
                json=data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_message = result['choices'][0]['message']['content']
                usage = result.get('usage', {})
                return {
                    'response': ai_message,
                    'tokens_used': usage.get('total_tokens', 0),
                    'model_used': model,
                    'full_response': result
                }
            else:
                return {'error': f'API request failed: {response.status_code} - {response.text}'}
                
        except Exception as e:
            return {'error': str(e)}
