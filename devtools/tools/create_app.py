#!/usr/bin/env python3
"""
Create App Module - Quickly create new user apps with proper structure
"""

import os
import sys
import json
import shutil
from pathlib import Path

def create_app(app_name, output_dir=None, template="basic"):
    """Create a new user app with the given name and template"""
    
    # Validate app name
    if not app_name or not app_name.strip():
        print("❌ Error: App name is required")
        print("Usage: python create_app.py <app_name>")
        return False
    
    app_name = app_name.strip()
    
    # Check for invalid characters
    invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    for char in invalid_chars:
        if char in app_name:
            print(f"❌ Error: App name cannot contain '{char}'")
            return False
    
    # Validate template
    templates_dir = Path(__file__).parent.parent.parent / "templates"
    template_path = templates_dir / template
    
    if not template_path.exists():
        available_templates = [d.name for d in templates_dir.iterdir() if d.is_dir()]
        print(f"❌ Error: Template '{template}' not found")
        print(f"Available templates: {', '.join(available_templates)}")
        return False
    
    # Define paths - use provided output directory or default to script parent
    if output_dir:
        base_dir = Path(output_dir).resolve()
    else:
        # Default to current working directory when no output specified
        base_dir = Path.cwd()
    
    app_dir = base_dir / app_name
    src_dir = app_dir / "src"
    app_file = app_dir / f"{app_name}.app"
    
    # Check if app already exists
    if app_dir.exists():
        print(f"❌ Error: App '{app_name}' already exists at {app_dir}")
        return False
    
    try:
        # Create app directory
        app_dir.mkdir(parents=True, exist_ok=False)
        print(f"✅ Created app directory: {app_dir}")
        
        # Copy template files
        print(f"📋 Using template: {template}")
        
        # Copy the entire template directory structure
        shutil.copytree(template_path, app_dir, dirs_exist_ok=True)
        
        # Rename template .app file to match new app name
        old_app_file = app_dir / f"{template}.app"
        new_app_file = app_dir / f"{app_name}.app"
        if old_app_file.exists():
            old_app_file.rename(new_app_file)
        
        # Replace template placeholders in all files
        _replace_template_placeholders(app_dir, template, app_name)
        
        # Success message
        print(f"\n🎉 Successfully created '{app_name}' app!")
        print(f"📁 Location: {app_dir}")
        print(f"📋 Template: {template}")
        print(f"📝 Files created:")
        print(f"   - {app_name}.app (app configuration)")
        print(f"   - src/index.html (main HTML file)")
        print(f"   - src/style.css (styling)")
        print(f"   - src/script.js (JavaScript logic)")
        print(f"\n🚀 Next steps:")
        print(f"   1. Edit the files in the src/ folder")
        print(f"   2. Refresh the User App Manager in your OS")
        print(f"   3. Your app will be automatically packed and available")
        print(f"\n💡 Tip: Use the SypnexAPI library for OS integration!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating app: {e}")
        # Clean up on error
        if app_dir.exists():
            shutil.rmtree(app_dir)
            print(f"🧹 Cleaned up partial app directory")
        return False 


def _replace_template_placeholders(app_dir, template_name, app_name):
    """Replace template placeholders in .app file only"""
    
    # Only process the .app file - leave all other files unchanged
    app_file = app_dir / f"{app_name}.app"
    
    if app_file.exists():
        try:
            # Read and parse the JSON
            with open(app_file, 'r', encoding='utf-8') as f:
                app_config = json.load(f)
            
            # Update only the necessary fields
            app_config["id"] = app_name
            app_config["name"] = app_name.title() + " App"
            app_config["description"] = f"A {app_name.title()} application"
            app_config["keywords"] = [app_name.lower(), "app", "user"]
            
            # Write back the updated JSON
            with open(app_file, 'w', encoding='utf-8') as f:
                json.dump(app_config, f, indent=2)
                
        except Exception as e:
            print(f"⚠️ Warning: Could not update {app_file}: {e}")