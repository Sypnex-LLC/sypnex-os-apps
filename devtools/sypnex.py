#!/usr/bin/env python3
"""
Sypnex OS Development CLI

A unified command-line interface for Sypnex OS app development tools.

Usage:
    python sypnex.py <command> [options]

Commands:
    create <app_name>              Create a new app
    deploy app <app_name>          Deploy an app
    deploy vfs <file>              Deploy a script to VFS
    pack <app_name>                Package an app
    config                         Show current configuration
    
Examples:
    python sypnex.py create my_awesome_app
    python sypnex.py deploy app flow_editor
    python sypnex.py deploy vfs script.py
    python sypnex.py pack my_app
"""

import sys
import argparse
import os
from pathlib import Path

# Add the current directory to Python path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import config

def show_config():
    """Show current configuration"""
    print("🔧 Sypnex OS Configuration:")
    print(f"   Server URL: {config.server_url}")
    print(f"   Instance: {config.instance_name}")
    
    if config.dev_token:
        print(f"   JWT Token: {config.dev_token[:20]}...{config.dev_token[-5:]}")
        print("   ✅ Configuration looks good!")
    else:
        print("   JWT Token: ❌ Not configured")
        print()
        print("💡 To configure:")
        print("   1. Copy .env.example to .env")
        print("   2. Get JWT token from System Settings > Developer Mode")
        print("   3. Set SYPNEX_DEV_TOKEN in .env file")

def create_app(app_name, output_dir=None, template="basic"):
    """Create a new app"""
    try:
        from tools.create_app import create_app as create_app_func
        
        # Use specified directory or current working directory
        if output_dir:
            original_cwd = os.getcwd()
            os.chdir(output_dir)
        
        # Call create_app function directly with template
        success = create_app_func(app_name, output_dir, template)
        
        # Change back to original directory if we changed it
        if output_dir:
            os.chdir(original_cwd)
        
        if success:
            print(f"✅ App '{app_name}' created successfully using template '{template}'!")
        else:
            print(f"❌ Failed to create app '{app_name}'")
    except Exception as e:
        # Make sure to change back to original directory even on error
        if output_dir and 'original_cwd' in locals():
            os.chdir(original_cwd)
        print(f"❌ Error creating app: {e}")

def deploy_app(app_path, server_url=None):
    """Deploy an app"""
    try:
        from tools.dev_deploy import dev_deploy
        
        # Use provided server or default from config
        target_server = server_url or config.server_url
        
        # Convert to absolute path
        if os.path.isabs(app_path):
            source_dir = app_path
        else:
            source_dir = os.path.abspath(app_path)
        
        # Verify the directory exists
        if not os.path.isdir(source_dir):
            print(f"❌ Error: Directory not found: {source_dir}")
            return False
        
        # Find any .app file to get the ID (ignore _packaged files)
        import glob
        import json
        all_app_files = glob.glob(os.path.join(source_dir, "*.app"))
        app_files = [f for f in all_app_files if "_packaged" not in os.path.basename(f)]
        if not app_files:
            print(f"❌ Error: No .app file found in {source_dir}")
            return False
        
        app_file = app_files[0]
        try:
            with open(app_file, 'r', encoding='utf-8') as f:
                app_metadata = json.load(f)
        except Exception as e:
            print(f"❌ Error reading app metadata from {app_file}: {e}")
            return False
        
        app_id = app_metadata.get('id')
        if not app_id:
            print(f"❌ No 'id' field found in {app_file}")
            return False
        
        print(f"🚀 Deploying app '{app_id}' from '{source_dir}' to {target_server}")
        
        # Validate config before deployment
        if not config.validate_config():
            return False
        
        success = dev_deploy(app_id, source_dir, target_server)
        if success:
            print(f"✅ App '{app_id}' deployed successfully!")
        else:
            print(f"❌ Failed to deploy app '{app_id}'")
        return success
        
    except Exception as e:
        print(f"❌ Error deploying app: {e}")
        return False

def deploy_vfs(file_path, server_url=None):
    """Deploy a file to VFS"""
    try:
        from tools.vfs_deploy import deploy_python_file
        
        # Use provided server or default from config
        target_server = server_url or config.server_url
        
        print(f"🚀 Deploying '{file_path}' to VFS at {target_server}")
        
        # Validate config before deployment
        if not config.validate_config():
            return False
        
        # Use the exact file path provided - no assumptions
        success = deploy_python_file(file_path, target_server)
        if success:
            print(f"✅ File '{file_path}' deployed to VFS successfully!")
        else:
            print(f"❌ Failed to deploy file '{file_path}'")
        return success
        
    except Exception as e:
        print(f"❌ Error deploying to VFS: {e}")
        return False

