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
        """Execute nodes in simple sequence with smart input synchronization"""
        results = []
        node_results = {}
        
        for node in nodes:
            print(f"  Executing {node['id']} ({node['type']})...")
            try:
                # Prepare input data from connections if workflow is provided
                input_data = None
                parent_node_id = None
                
                if workflow:
                    connections = workflow.get('connections', [])
                    
                    # Find all connections going TO this node
                    incoming_connections = [conn for conn in connections if conn['to']['nodeId'] == node['id']]
                    
                    if incoming_connections:
                        # Smart input synchronization - wait for all inputs like frontend
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
                        
                        # Check if we have all required inputs (like frontend logic)
                        missing_ports = connected_ports - received_inputs.keys()
                        
                        if missing_ports:
                            print(f"  ⏳ Node {node['id']} waiting for inputs on ports: {list(missing_ports)}")
                            # In a real scenario, we'd wait, but for simplicity, we'll continue with available inputs
                        
                        input_data = received_inputs if received_inputs else None
                        parent_node_id = incoming_connections[0]['from']['nodeId'] if incoming_connections else None
                        
                        print(f"  🔍 Final input data for {node['id']}: {input_data}")
                
                result = self.workflow_runner.execute_node(node, input_data, node_results, parent_node_id)
                if result:
                    results.append({'node_id': node['id'], 'result': result})
                    node_results[node['id']] = result
                    print(f"  ✓ {node['id']} completed successfully")
                    
                    # Check for stop execution flag
                    if isinstance(result, dict) and result.get('__stop_execution'):
                        print(f"  🛑 Execution stopped by {node['id']}")
                        break
                else:
                    print(f"  ⚡ {node['id']} skipped (frontend-only)")
            except Exception as e:
                print(f"  ✗ {node['id']} failed: {str(e)}")
                results.append({'node_id': node['id'], 'result': {'error': str(e)}})
        
        return results
    
    def execute_workflow_once(self, workflow: Dict[str, Any]) -> list:
        """Execute workflow once (original parallel execution logic)"""
        # Build execution graph, skipping frontend-only nodes
        dependencies, dependents, frontend_only_nodes, repeater_nodes = ExecutionUtils.build_execution_graph(
            workflow, self.workflow_runner.load_node_definition
        )
        nodes = {node['id']: node for node in workflow.get('nodes', [])}
        connections = workflow.get('connections', [])
        
        # Find start nodes (no dependencies)
        start_nodes = [node_id for node_id, deps in dependencies.items() if not deps]
        
        if not start_nodes:
            print("❌ No start nodes found")
            return []
        
        # Store node results
        node_results = {}
        executed = set()
        results = []
        
        # Execute start nodes first
        print(f"🎯 Executing start nodes: {start_nodes}")
        start_futures = []
        for node_id in start_nodes:
            node = nodes[node_id]
            future = self.workflow_runner.executor.submit(
                self.workflow_runner.execute_node, node, None, node_results, None
            )
            start_futures.append((node_id, future))
        
        # Wait for start nodes to complete
        for node_id, future in start_futures:
            result = future.result()
            if result:
                node_results[node_id] = result
                executed.add(node_id)
                results.append({'node_id': node_id, 'result': result})
                
                # Check for stop execution flag
                if isinstance(result, dict) and result.get('__stop_execution'):
                    print(f"  🛑 Execution stopped by {node_id}")
                    return results
        
        # Continue with dependent nodes
        while len(executed) < len(dependencies):
            ready_nodes = ExecutionUtils.find_ready_nodes(dependencies, executed)
            
            if not ready_nodes:
                # Check for cycles or unreachable nodes
                remaining = set(dependencies.keys()) - executed
                if remaining:
                    print(f"⚠️  Warning: Unreachable nodes: {remaining}")
                break
            
            print(f"🔄 Executing {len(ready_nodes)} nodes in parallel: {ready_nodes}")
            
            # Execute ready nodes in parallel
            futures = []
            for node_id in ready_nodes:
                node = nodes[node_id]
                # Prepare input data from connections, rewiring through frontend-only nodes
                input_data = None
                parent_node_id = None
                
                # Group connections by input port to handle multiple connections
                port_connections = {}
                for conn in connections:
                    if conn['to']['nodeId'] == node_id:
                        input_port = conn['to']['portName']
                        if input_port not in port_connections:
                            port_connections[input_port] = []
                        port_connections[input_port].append(conn)
                
                # Process each input port
                if port_connections:
                    input_data = {}
                    for input_port, conns in port_connections.items():
                        if len(conns) == 1:
                            # Single connection - use the value directly
                            conn = conns[0]
                            from_node = conn['from']['nodeId']
                            # Rewire: if from_node is frontend-only, walk back to last backend node
                            actual_from = from_node
                            if from_node in frontend_only_nodes:
                                # Find the last backend node upstream
                                def walk_upstream(fnode):
                                    for c in connections:
                                        if c['to']['nodeId'] == fnode:
                                            up = c['from']['nodeId']
                                            if up in frontend_only_nodes:
                                                return walk_upstream(up)
                                            return up
                                    return None
                                actual_from = walk_upstream(from_node)
                            parent_node_id = actual_from
                            if actual_from in node_results:
                                output_port = conn['from']['portName']
                                if output_port in node_results[actual_from]:
                                    input_data[input_port] = node_results[actual_from][output_port]
                        else:
                            # Multiple connections - combine them (use the last one for now)
                            print(f"  🔗 Multiple connections to {input_port}: {len(conns)} connections")
                            for conn in conns:
                                from_node = conn['from']['nodeId']
                                # Rewire: if from_node is frontend-only, walk back to last backend node
                                actual_from = from_node
                                if from_node in frontend_only_nodes:
                                    # Find the last backend node upstream
                                    def walk_upstream(fnode):
                                        for c in connections:
                                            if c['to']['nodeId'] == fnode:
                                                up = c['from']['nodeId']
                                                if up in frontend_only_nodes:
                                                    return walk_upstream(up)
                                                return up
                                        return None
                                    actual_from = walk_upstream(from_node)
                                parent_node_id = actual_from
                                if actual_from in node_results:
                                    output_port = conn['from']['portName']
                                    if output_port in node_results[actual_from]:
                                        input_data[input_port] = node_results[actual_from][output_port]
                                        print(f"  🔗 Using {actual_from}.{output_port} for {input_port}")
                
                future = self.workflow_runner.executor.submit(
                    self.workflow_runner.execute_node, node, input_data, node_results, parent_node_id
                )
                futures.append((node_id, future))
            
            # Wait for all ready nodes to complete
            for node_id, future in futures:
                result = future.result()
                if result:
                    node_results[node_id] = result
                    executed.add(node_id)
                    results.append({'node_id': node_id, 'result': result})
                    
                    # Check for stop execution flag
                    if isinstance(result, dict) and result.get('__stop_execution'):
                        print(f"  🛑 Execution stopped by {node_id}")
                        return results
        
        return results
