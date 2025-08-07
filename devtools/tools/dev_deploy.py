#!/usr/bin/env python3
"""
Dev Deploy Script - Quick pack and install for development (API-only for install)
Called programmatically by sypnex.py CLI
"""

import os
import sys
import json
import requests
from pathlib import Path

# Add current directory to path for pack_app import
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
from pack_app import pack_app

# Add parent directory to path for config import
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import config
    # Use centralized config for authentication
    def get_auth_headers():
        """Get headers with authentication token from config"""
        return config.get_auth_headers()
except ImportError:
    print("❌ Error: Could not import config module. Make sure you're running from the proper workspace.")
    sys.exit(1)


def dev_deploy(app_name, source_dir=".", server_url="http://127.0.0.1:5000"):
    """Quick pack and deploy an app for development"""
    
    print(f"🚀 Dev Deploy: {app_name}")
    print(f"📁 Source: {source_dir}")
    print(f"🌐 Server: {server_url}")
    
    # Step 1: Pack the app using pack_app.py
    print(f"\n📦 Step 1: Packaging {app_name}...")
    
    # Call pack_app function - this creates the {app_name}_packaged.app file
    success = pack_app(app_name, source_dir)
    if not success:
        return False
    
    # Read the packaged .app file that was created
    package_file = f"{app_name}_packaged.app"
    if not os.path.exists(package_file):
        print(f"❌ Error: Package file {package_file} not found")
        return False
    
    try:
        with open(package_file, 'r', encoding='utf-8') as f:
            package = json.load(f)
    except Exception as e:
        print(f"❌ Error reading package file: {e}")
        return False
    
    # Clean up the temporary package file
    try:
        os.remove(package_file)
        print(f"🧹 Cleaned up temporary file: {package_file}")
    except Exception as e:
        print(f"⚠️  Warning: Could not clean up temporary file {package_file}: {e}")
    
    # Step 2: Install via API
    print(f"\n🚀 Step 2: Installing {app_name}...")
    
    try:
        # Create multipart form data with the package as a binary file
        package_bytes = json.dumps(package).encode('utf-8')
        files = {
            'package': (f'{app_name}_packaged.app', package_bytes, 'application/octet-stream')
        }
        
        # Get auth headers but remove Content-Type since requests will set it for multipart
        auth_headers = get_auth_headers()
        if 'Content-Type' in auth_headers:
            del auth_headers['Content-Type']
        
        # Send to install API with authentication
        install_response = requests.post(
            f'{server_url}/api/user-apps/install', 
            files=files,
            headers=auth_headers
        )
        
        if install_response.status_code == 200:
            install_result = install_response.json()
            print(f"✅ Success: {install_result.get('message', 'App installed successfully')}")
            print(f"📱 App Name: {install_result.get('app_name', app_name)}")
            
            # Step 3: Auto-refresh user apps
            print(f"\n🔄 Step 3: Refreshing user apps...")
            try:
                refresh_response = requests.post(
                    f'{server_url}/api/user-apps/refresh',
                    headers=get_auth_headers()
                )
                if refresh_response.status_code == 200:
                    refresh_result = refresh_response.json()
                    print(f"✅ User apps refreshed successfully")
                    print(f"📊 Total apps: {refresh_result.get('total', 'Unknown')}")
                else:
                    print(f"⚠️  Warning: Could not refresh user apps (status: {refresh_response.status_code})")
            except Exception as e:
                print(f"⚠️  Warning: Could not refresh user apps: {e}")
            
            return True
        else:
            try:
                error_data = install_response.json()
                print(f"❌ Installation failed: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"❌ Installation failed: {install_response.status_code} - {install_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to server")
        print(f" Make sure your Sypnex OS server is running at {server_url}")
        return False
    except Exception as e:
        print(f"❌ Error during deployment: {e}")
        return False 