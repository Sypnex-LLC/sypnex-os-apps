#!/usr/bin/env python3
"""
VFS Deploy Module - Deploy Python files to VFS /scripts/ directory
"""

import os
import sys
import requests
import json
from pathlib import Path

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

def check_and_create_scripts_directory(server_url="http://localhost:5000"):
    """Check if /scripts directory exists, create it if it doesn't"""
    try:
        # Try to get info about the /scripts directory
        response = requests.get(f'{server_url}/api/virtual-files/info/scripts', 
                              headers=get_auth_headers())
        
        if response.status_code == 200:
            print(f"✅ /scripts directory already exists")
            return True
        elif response.status_code == 404:
            # Directory doesn't exist, create it
            print(f"📁 Creating /scripts directory...")
            create_response = requests.post(f'{server_url}/api/virtual-files/create-folder', 
                json={'name': 'scripts', 'parent_path': '/'}, 
                headers=get_auth_headers())
            
            if create_response.status_code == 200:
                print(f"✅ Created /scripts directory")
                return True
            else:
                try:
                    error_data = create_response.json()
                    print(f"❌ Failed to create /scripts directory: {error_data.get('error', 'Unknown error')}")
                except:
                    print(f"❌ Failed to create /scripts directory: {create_response.status_code}")
                return False
        else:
            print(f"❌ Error checking /scripts directory: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Error: Could not connect to server")
        print(f" Make sure your Sypnex OS server is running at {server_url}")
        return False
    except Exception as e:
        print(f"❌ Error checking/creating scripts directory: {e}")
        return False

def deploy_python_file(python_file, server_url="http://localhost:5000"):
    """Deploy a Python file to VFS /scripts/ directory"""
    
    print(f"🚀 VFS Deploy: {python_file}")
    print(f"🌐 Server: {server_url}")
    
    # Check if file exists
    if not os.path.exists(python_file):
        print(f"❌ Error: Python file '{python_file}' not found")
        return False
    
    # Get just the filename without path
    filename = os.path.basename(python_file)
    
    # Step 1: Ensure /scripts directory exists
    print(f"\n📁 Step 1: Ensuring /scripts directory exists...")
    if not check_and_create_scripts_directory(server_url):
        return False
    
    # Step 2: Read the Python file content
    print(f"\n📖 Step 2: Reading Python file content...")
    try:
        with open(python_file, 'r', encoding='utf-8') as f:
            content = f.read()
        print(f"✅ Read {len(content)} characters from {python_file}")
    except Exception as e:
        print(f"❌ Error reading Python file: {e}")
        return False
    
    # Step 3: Write file to VFS
    print(f"\n📝 Step 3: Writing {filename} to VFS...")
    try:
        # Create the file (API should handle overwriting automatically)
        create_response = requests.post(f'{server_url}/api/virtual-files/create-file', 
            json={
                'name': filename,
                'parent_path': '/scripts',
                'content': content
            },
            headers=get_auth_headers())
        
        if create_response.status_code == 200:
            result = create_response.json()
            print(f"✅ Success: {result.get('message', 'File written successfully')}")
            print(f"📁 Path: {result.get('path', f'/scripts/{filename}')}")
            return True
        else:
            try:
                error_data = create_response.json()
                print(f"❌ Failed to write file: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"❌ Failed to write file: {create_response.status_code} - {create_response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to server")
        print(f" Make sure your Sypnex OS server is running at {server_url}")
        return False
    except Exception as e:
        print(f"❌ Error during deployment: {e}")
        return False

    
    deploy_python_file(python_file, server_url) 