"""
Execution Utilities for Enhanced Workflow Runner
Contains workflow execution and graph building utilities
"""

from typing import Dict, Any, List, Set


class ExecutionUtils:
    """Utility class for workflow execution and graph operations"""
    
    @staticmethod
    def find_ready_nodes(dependencies: Dict[str, List[str]], executed: Set[str]) -> List[str]:
        """Find nodes ready for execution"""
        ready = []
        for node_id, deps in dependencies.items():
            if node_id not in executed and all(dep in executed for dep in deps):
                ready.append(node_id)
        return ready
    
    @staticmethod
    def build_execution_graph(workflow: Dict[str, Any], load_node_definition_func):
        """Build dependency graph for parallel execution, skipping frontend-only nodes and repeater nodes"""
        nodes = {node['id']: node for node in workflow.get('nodes', [])}
        connections = workflow.get('connections', [])
        
        # Identify frontend-only nodes and repeater nodes
        frontend_only_nodes = set()
        repeater_nodes = set()
        for node in nodes.values():
            node_def = load_node_definition_func(node['type'])
            if node_def.get('execution_mode') == 'frontend_only':
                frontend_only_nodes.add(node['id'])
            if node['type'] == 'repeater':
                repeater_nodes.add(node['id'])
        
        print(f"🔍 DEBUG: frontend_only_nodes = {frontend_only_nodes}")
        print(f"🔍 DEBUG: repeater_nodes = {repeater_nodes}")
        
        # Helper: recursively find the last backend node upstream
        def find_last_backend_node(node_id):
            if node_id not in frontend_only_nodes and node_id not in repeater_nodes:
                return node_id
            # Find all connections going into this node
            for conn in connections:
                if conn['to']['nodeId'] == node_id:
                    upstream = conn['from']['nodeId']
                    return find_last_backend_node(upstream)
            return None
        
        # Build dependencies and dependents, skipping frontend-only nodes and repeater nodes
        excluded_nodes = frontend_only_nodes | repeater_nodes
        dependencies = {node_id: [] for node_id in nodes if node_id not in excluded_nodes}
        dependents = {node_id: [] for node_id in nodes if node_id not in excluded_nodes}
        
        print(f"🔍 DEBUG: excluded_nodes = {excluded_nodes}")
        print(f"🔍 DEBUG: dependencies keys = {list(dependencies.keys())}")
        
        for conn in connections:
            from_node = conn['from']['nodeId']
            to_node = conn['to']['nodeId']
            # Only add edges if both nodes are not excluded
            if to_node in excluded_nodes:
                print(f"🔍 DEBUG: Skipping connection to excluded node {to_node}")
                continue
            # Rewire: if from_node is excluded, walk back to last non-excluded node
            actual_from = find_last_backend_node(from_node)
            if actual_from and actual_from != to_node and actual_from not in excluded_nodes:
                dependencies[to_node].append(actual_from)
                dependents[actual_from].append(to_node)
                print(f"🔍 DEBUG: Added dependency {actual_from} -> {to_node}")
        
        return dependencies, dependents, frontend_only_nodes, repeater_nodes
