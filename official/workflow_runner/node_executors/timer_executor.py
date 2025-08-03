"""
Timer Node Executor for Enhanced Workflow Runner
Handles timer and repeater nodes
"""

import time
from typing import Dict, Any
from .base_executor import BaseNodeExecutor


class TimerNodeExecutor(BaseNodeExecutor):
    """Executor for timer and repeater nodes"""
    
    def get_node_types(self) -> list:
        return ['timer', 'repeater']
    
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute timer or repeater node"""
        if node['type'] == 'timer':
            return self._execute_timer(node)
        elif node['type'] == 'repeater':
            return self._execute_repeater(node)
        else:
            return {'error': f'Unknown timer node type: {node["type"]}'}
    
    def _execute_timer(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Execute timer node"""
        config = node['config']
        interval = int(config['interval']['value'])
        
        print(f"  ⏰ Timer: waiting {interval}ms")
        time.sleep(interval / 1000.0)  # Convert to seconds
        
        return {'trigger': time.time()}
    
    def _execute_repeater(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """Execute repeater node - triggers workflow repetition"""
        config = node['config']
        interval = int(config['interval']['value'])
        count = int(config['count']['value'])
        
        # For now, just return trigger data - the looping logic is handled in execute_workflow_with_repeater
        return {
            'trigger': time.time(),
            'interval': interval,
            'count': count,
            'iteration': 1
        }
