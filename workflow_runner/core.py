#!/usr/bin/env python3
"""
Enhanced Workflow Runner Core Module
Contains the main workflow runner class with basic functionality
"""

import json
import sys
import time
import os
from typing import Dict, Any, List, Set
from concurrent.futures import ThreadPoolExecutor
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Developer Token for API Authentication
# Generated using: python generate_dev_token.py --username dev --days 365 --secret "sypnex-super-secret-key-change-in-production" --quiet
DEV_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRldiIsImNyZWF0ZWRfYXQiOjE3NTM2MjIyNDMuMTM4NDY4NSwiZXhwIjoxNzg1MTU4MjQzLjEzODQ2ODUsImlzcyI6ImRldi1zZXJ2ZXIiLCJpYXQiOjE3NTM2MjIyNDMuMTM4NDY4NSwiZGV2X3Rva2VuIjp0cnVlfQ.4ekmb7E0-imeMh2d1piDEXfw7voJWRhRnr1avTw5G0g"


class EnhancedWorkflowRunner:
    """Enhanced workflow runner with real-time feedback and better data handling"""
    
    def __init__(self, server_url="http://127.0.0.1:5000"):
        self.server_url = server_url
        self.session = self._create_optimized_session()
        self.node_definitions = {}
        self.executed_nodes = set()
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        # Initialize components (lazy loading to avoid circular imports)
        self._execution_manager = None
        self._node_executor_registry = None
        
    @property
    def execution_manager(self):
        if self._execution_manager is None:
            from .execution_manager import WorkflowExecutionManager
            self._execution_manager = WorkflowExecutionManager(self)
        return self._execution_manager
    
    @property
    def node_executor_registry(self):
        if self._node_executor_registry is None:
            from .node_executors import NodeExecutorRegistry
            self._node_executor_registry = NodeExecutorRegistry(self)
        return self._node_executor_registry
        
    def _create_optimized_session(self):
        """Create an optimized requests session with connection pooling and retries"""
        session = requests.Session()
        
        # Add authentication headers for all requests
        session.headers.update({
            'X-Session-Token': DEV_TOKEN,
            'Content-Type': 'application/json'
        })
        
        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=10, pool_maxsize=20)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.session.close()
        self.executor.shutdown(wait=True)
    
    def api_request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        """Make API request with error handling"""
        try:
            response = self.session.request(method, f'{self.server_url}{path}', **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': str(e)}
    
    def load_workflow(self, workflow_path: str) -> Dict[str, Any]:
        """Load workflow from VFS"""
        try:
            print(f"🔍 Loading workflow from: {workflow_path}")
            response = self.session.get(f'{self.server_url}/api/virtual-files/read{workflow_path}')
            print(f"🔍 Response status: {response.status_code}")
            if response.status_code == 200:
                file_data = response.json()
                workflow = json.loads(file_data['content'])
                print(f"🔍 Loaded workflow with {len(workflow.get('nodes', []))} nodes")
                return workflow
            else:
                print(f"🔍 Response text: {response.text}")
                raise Exception(f"Failed to load workflow: {response.status_code}")
        except Exception as e:
            print(f"🔍 Exception: {e}")
            raise Exception(f"Error loading workflow: {e}")
    
    def load_node_definition(self, node_type: str) -> Dict[str, Any]:
        """Load node definition from VFS"""
        if node_type in self.node_definitions:
            return self.node_definitions[node_type]
        
        try:
            node_def_path = f"/nodes/{node_type}.node"
            response = self.session.get(f'{self.server_url}/api/virtual-files/read{node_def_path}')
            
            if response.status_code == 200:
                file_data = response.json()
                node_def = json.loads(file_data['content'])
                self.node_definitions[node_type] = node_def
                return node_def
            else:
                default_def = {
                    "id": node_type,
                    "execution_mode": "both",
                    "inputs": [],
                    "outputs": []
                }
                self.node_definitions[node_type] = default_def
                return default_def
                
        except Exception as e:
            print(f"Warning: Could not load node definition for {node_type}: {e}")
            default_def = {
                "id": node_type,
                "execution_mode": "both",
                "inputs": [],
                "outputs": []
            }
            self.node_definitions[node_type] = default_def
            return default_def
    
    def execute_workflow_parallel(self, workflow: Dict[str, Any]) -> list:
        """Execute workflow with parallel processing and real-time feedback"""
        return self.execution_manager.execute_workflow_parallel(workflow)
    
    def execute_node(self, node: Dict[str, Any], input_data: Any = None, node_results=None, parent_node_id=None) -> Dict[str, Any]:
        """Execute a single node with real-time feedback"""
        return self.node_executor_registry.execute_node(node, input_data, node_results, parent_node_id)
    
    def should_execute_node(self, node: Dict[str, Any]) -> bool:
        """Check if a node should be executed based on execution_mode"""
        node_def = self.load_node_definition(node['type'])
        return node_def.get('execution_mode') != 'frontend_only'
