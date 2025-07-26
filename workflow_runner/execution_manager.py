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
        """Execute nodes with proper input synchronization and for_each handling"""
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
                        # Check if this is a for_each control node
                        if isinstance(result, dict) and result.get('for_each_control'):
                            print(f"  🔄 {node['id']} is a for_each node - handling iteration")
                            for_each_results = self._handle_for_each_execution(node, result, workflow, node_results, remaining_nodes)
                            results.extend(for_each_results)
                            # Remove the for_each node and all downstream nodes from remaining_nodes
                            # as they've been handled by the for_each logic
                            downstream_nodes = self._get_downstream_nodes(node['id'], workflow)
                            for downstream_node in downstream_nodes:
                                if downstream_node in remaining_nodes:
                                    remaining_nodes.remove(downstream_node)
                        else:
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
    
    def _handle_for_each_execution(self, for_each_node: Dict[str, Any], for_each_result: Dict[str, Any], 
                                   workflow: Dict[str, Any], node_results: Dict[str, Any], 
                                   remaining_nodes: List[Dict[str, Any]]) -> list:
        """Handle for_each node execution - iterate through array and execute downstream nodes"""
        array_data = for_each_result['array_data']
        stop_on_error = for_each_result['stop_on_error']
        for_each_node_id = for_each_result['node_id']
        
        print(f"  🔄 for_each {for_each_node_id} starting iteration over {len(array_data)} items")
        
        all_results = []
        
        # Get all downstream nodes from the for_each node
        downstream_nodes = self._get_downstream_nodes(for_each_node_id, workflow)
        
        # For each item in the array, execute the downstream nodes
        for index, item in enumerate(array_data):
            print(f"    🔄 for_each iteration {index + 1}/{len(array_data)}: {item}")
            
            try:
                # Create the outputs that the for_each node provides for this iteration
                iteration_outputs = {
                    'current_item': item,
                    'current_index': index,
                    'completed': False  # Will be True only on the last iteration
                }
                
                # Add the for_each node result to node_results for this iteration
                iteration_node_results = node_results.copy()
                iteration_node_results[for_each_node_id] = iteration_outputs
                
                # CRITICAL: Clear executed nodes for downstream nodes to allow re-execution
                # Save the current executed nodes state
                original_executed_nodes = self.workflow_runner.executed_nodes.copy()
                
                # Remove downstream nodes from executed_nodes to allow re-execution
                downstream_node_ids = [node['id'] for node in downstream_nodes]
                for downstream_id in downstream_node_ids:
                    if downstream_id in self.workflow_runner.executed_nodes:
                        self.workflow_runner.executed_nodes.remove(downstream_id)
                
                print(f"    🔄 Cleared {len(downstream_node_ids)} downstream nodes from executed list for iteration {index + 1}")
                
                # Execute downstream nodes with the current iteration data
                iteration_results = self._execute_downstream_nodes(
                    downstream_nodes, workflow, iteration_node_results
                )
                
                # Restore the original executed nodes state (but keep the for_each node marked as executed)
                self.workflow_runner.executed_nodes = original_executed_nodes
                
                # Add iteration context to results
                for result in iteration_results:
                    result['for_each_iteration'] = {
                        'index': index,
                        'item': item,
                        'for_each_node': for_each_node_id
                    }
                
                all_results.extend(iteration_results)
                
                print(f"    ✓ for_each iteration {index + 1} completed")
                
            except Exception as e:
                error_msg = f"for_each iteration {index + 1} failed: {str(e)}"
                print(f"    ✗ {error_msg}")
                
                all_results.append({
                    'node_id': f"{for_each_node_id}_iteration_{index}",
                    'result': {'error': error_msg},
                    'for_each_iteration': {
                        'index': index,
                        'item': item,
                        'for_each_node': for_each_node_id
                    }
                })
                
                if stop_on_error:
                    print(f"    🛑 for_each stopping on error at iteration {index + 1}")
                    break
        
        # Add the final completed signal
        final_outputs = {
            'current_item': None,
            'current_index': len(array_data),
            'completed': True
        }
        
        all_results.append({
            'node_id': for_each_node_id,
            'result': final_outputs
        })
        
        print(f"  ✅ for_each {for_each_node_id} completed all iterations")
        return all_results
    
    def _get_downstream_nodes(self, node_id: str, workflow: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get all nodes that are downstream from the given node"""
        connections = workflow.get('connections', [])
        nodes_dict = {node['id']: node for node in workflow.get('nodes', [])}
        
        # Find immediate downstream nodes
        immediate_downstream = set()
        for conn in connections:
            if conn['from']['nodeId'] == node_id:
                immediate_downstream.add(conn['to']['nodeId'])
        
        # Recursively find all downstream nodes
        all_downstream = set()
        to_process = list(immediate_downstream)
        
        while to_process:
            current_node_id = to_process.pop(0)
            if current_node_id not in all_downstream:
                all_downstream.add(current_node_id)
                
                # Find nodes downstream from current node
                for conn in connections:
                    if conn['from']['nodeId'] == current_node_id:
                        downstream_id = conn['to']['nodeId']
                        if downstream_id not in all_downstream:
                            to_process.append(downstream_id)
        
        # Return the actual node objects
        return [nodes_dict[node_id] for node_id in all_downstream if node_id in nodes_dict]
    
    def _execute_downstream_nodes(self, downstream_nodes: List[Dict[str, Any]], 
                                  workflow: Dict[str, Any], node_results: Dict[str, Any]) -> list:
        """Execute downstream nodes in proper dependency order"""
        if not downstream_nodes:
            return []
        
        # Use the same execution logic as execute_nodes_simple but for downstream nodes only
        results = []
        remaining_nodes = downstream_nodes.copy()
        # Create a fresh executed_nodes set for this iteration - only include the for_each node
        executed_nodes = set()
        # Add non-downstream nodes that were already executed to the executed set
        for node_id in node_results.keys():
            if not any(node['id'] == node_id for node in downstream_nodes):
                executed_nodes.add(node_id)
        
        print(f"      🎯 Executing {len(downstream_nodes)} downstream nodes")
        
        while remaining_nodes:
            ready_nodes = []
            
            for node in remaining_nodes:
                connections = workflow.get('connections', [])
                incoming_connections = [conn for conn in connections if conn['to']['nodeId'] == node['id']]
                
                if not incoming_connections:
                    ready_nodes.append(node)
                else:
                    # Check if all required inputs are available
                    connected_ports = set(conn['to']['portName'] for conn in incoming_connections)
                    available_inputs = set()
                    
                    for conn in incoming_connections:
                        from_node_id = conn['from']['nodeId']
                        if from_node_id in executed_nodes or from_node_id in node_results:
                            available_inputs.add(conn['to']['portName'])
                    
                    if connected_ports.issubset(available_inputs):
                        ready_nodes.append(node)
            
            if not ready_nodes:
                remaining_ids = [n['id'] for n in remaining_nodes]
                print(f"      ⚠️ No downstream nodes ready. Remaining: {remaining_ids}")
                print(f"      📊 Executed nodes: {executed_nodes}")
                print(f"      📊 Node results available: {list(node_results.keys())}")
                break
            
            # Execute ready nodes
            for node in ready_nodes:
                print(f"      Executing downstream {node['id']} ({node['type']})...")
                try:
                    input_data = self._collect_synchronized_inputs(node, workflow, node_results)
                    
                    result = self.workflow_runner.execute_node(node, input_data, node_results, None)
                    if result:
                        results.append({'node_id': node['id'], 'result': result})
                        node_results[node['id']] = result
                        executed_nodes.add(node['id'])
                        print(f"      ✓ downstream {node['id']} completed")
                    else:
                        executed_nodes.add(node['id'])
                        print(f"      ⚡ downstream {node['id']} skipped")
                        
                except Exception as e:
                    print(f"      ✗ downstream {node['id']} failed: {str(e)}")
                    results.append({'node_id': node['id'], 'result': {'error': str(e)}})
                    executed_nodes.add(node['id'])
                
                remaining_nodes.remove(node)
        
        return results
