"""
Workflow Execution Manager for Enhanced Workflow Runner
Handles workflow execution strategies and coordination
"""

import time
from typing import Dict, Any, List
from concurrent.futures import as_completed

from .utils.execution_utils import ExecutionUtils


class WorkflowExecutionManager:
    """Manages different workflow execution strategies"""
    
    def __init__(self, workflow_runner):
        self.workflow_runner = workflow_runner
        self.execution_utils = ExecutionUtils()
    
    def execute_workflow_parallel(self, workflow: Dict[str, Any]) -> list:
        """Execute workflow with parallel processing and real-time feedback, skipping frontend-only nodes"""
        start_time = time.time()
        
        print(f"🚀 Starting workflow execution...")
        print(f"📊 Total nodes: {len(workflow.get('nodes', []))}")
        print(f"🔗 Total connections: {len(workflow.get('connections', []))}")
        print()
        
        # Check if workflow has a repeater start node
        repeater_nodes = [n for n in workflow.get('nodes', []) if n['type'] == 'repeater']
        
        if repeater_nodes:
            # Execute in loop mode
            results = self.execute_workflow_loop(workflow, repeater_nodes[0])
        else:
            # Execute once (current behavior)
            results = self.execute_workflow_once(workflow)
        
        execution_time = time.time() - start_time
        print()
        print(f"✅ Workflow execution completed in {execution_time:.2f} seconds")
        print(f"📈 Executed {len(results)} nodes")
        return results
    
    def execute_workflow_loop(self, workflow: Dict[str, Any], repeater_node: Dict[str, Any]) -> list:
        """Execute workflow in a loop based on repeater configuration - SIMPLEST APPROACH"""
        config = repeater_node['config']
        interval = int(config['interval']['value']) / 1000.0  # Convert to seconds
        max_count = int(config['count']['value'])  # 0 = infinite
        
        print(f"🔄 Repeater mode: interval={interval}s, max_count={max_count if max_count > 0 else 'infinite'}")
        print()
        
        # SIMPLEST APPROACH: Just execute all non-repeater nodes in sequence
        execution_nodes = [n for n in workflow['nodes'] if n['type'] != 'repeater']
        print(f"🎯 Repeater will execute these nodes: {[n['id'] for n in execution_nodes]}")
        
        count = 0
        all_results = []
        
        while max_count == 0 or count < max_count:
            count += 1
            print(f"🔄 Repeater iteration {count}")
            print("=" * 50)
            
            # Clear executed nodes to allow re-execution in each iteration
            self.workflow_runner.executed_nodes.clear()
            
            # Execute all nodes in sequence (simple approach)
            results = self.execute_nodes_simple(execution_nodes, workflow)
            all_results.extend(results)
            
            # Wait for next iteration (unless it's the last one)
            if max_count == 0 or count < max_count:
                print(f"⏰ Waiting {interval}s before next iteration...")
                time.sleep(interval)
                print()
        
        print(f"✅ Repeater completed {count} iterations")
        return all_results
    
    def execute_nodes_simple(self, nodes: List[Dict[str, Any]], workflow: Dict[str, Any] = None) -> list:
        """Execute nodes with proper input synchronization (matching frontend logic)"""
        results = []
        node_results = {}
        node_input_buffer = {}  # Track inputs for multi-input nodes (like frontend)
        
        # Build a queue of nodes to execute, starting with nodes that have no inputs
        remaining_nodes = nodes.copy()
        executed_nodes = set()
        
        while remaining_nodes:
            # Find nodes that are ready to execute
            ready_nodes = []
            
            for node in remaining_nodes:
                if workflow:
                    connections = workflow.get('connections', [])
                    incoming_connections = [conn for conn in connections if conn['to']['nodeId'] == node['id']]
                    
                    if not incoming_connections:
                        # No input connections - ready to execute
                        ready_nodes.append(node)
                    else:
                        # Check if all required inputs are available
                        connected_ports = set(conn['to']['portName'] for conn in incoming_connections)
                        available_inputs = set()
                        
                        for conn in incoming_connections:
                            from_node_id = conn['from']['nodeId']
                            if from_node_id in executed_nodes:
                                available_inputs.add(conn['to']['portName'])
                        
                        # Node is ready if all connected input ports have data available
                        if connected_ports.issubset(available_inputs):
                            ready_nodes.append(node)
                else:
                    # No workflow connections - execute all nodes
                    ready_nodes.append(node)
            
            if not ready_nodes:
                # No nodes ready - check for cycles or missing dependencies
                remaining_ids = [n['id'] for n in remaining_nodes]
                print(f"⚠️ No nodes ready to execute. Remaining: {remaining_ids}")
                break
            
            # Execute ready nodes
            for node in ready_nodes:
                print(f"  Executing {node['id']} ({node['type']})...")
                try:
                    input_data = self._collect_synchronized_inputs(node, workflow, node_results)
                    
                    result = self.workflow_runner.execute_node(node, input_data, node_results, None)
                    if result:
                        results.append({'node_id': node['id'], 'result': result})
                        node_results[node['id']] = result
                        executed_nodes.add(node['id'])
                        print(f"  ✓ {node['id']} completed successfully")
                        
                        # Check for stop execution flag
                        if isinstance(result, dict) and result.get('__stop_execution'):
                            print(f"  🛑 Execution stopped by {node['id']}")
                            return results
                    else:
                        executed_nodes.add(node['id'])  # Mark as executed even if skipped
                        print(f"  ⚡ {node['id']} skipped (frontend-only)")
                        
                except Exception as e:
                    print(f"  ✗ {node['id']} failed: {str(e)}")
                    results.append({'node_id': node['id'], 'result': {'error': str(e)}})
                    executed_nodes.add(node['id'])  # Mark as executed to avoid infinite loop
                
                # Remove from remaining nodes
                remaining_nodes.remove(node)
        
        return results
    
    def _collect_synchronized_inputs(self, node: Dict[str, Any], workflow: Dict[str, Any], node_results: Dict[str, Any]) -> Dict[str, Any]:
        """Collect synchronized inputs for a node (matching frontend executeNodeSmart logic)"""
        if not workflow:
            return None
            
        connections = workflow.get('connections', [])
        incoming_connections = [conn for conn in connections if conn['to']['nodeId'] == node['id']]
        
        if not incoming_connections:
            return None
        
        # Collect inputs for each connected port (like frontend)
        connected_ports = set(conn['to']['portName'] for conn in incoming_connections)
        received_inputs = {}
        
        print(f"  🔍 Node {node['id']} expects inputs on ports: {list(connected_ports)}")
        
        # Collect all available inputs
        for conn in incoming_connections:
            from_node_id = conn['from']['nodeId']
            from_port = conn['from']['portName']
            to_port = conn['to']['portName']
            
            if from_node_id in node_results:
                from_result = node_results[from_node_id]
                # Extract the specific output port value
                if from_port in from_result:
                    received_inputs[to_port] = from_result[from_port]
                    print(f"    ✓ Got input for port '{to_port}' from {from_node_id}[{from_port}]")
                else:
                    # Fallback to common output mappings
                    fallback_mappings = {
                        'data': ['data', 'result', 'output', 'value'],
                        'text': ['text', 'result', 'data', 'content'],
                        'trigger': ['trigger', 'elapsed', 'data'],
                        'json': ['json', 'parsed_json', 'result', 'data'],
                        'value': ['value', 'result', 'data'],
                        'extracted_value': ['extracted_value', 'result', 'data']
                    }
                    
                    found = False
                    possible_fields = fallback_mappings.get(from_port, [from_port, 'data', 'result'])
                    
                    for field in possible_fields:
                        if field in from_result:
                            received_inputs[to_port] = from_result[field]
                            print(f"    ✓ Mapped {from_node_id}[{field}] to port '{to_port}'")
                            found = True
                            break
                    
                    if not found:
                        # Use the entire result as fallback
                        received_inputs[to_port] = from_result
                        print(f"    ⚠️ Used entire result from {from_node_id} for port '{to_port}'")
        
        # Verify we have ALL required inputs (strict synchronization like frontend)
        missing_ports = connected_ports - received_inputs.keys()
        if missing_ports:
            raise Exception(f"Node {node['id']} missing required inputs on ports: {list(missing_ports)}")
        
        print(f"  🔍 Final synchronized input data for {node['id']}: {received_inputs}")
        return received_inputs
    
    def execute_workflow_once(self, workflow: Dict[str, Any]) -> list:
        """Execute workflow once with proper input synchronization (matching frontend logic)"""
        # Build execution graph, skipping frontend-only nodes
        dependencies, dependents, frontend_only_nodes, repeater_nodes = ExecutionUtils.build_execution_graph(
            workflow, self.workflow_runner.load_node_definition
        )
        nodes = {node['id']: node for node in workflow.get('nodes', [])}
        connections = workflow.get('connections', [])
        
        # Filter out excluded nodes
        excluded_nodes = frontend_only_nodes | repeater_nodes
        execution_nodes = [node for node in workflow.get('nodes', []) if node['id'] not in excluded_nodes]
        
        if not execution_nodes:
            print("❌ No executable nodes found")
            return []
        
        # Use the synchronized execution approach
        print(f"🎯 Executing {len(execution_nodes)} nodes with input synchronization")
        return self.execute_nodes_simple(execution_nodes, workflow)
