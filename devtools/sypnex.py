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
    token set <token>              Set JWT token
    token get                      Show current token
    
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

def set_token(token):
    """Set JWT token in .env file"""
    env_file = Path('.env')
    
    # Read existing .env or create from template
    if env_file.exists():
        with open(env_file, 'r') as f:
            lines = f.readlines()
    else:
        # Copy from .env.example
        example_file = Path('.env.example')
        if example_file.exists():
            with open(example_file, 'r') as f:
                lines = f.readlines()
        else:
            lines = ['# Sypnex OS Development Configuration\n']
    
    # Update or add token line
    token_line = f'SYPNEX_DEV_TOKEN={token}\n'
    token_found = False
    
    for i, line in enumerate(lines):
        if line.startswith('SYPNEX_DEV_TOKEN='):
            lines[i] = token_line
            token_found = True
            break
    
    if not token_found:
        lines.append(token_line)
    
    # Write back to .env
    with open(env_file, 'w') as f:
        f.writelines(lines)
    
    print(f"✅ JWT token updated in .env file")
    print(f"   Token: {token[:20]}...{token[-5:]}")

def get_token():
    """Show current JWT token"""
    if config.dev_token:
        print(f"Current JWT Token: {config.dev_token}")
    else:
        print("❌ No JWT token configured")
        print("Use: python sypnex.py token set <your_token>")

def create_app(app_name, output_dir=None):
    """Create a new app"""
    try:
        from tools.create_app import main as create_main
        
        # Use specified directory or current working directory
        if output_dir:
            original_cwd = os.getcwd()
            os.chdir(output_dir)
        
        # Temporarily modify sys.argv to pass arguments to create_app
        original_argv = sys.argv
        sys.argv = ['create_app.py', app_name]
        create_main()
        sys.argv = original_argv
        
        # Change back to original directory if we changed it
        if output_dir:
            os.chdir(original_cwd)
        print(f"✅ App '{app_name}' created successfully!")
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
        
        # Extract app name and directory from path
        if os.path.isdir(app_path):
            app_dir = os.path.dirname(app_path)
            app_name = os.path.basename(app_path)
        else:
            # Assume it's just the app name in current directory
            app_dir = "."
            app_name = app_path
        
        print(f"🚀 Deploying app '{app_name}' from '{app_dir}' to {target_server}")
        
        # Validate config before deployment
        if not config.validate_config():
            return False
        
        success = dev_deploy(app_name, app_dir, target_server)
        if success:
            print(f"✅ App '{app_name}' deployed successfully!")
        else:
            print(f"❌ Failed to deploy app '{app_name}'")
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
        
        # Extract app name and directory from path
        if os.path.isdir(app_path):
            app_dir = os.path.dirname(app_path)
            app_name = os.path.basename(app_path)
        else:
            # Assume it's just the app name in current directory
            app_dir = "."
            app_name = app_path
        
        # Change to the directory where the app is located
        original_cwd = os.getcwd()
        os.chdir(app_dir)
        
        # Call pack_app function directly
        success = pack_app(app_name, ".")
        
        # Change back to original directory
        os.chdir(original_cwd)
        
        if success:
            print(f"✅ App '{app_name}' packaged successfully!")
        else:
            print(f"❌ Failed to package app '{app_name}'")
            return
    except Exception as e:
        # Make sure to change back to original directory even on error
        if 'original_cwd' in locals():
            os.chdir(original_cwd)
        print(f"❌ Error packaging app: {e}")

def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Sypnex OS Development CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python sypnex.py create my_awesome_app
  python sypnex.py deploy app flow_editor
  python sypnex.py deploy app my_app --server https://remote.com/
  python sypnex.py deploy vfs script.py
  python sypnex.py pack my_app
  python sypnex.py config
  python sypnex.py token set <your_jwt_token>
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Create command
    create_parser = subparsers.add_parser('create', help='Create a new app')
    create_parser.add_argument('app_name', help='Name of the app to create')
    create_parser.add_argument('--output', help='Directory to create the app in (default: current directory)')
    
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
    
    # Token command
    token_parser = subparsers.add_parser('token', help='Manage JWT token')
    token_subparsers = token_parser.add_subparsers(dest='token_action', help='Token actions')
    
    set_token_parser = token_subparsers.add_parser('set', help='Set JWT token')
    set_token_parser.add_argument('token', help='JWT token to set')
    
    token_subparsers.add_parser('get', help='Show current token')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Handle commands
    if not args.command:
        parser.print_help()
        return
    
    if args.command == 'create':
        create_app(args.app_name, args.output)
    
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
    
    elif args.command == 'token':
        if not args.token_action:
            token_parser.print_help()
            return
        
        if args.token_action == 'set':
            set_token(args.token)
        elif args.token_action == 'get':
            get_token()

if __name__ == '__main__':
    main()
