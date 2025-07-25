"""
Text Node Executor for Enhanced Workflow Runner
Handles basic text nodes
"""

from typing import Dict, Any
from .base_executor import BaseNodeExecutor


class TextNodeExecutor(BaseNodeExecutor):
    """Executor for text nodes"""
    
    def get_node_types(self) -> list:
        return ['text']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute text node"""
        config = node['config']
        text_value = config['text_content']['value']
        return {'text': text_value}
