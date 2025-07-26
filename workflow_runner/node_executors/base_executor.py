"""
Base Node Executor for Enhanced Workflow Runner
Contains the base class and registry for node executors
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional


class BaseNodeExecutor(ABC):
    """Abstract base class for node executors"""
    
    def __init__(self, workflow_runner):
        self.workflow_runner = workflow_runner
        self.session = workflow_runner.session
        self.server_url = workflow_runner.server_url
    
    @abstractmethod
    def execute(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute the node and return results"""
        pass
    
    @abstractmethod
    def get_node_types(self) -> list:
        """Return list of node types this executor handles"""
        pass
    
    def replace_template_placeholders(self, text: str) -> str:
        """Replace template placeholders in text (like {{DATE}})"""
        import datetime
        
        if not isinstance(text, str):
            return text
        
        # Replace {{DATE}} with current date in YYYY-MM-DD format
        if '{{DATE}}' in text:
            current_date = datetime.datetime.now().strftime('%Y-%m-%d')
            text = text.replace('{{DATE}}', current_date)
        
        # Replace {{DATETIME}} with current datetime
        if '{{DATETIME}}' in text:
            current_datetime = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            text = text.replace('{{DATETIME}}', current_datetime)
        
        # Replace {{TIMESTAMP}} with unix timestamp
        if '{{TIMESTAMP}}' in text:
            timestamp = str(int(datetime.datetime.now().timestamp()))
            text = text.replace('{{TIMESTAMP}}', timestamp)
        
        return text
    
    def replace_input_data_placeholders(self, text: str, input_data: Any) -> str:
        """Replace input data placeholders in text (like {{data}})"""
        import json
        
        if not isinstance(text, str) or input_data is None:
            return text
        
        # Handle different types of input data
        if isinstance(input_data, dict):
            # Replace specific field placeholders
            for key, value in input_data.items():
                placeholder = f"{{{{{key}}}}}"
                if placeholder in text:
                    replacement = json.dumps(value) if not isinstance(value, str) else str(value)
                    text = text.replace(placeholder, replacement)
            
            # Replace generic {{data}} with the entire input or specific field
            if '{{data}}' in text:
                # Try to use a sensible default field, or the entire object
                if 'data' in input_data:
                    replacement = str(input_data['data'])
                elif 'result' in input_data:
                    replacement = str(input_data['result'])
                elif 'text' in input_data:
                    replacement = str(input_data['text'])
                else:
                    replacement = json.dumps(input_data)
                text = text.replace('{{data}}', replacement)
        else:
            # For non-dict input, replace {{data}} with the string representation
            if '{{data}}' in text:
                text = text.replace('{{data}}', str(input_data))
        
        return text


class NodeExecutorRegistry:
    """Registry for managing node executors"""
    
    def __init__(self, workflow_runner):
        self.workflow_runner = workflow_runner
        self.executors = {}
        self._register_executors()
    
    def _register_executors(self):
        """Register all available executors"""
        from .http_executor import HTTPNodeExecutor
        from .vfs_executor import VFSNodeExecutor
        from .vfs_directory_list_executor import VFSDirectoryListNodeExecutor
        from .for_each_executor import ForEachNodeExecutor
        from .timer_executor import TimerNodeExecutor
        from .text_executor import TextNodeExecutor
        from .unknown_executor import UnknownNodeExecutor
        
        # Import data processors
        from ..data_processors.json_processor import JSONDataProcessor
        from ..data_processors.string_processor import StringDataProcessor
        from ..data_processors.math_processor import MathDataProcessor
        from ..data_processors.array_processor import ArrayDataProcessor
        from ..data_processors.node_reference_processor import NodeReferenceDataProcessor
        from ..data_processors.random_processor import RandomDataProcessor
        
        # Import logic processors
        from ..logic_processors.condition_processor import ConditionProcessor
        from ..logic_processors.logical_gate_processor import LogicalGateProcessor
        from ..logic_processors.llm_processor import LLMProcessor
        
        # Register all executors
        executors = [
            HTTPNodeExecutor(self.workflow_runner),
            VFSNodeExecutor(self.workflow_runner),
            VFSDirectoryListNodeExecutor(self.workflow_runner),
            ForEachNodeExecutor(self.workflow_runner),
            TimerNodeExecutor(self.workflow_runner),
            TextNodeExecutor(self.workflow_runner),
            JSONDataProcessor(self.workflow_runner),
            StringDataProcessor(self.workflow_runner),
            MathDataProcessor(self.workflow_runner),
            ArrayDataProcessor(self.workflow_runner),
            NodeReferenceDataProcessor(self.workflow_runner),
            RandomDataProcessor(self.workflow_runner),
            ConditionProcessor(self.workflow_runner),
            LogicalGateProcessor(self.workflow_runner),
            LLMProcessor(self.workflow_runner),
            UnknownNodeExecutor(self.workflow_runner),  # Fallback
        ]
        
        for executor in executors:
            for node_type in executor.get_node_types():
                self.executors[node_type] = executor
    
    def register_executor(self, executor: BaseNodeExecutor):
        """Register a new executor"""
        for node_type in executor.get_node_types():
            self.executors[node_type] = executor
    
    def execute_node(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute a node using the appropriate executor"""
        from ..utils.data_utils import DataUtils
        
        node_def = self.workflow_runner.load_node_definition(node['type'])
        
        # Check if node should be executed
        if node_def.get('execution_mode') == 'frontend_only':
            print(f"  ⚡ {node['id']} ({node['type']}) is frontend-only, skipping execution in backend")
            return None
            
        if node['id'] in self.workflow_runner.executed_nodes:
            return None
        self.workflow_runner.executed_nodes.add(node['id'])
        
        node_type = node['type']
        print(f"  Executing {node['id']} ({node_type})...")
        
        # Enhanced input data handling - match frontend structure
        processed_input_data = DataUtils.process_input_data_for_node(node, input_data, node_def)
        #print(f"  🔄 Processed input data for {node['id']}: {processed_input_data}")
        
        try:
            # Get executor for this node type
            executor = self.executors.get(node_type)
            if executor:
                result = executor.execute(node, processed_input_data, node_results, parent_node_id)
            else:
                # Use unknown executor as fallback
                result = self.executors['unknown'].execute(node, processed_input_data, node_results, parent_node_id)
                
            if result and 'error' in result:
                print(f"  ✗ {node['id']} failed: {result['error']}")
            else:
                print(f"  ✓ {node['id']} completed successfully")
            return result
        except Exception as e:
            print(f"  ✗ {node['id']} exception: {str(e)}")
            return {'error': str(e)}
