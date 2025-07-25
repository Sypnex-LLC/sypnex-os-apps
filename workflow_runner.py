#!/usr/bin/env python3
"""
Enhanced Workflow Runner - Modular Version
Entry point for the modular workflow runner system
"""

import json
import sys
import time
from workflow_runner import EnhancedWorkflowRunner


def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python enhanced_workflow_runner_modular.py <workflow_path> [server_url]")
        print("Example: python enhanced_workflow_runner_modular.py /AANEW.json")
        print("Example: python enhanced_workflow_runner_modular.py /AANEW.json http://127.0.0.1:5000")
        sys.exit(1)

    workflow_path = sys.argv[1]
    server_url = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:5000"

    try:
        with EnhancedWorkflowRunner(server_url) as runner:
            # Load workflow
            workflow = runner.load_workflow(workflow_path)
            
            # Execute workflow with parallel processing
            results = runner.execute_workflow_parallel(workflow)
            
            # Print summary
            print("\n📋 Execution Summary:")
            print("=" * 50)
            success_count = 0
            error_count = 0
            frontend_only_count = 0
            nodes = {node['id']: node for node in workflow.get('nodes', [])}
            
            for result in results:
                node_id = result['node_id']
                node_type = nodes[node_id]['type']
                node_result = result['result']
                
                if 'error' in node_result:
                    print(f"  ❌ {node_id} ({node_type}): {node_result['error']}")
                    error_count += 1
                else:
                    # Show some output preview
                    output_summary = ""
                    if isinstance(node_result, dict):
                        outputs = []
                        for key, value in list(node_result.items())[:3]:  # Show first 3 outputs
                            if isinstance(value, str) and len(value) > 50:
                                outputs.append(f"{key}='{value[:47]}...'")
                            else:
                                outputs.append(f"{key}={value}")
                        
                        if outputs:
                            output_summary = f" | {', '.join(outputs)}"
                            if len(node_result) > 3:
                                output_summary += f" (+{len(node_result)-3} more)"
                    #print(f"  ✅ {node_id} ({node_type}): Success{output_summary}")
                    print(f"  ✅ {node_id} ({node_type}): Success")
                    success_count += 1
            
            print()
            print(f"📊 Results: {success_count} successful, {error_count} errors")
            
            # Check for frontend-only nodes that were skipped
            for node_id, node in nodes.items():
                if node_id not in [r['node_id'] for r in results]:
                    node_def = runner.load_node_definition(node['type'])
                    if node_def.get('execution_mode') == 'frontend_only':
                        print(f"  ⚡ {node_id} ({node['type']}): Frontend-only (skipped in backend)")
                        frontend_only_count += 1

            if frontend_only_count > 0:
                print(f"📊 Frontend-only nodes: {frontend_only_count} skipped")
            
    except KeyboardInterrupt:
        print("\n🛑 Execution interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