def pack_app(app_path):
    """Package an app"""
    try:
        from tools.pack_app import pack_app
        
        # Convert to absolute path
        if os.path.isabs(app_path):
            source_dir = app_path
        else:
            source_dir = os.path.abspath(app_path)
        
        # Verify the directory exists
        if not os.path.isdir(source_dir):
            print(f"❌ Error: Directory not found: {source_dir}")
            return False
        
        # Find any .app file to get the ID for naming (ignore _packaged files)
        import glob
        import json
        all_app_files = glob.glob(os.path.join(source_dir, "*.app"))
        app_files = [f for f in all_app_files if "_packaged" not in os.path.basename(f)]
        if not app_files:
            print(f"❌ Error: No .app file found in {source_dir}")
            return False
        
        app_file = app_files[0]
        try:
            with open(app_file, 'r', encoding='utf-8') as f:
                app_metadata = json.load(f)
        except Exception as e:
            print(f"❌ Error reading app metadata from {app_file}: {e}")
            return False
        
        app_id = app_metadata.get('id')
        if not app_id:
            print(f"❌ No 'id' field found in {app_file}")
            return False
        
        # Create output file in the same directory as the source
        output_file = os.path.join(source_dir, f"{app_id}_packaged.app")
        
        # Call pack_app function with full paths
        success = pack_app(source_dir, output_file)
        
        if success:
            print(f"✅ App '{app_id}' packaged successfully!")
        else:
            print(f"❌ Failed to package app '{app_id}'")
        
        return success
        
    except Exception as e:
        print(f"❌ Error packaging app: {e}")
        return False

def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Sypnex OS Development CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python sypnex.py create my_awesome_app
  python sypnex.py create my_calculator --template=basic
  python sypnex.py create my_editor --template=file
  python sypnex.py create my_dashboard --template=menu
  python sypnex.py deploy app flow_editor
  python sypnex.py deploy app my_app --server https://remote.com/
  python sypnex.py deploy vfs script.py
  python sypnex.py pack my_app
  python sypnex.py config
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Create command
    create_parser = subparsers.add_parser('create', help='Create a new app')
    create_parser.add_argument('app_name', help='Name of the app to create')
    create_parser.add_argument('--output', help='Directory to create the app in (default: current directory)')
    create_parser.add_argument('--template', default='basic', help='Template to use (default: basic). Available: empty, basic, file, keybinds, menu, network')
    
    # Deploy command
    deploy_parser = subparsers.add_parser('deploy', help='Deploy apps or files')
    deploy_subparsers = deploy_parser.add_subparsers(dest='deploy_type', help='Deployment type')
    
    # Deploy app
    app_parser = deploy_subparsers.add_parser('app', help='Deploy an app')
    app_parser.add_argument('app_path', help='Path to the app (directory or app name if in current dir)')
    app_parser.add_argument('--server', help='Server URL (overrides .env)')
    
    # Deploy to VFS
    vfs_parser = deploy_subparsers.add_parser('vfs', help='Deploy a file to VFS')
    vfs_parser.add_argument('file_path', help='Exact path to the file to deploy')
    vfs_parser.add_argument('--server', help='Server URL (overrides .env)')
    
    # Pack command
    pack_parser = subparsers.add_parser('pack', help='Package an app')
    pack_parser.add_argument('app_path', help='Path to the app (directory or app name if in current dir)')
    
    # Config command
    subparsers.add_parser('config', help='Show current configuration')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Handle commands
    if not args.command:
        parser.print_help()
        return
    
    if args.command == 'create':
        create_app(args.app_name, args.output, args.template)
    
    elif args.command == 'deploy':
        if not args.deploy_type:
            deploy_parser.print_help()
            return
        
        if args.deploy_type == 'app':
            deploy_app(args.app_path, args.server)
        elif args.deploy_type == 'vfs':
            deploy_vfs(args.file_path, args.server)
    
    elif args.command == 'pack':
        pack_app(args.app_path)
    
    elif args.command == 'config':
        show_config()

if __name__ == '__main__':
    main()
