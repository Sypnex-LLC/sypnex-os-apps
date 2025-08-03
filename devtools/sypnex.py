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
    deploy all                     Deploy all apps
    pack <app_name>                Package an app
    config                         Show current configuration
    token set <token>              Set JWT token
    token get                      Show current token
    
Examples:
    python sypnex.py create my_awesome_app
    python sypnex.py deploy app flow_editor
    python sypnex.py deploy vfs script.py
    python sypnex.py deploy all --server https://remote.com/
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

def create_app(app_name):
    """Create a new app"""
    try:
        from tools.create_app import main as create_main
        # Temporarily modify sys.argv to pass arguments to create_app
        original_argv = sys.argv
        sys.argv = ['create_app.py', app_name]
        create_main()
        sys.argv = original_argv
        print(f"✅ App '{app_name}' created successfully!")
    except Exception as e:
        print(f"❌ Error creating app: {e}")

def deploy_app(app_name, server_url=None, watch=False):
    """Deploy an app"""
    try:
        from tools.dev_deploy import dev_deploy
        
        # Use provided server or default from config
        target_server = server_url or config.server_url
        
        print(f"🚀 Deploying app '{app_name}' to {target_server}")
        
        # Validate config before deployment
        if not config.validate_config():
            return False
        
        success = dev_deploy(app_name, ".", target_server, watch)
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
        
        success = deploy_python_file(file_path, target_server)
        if success:
            print(f"✅ File '{file_path}' deployed to VFS successfully!")
        else:
            print(f"❌ Failed to deploy file '{file_path}'")
        return success
        
    except Exception as e:
        print(f"❌ Error deploying to VFS: {e}")
        return False

def deploy_all(server_url=None):
    """Deploy all apps"""
    try:
        from tools.dev_deploy import deploy_all_apps
        
        # Use provided server or default from config
        target_server = server_url or config.server_url
        
        print(f"🚀 Deploying all apps to {target_server}")
        
        # Validate config before deployment
        if not config.validate_config():
            return False
        
        success = deploy_all_apps(".", target_server)
        if success:
            print(f"✅ All apps deployed successfully!")
        else:
            print(f"❌ Some apps failed to deploy")
        return success
        
    except Exception as e:
        print(f"❌ Error deploying all apps: {e}")
        return False

def pack_app(app_name):
    """Package an app"""
    try:
        from tools.pack_app import main as pack_main
        # Temporarily modify sys.argv to pass arguments to pack_app
        original_argv = sys.argv
        sys.argv = ['pack_app.py', app_name]
        pack_main()
        sys.argv = original_argv
        print(f"✅ App '{app_name}' packaged successfully!")
    except Exception as e:
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
  python sypnex.py deploy all
  python sypnex.py pack my_app
  python sypnex.py config
  python sypnex.py token set <your_jwt_token>
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Create command
    create_parser = subparsers.add_parser('create', help='Create a new app')
    create_parser.add_argument('app_name', help='Name of the app to create')
    
    # Deploy command
    deploy_parser = subparsers.add_parser('deploy', help='Deploy apps or files')
    deploy_subparsers = deploy_parser.add_subparsers(dest='deploy_type', help='Deployment type')
    
    # Deploy app
    app_parser = deploy_subparsers.add_parser('app', help='Deploy an app')
    app_parser.add_argument('app_name', help='Name of the app to deploy')
    app_parser.add_argument('--server', help='Server URL (overrides .env)')
    app_parser.add_argument('--watch', action='store_true', help='Watch for changes and auto-redeploy')
    
    # Deploy to VFS
    vfs_parser = deploy_subparsers.add_parser('vfs', help='Deploy a file to VFS')
    vfs_parser.add_argument('file_path', help='Path to the file to deploy')
    vfs_parser.add_argument('--server', help='Server URL (overrides .env)')
    
    # Deploy all
    all_parser = deploy_subparsers.add_parser('all', help='Deploy all apps')
    all_parser.add_argument('--server', help='Server URL (overrides .env)')
    
    # Pack command
    pack_parser = subparsers.add_parser('pack', help='Package an app')
    pack_parser.add_argument('app_name', help='Name of the app to package')
    
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
        create_app(args.app_name)
    
    elif args.command == 'deploy':
        if not args.deploy_type:
            deploy_parser.print_help()
            return
        
        if args.deploy_type == 'app':
            deploy_app(args.app_name, args.server, args.watch)
        elif args.deploy_type == 'vfs':
            deploy_vfs(args.file_path, args.server)
        elif args.deploy_type == 'all':
            deploy_all(args.server)
    
    elif args.command == 'pack':
        pack_app(args.app_name)
    
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
