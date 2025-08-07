#!/usr/bin/env python3
"""
Pack App Module - Package existing user apps into distributable format
"""

import os
import sys
import json
import base64
from pathlib import Path
from datetime import datetime
from bs4 import BeautifulSoup, Tag
import cssutils
import logging

def minify_css(css_content, app_id):
    """Minify CSS content using production library"""
    return css_content;  # Placeholder for CSS minification logic
    try:
        from csscompressor import compress
        # csscompressor removes comments and compresses by default
        return compress(css_content)
    except ImportError:
        print("⚠️  csscompressor not available, skipping CSS minification")
        return css_content
    except Exception as e:
        print(f"⚠️  CSS minification failed: {e}")
        return css_content

def minify_html(html_content):
    return html_content;  # Placeholder for HTML minification logic
    """Minify HTML content using production library"""
    try:
        from htmlmin import minify
        return minify(html_content, remove_comments=True, remove_empty_space=True)
    except ImportError:
        print("⚠️  htmlmin not available, skipping HTML minification")
        return html_content
    except Exception as e:
        print(f"⚠️  HTML minification failed: {e}")
        return html_content

def minify_js(js_content):
    return js_content;  # Placeholder for JS minification logic
    """Minify JavaScript content using production library"""
    try:
        from jsmin import jsmin
        # jsmin removes comments and whitespace by default
        return jsmin(js_content)
    except ImportError:
        print("⚠️  jsmin not available, skipping JS minification")
        return js_content
    except Exception as e:
        print(f"⚠️  JS minification failed: {e}")
        return js_content

def pack_app(app_name, source_dir="."):
    """Pack an existing user app into a distributable format"""
    
    # Validate app name
    if not app_name or not app_name.strip():
        print("❌ Error: App name is required")
        print("Usage: python pack_app.py <app_name>")
        return False
    
    app_name = app_name.strip()
    
    # Define paths
    app_dir = os.path.join(source_dir, app_name)
    app_file = os.path.join(app_dir, f"{app_name}.app")
    
    # Check if app exists
    if not os.path.exists(app_dir):
        print(f"❌ Error: App '{app_name}' not found at {app_dir}")
        return False
    
    if not os.path.exists(app_file):
        print(f"❌ Error: App metadata file '{app_name}.app' not found")
        return False
    
    try:
        # Load the original .app metadata file
        with open(app_file, 'r', encoding='utf-8') as f:
            app_metadata = json.load(f)
        
        print(f"📦 Packing app: {app_metadata.get('name', app_name)}")
        print(f"📁 Source directory: {app_dir}")
        
        # Auto-pack if needed (for user apps with src/ directory)
        if app_metadata.get('type') != 'terminal_app':
            packed_html_file = auto_pack_app(app_name, app_dir)
            if packed_html_file:
                print(f"✅ Auto-packed HTML file: {packed_html_file}")
        
        # Prepare package
        package = {
            'app_metadata': app_metadata,  # Original .app content (unchanged)
            'files': {},
            'package_info': {
                'format_version': '1.0',
                'created_at': datetime.now().isoformat(),
                'packaged_by': 'Sypnex OS App Packager',
                'source_directory': app_dir
            }
        }
        
        # Add the original .app file (base64 encoded)
        with open(app_file, 'rb') as f:
            package['files'][f"{app_name}.app"] = base64.b64encode(f.read()).decode('utf-8')
        print(f"✅ Added {app_name}.app")
        
        # Handle additional files (VFS files)
        additional_files = app_metadata.get('additional_files', [])
        if additional_files:
            print(f"📁 Processing {len(additional_files)} additional files...")
            package['additional_files'] = []
            
            for additional_file in additional_files:
                vfs_path = additional_file.get('vfs_path')
                source_file = additional_file.get('source_file')
                
                if not vfs_path or not source_file:
                    print(f"⚠️  Warning: Invalid additional file entry: {additional_file}")
                    continue
                
                # Build full path to source file (relative to app's src directory for now)
                src_dir = os.path.join(app_dir, 'src')
                source_path = os.path.join(src_dir, source_file)
                
                if not os.path.exists(source_path):
                    print(f"❌ Error: Additional file not found: {source_path}")
                    continue
                
                try:
                    # Read and encode the additional file
                    with open(source_path, 'rb') as f:
                        file_content = f.read()
                    
                    # Add to package
                    package['additional_files'].append({
                        'vfs_path': vfs_path,
                        'filename': os.path.basename(vfs_path),
                        'data': base64.b64encode(file_content).decode('utf-8'),
                        'size': len(file_content)
                    })
                    
                    print(f"✅ Added additional file: {source_file} → {vfs_path}")
                    
                except Exception as e:
                    print(f"❌ Error processing additional file {source_file}: {e}")
                    continue
        
        # Add app files based on type
        if app_metadata.get('type') == 'terminal_app':
            # Terminal app - add Python file
            python_file = os.path.join(app_dir, f"{app_name}.py")
            if os.path.exists(python_file):
                with open(python_file, 'rb') as f:
                    package['files'][f"{app_name}.py"] = base64.b64encode(f.read()).decode('utf-8')
                print(f"✅ Added {app_name}.py")
            else:
                print(f"⚠️  Warning: Python file {app_name}.py not found")
        else:
            # User app - add HTML file (packed or original)
            html_file = os.path.join(app_dir, f"{app_name}.html")
            intermediate_html_created = False
            
            if os.path.exists(html_file):
                with open(html_file, 'rb') as f:
                    package['files'][f"{app_name}.html"] = base64.b64encode(f.read()).decode('utf-8')
                print(f"✅ Added {app_name}.html")
                
                # Check if this was an intermediate file created by auto-packing
                if packed_html_file and packed_html_file == html_file:
                    intermediate_html_created = True
            else:
                print(f"⚠️  Warning: HTML file {app_name}.html not found")
        
        # Create output file
        output_file = f"{app_name}_packaged.app"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(package, f, indent=2)
        
        # Clean up intermediate HTML file if it was auto-created
        if packed_html_file and intermediate_html_created:
            try:
                os.remove(packed_html_file)
                print(f"🧹 Cleaned up intermediate file: {os.path.basename(packed_html_file)}")
            except Exception as e:
                print(f"⚠️  Warning: Could not clean up intermediate file: {e}")
        
        # Calculate package size
        package_size = os.path.getsize(output_file)
        package_size_kb = package_size / 1024
        
        print(f"\n🎉 Successfully packaged '{app_name}'!")
        print(f"📦 Package file: {output_file}")
        print(f"📊 Package size: {package_size_kb:.1f} KB")
        print(f"📋 Files included:")
        for filename in package['files'].keys():
            print(f"   - {filename}")
        
        # Show additional files if any
        if 'additional_files' in package and package['additional_files']:
            print(f"📁 Additional VFS files:")
            for additional_file in package['additional_files']:
                vfs_path = additional_file['vfs_path']
                size_kb = additional_file['size'] / 1024
                print(f"   - {vfs_path} ({size_kb:.1f} KB)")
        
        print(f"\n💡 Next steps:")
        print(f"   1. Share the {output_file} file")
        print(f"   2. Recipient can install it using the app installer")
        print(f"   3. Package contains all necessary files for installation")
        if 'additional_files' in package and package['additional_files']:
            print(f"   4. VFS files will be automatically deployed during installation")
        
        return True
        
    except Exception as e:
        print(f"❌ Error packing app: {e}")
        import traceback
        traceback.print_exc()
        return False

def auto_pack_app(app_id, app_path):
    """Auto-pack a development app into a single HTML file if src/ exists"""
    src_dir = os.path.join(app_path, 'src')
    if not os.path.exists(src_dir):
        return None
    
    html_file = os.path.join(app_path, f"{app_id}.html")
    
    # Only repack if any src file is newer than the packed file
    if os.path.exists(html_file):
        html_mtime = os.path.getmtime(html_file)
        src_files = []
        for f in os.listdir(src_dir):
            if f.endswith(('.html', '.css', '.js')):
                src_files.append(os.path.getmtime(os.path.join(src_dir, f)))
        
        if src_files and html_mtime > max(src_files):
            return html_file  # Already up to date
    
    # Read app metadata to get script and style order
    app_file = os.path.join(app_path, f"{app_id}.app")
    script_order = ['script.js']  # Default fallback
    style_order = ['style.css']   # Default fallback
    
    if os.path.exists(app_file):
        try:
            with open(app_file, 'r', encoding='utf-8') as f:
                app_metadata = json.load(f)
            script_order = app_metadata.get('scripts', ['script.js'])
            style_order = app_metadata.get('styles', ['style.css'])
            print(f"📋 Script order from .app file: {script_order}")
            print(f"📋 Style order from .app file: {style_order}")
        except Exception as e:
            print(f"⚠️  Warning: Could not read .app file for script/style order: {e}")
            print(f"   Using default script order: {script_order}")
            print(f"   Using default style order: {style_order}")
    
    # Read source files
    index_html_path = os.path.join(src_dir, 'index.html')
    
    if not os.path.exists(index_html_path):
        print(f"⚠️  Warning: No index.html found in src/ for {app_id}")
        return None
    
    merged = ''
    with open(index_html_path, 'r', encoding='utf-8') as f:
        merged += f.read()
    
    # Pack styles in order
    all_styles = []
    missing_styles = []
    
    for style_file in style_order:
        style_path = os.path.join(src_dir, style_file)
        if os.path.exists(style_path):
            with open(style_path, 'r', encoding='utf-8') as f:
                style_content = f.read()
            all_styles.append(style_content)
            print(f"✅ Added style: {style_file}")
        else:
            missing_styles.append(style_file)
            print(f"⚠️  Warning: Style file not found: {style_file}")
    
    if missing_styles:
        print(f"⚠️  Missing styles: {missing_styles}")
        print(f"   Available styles in src/: {[f for f in os.listdir(src_dir) if f.endswith('.css')]}")
    
    if all_styles:
        # Combine all styles with separators
        style_separators = []
        for i, style_name in enumerate(style_order):
            if style_name in [s for s in style_order if os.path.exists(os.path.join(src_dir, s))]:
                style_separators.append(f"/* ===== Style: {style_name} ===== */\n")
        
        combined_style = '\n\n'.join([sep + style for sep, style in zip(style_separators, all_styles)])
        
        # Minify the combined CSS
        minified_style = minify_css(combined_style, app_metadata.get('id', 'unknown_app'))
        merged += f'\n<style>{minified_style}</style>'
        print(f"📦 Packed and minified {len(all_styles)} styles in order")
    else:
        print(f"⚠️  No styles found to pack")
    
    # Pack scripts in order
    all_scripts = []
    missing_scripts = []
    
    for script_file in script_order:
        script_path = os.path.join(src_dir, script_file)
        if os.path.exists(script_path):
            with open(script_path, 'r', encoding='utf-8') as f:
                script_content = f.read()
            all_scripts.append(script_content)
            print(f"✅ Added script: {script_file}")
        else:
            missing_scripts.append(script_file)
            print(f"⚠️  Warning: Script file not found: {script_file}")
    
    if missing_scripts:
        print(f"⚠️  Missing scripts: {missing_scripts}")
        print(f"   Available scripts in src/: {[f for f in os.listdir(src_dir) if f.endswith('.js')]}")
    
    if all_scripts:
        # Combine all scripts with separators
        script_separators = []
        for i, script_name in enumerate(script_order):
            script_separators.append(f"// ===== Script: {script_name} =====\n")
        
        combined_script = '\n\n'.join(script_separators) + '\n\n'
        combined_script += '\n\n'.join(all_scripts)
        
        # Minify the combined JavaScript
        minified_script = minify_js(combined_script)
        merged += f'\n<script>{minified_script}</script>'
        print(f"📦 Packed and minified {len(all_scripts)} scripts in order")
    else:
        print(f"⚠️  No scripts found to pack")
    
    # Minify the final HTML document
    minified_html = minify_html(merged)
    scoped_html = scope_app_styles(minified_html, app_metadata.get('id', 'unknown_app'))
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(scoped_html)
    
    return html_file



def scope_app_styles(payload: str, appid: str) -> str:
    if not payload or not appid:
        return payload

    try:
        soup = BeautifulSoup(payload, 'lxml')

        all_rewritten_css = []
        
        # 1. Find, rewrite, and consolidate all CSS from <style> tags
        for style_tag in soup.find_all('style'):
            css_text = style_tag.string or ''
            if not css_text.strip():
                continue

            # We will modify the sheet in-place, which is efficient.
            sheet = cssutils.parseString(css_text, validate=False)
            
            prefix = f'[data-appid="{appid}"]'
            keyframes_map = {}

            # We iterate over a copy of the rules in case modification affects the list
            for rule in list(sheet.cssRules):
                # Using integer rule types for cross-version compatibility with cssutils.
                # KEYFRAMES_RULE is type 7.
                if rule.type == 7:
                    original_name = rule.name
                    new_name = f"{appid}-{original_name}"
                    keyframes_map[original_name] = new_name
                    rule.name = new_name

            # Second pass: prefix selectors and update animation properties
            for rule in list(sheet.cssRules):
                # STYLE_RULE is type 1.
                if rule.type == 1:
                    # Rewrite selectors to be scoped under the appid attribute
                    selectors = rule.selectorText.split(',')
                    scoped_selectors = []
                    for s in selectors:
                        s_stripped = s.strip()
                        if not s_stripped:
                            continue
                        
                        # Handle special 'root' selectors by targeting the container
                        if s_stripped.lower() in ['html', 'body', ':root']:
                            scoped_selectors.append(prefix)
                        else:
                            # Prepend the prefix to all other selectors
                            scoped_selectors.append(f"{prefix} {s_stripped}")
                    rule.selectorText = ', '.join(scoped_selectors)

                    # If we renamed any keyframes, update animation/animation-name properties
                    if keyframes_map and rule.style.animationName:
                        for old_name, new_name in keyframes_map.items():
                            # Replace animation names in the style declaration
                            current_animation_names = rule.style.animationName.split(',')
                            new_animation_names = [
                                new_name if name.strip() == old_name else name
                                for name in current_animation_names
                            ]
                            rule.style.animationName = ', '.join(new_animation_names)
            
            # Serialize the entire modified sheet back to text
            rewritten_css = sheet.cssText.decode('utf-8') if sheet.cssText else ""
            if rewritten_css:
                all_rewritten_css.append(rewritten_css)
            
            # Remove the original <style> tag now that we've processed it
            style_tag.decompose()

        # 2. Add the scoping attribute to the app's root HTML element(s)
        # Since the payload is a fragment, BeautifulSoup wraps it in <html><body>.
        # We find the actual root elements inside the body.
        if soup.body:
            root_elements = [tag for tag in soup.body.children if isinstance(tag, Tag) and tag.name not in ['style', 'script']]
            
            if len(root_elements) == 1:
                # If there's a single root container, tag it
                root_elements[0]['data-appid'] = appid
            elif len(root_elements) > 1:
                # If there are multiple root elements, wrap them in a new div
                wrapper = soup.new_tag('div', attrs={'data-appid': appid})
                for element in root_elements:
                    wrapper.append(element.extract())
                soup.body.insert(0, wrapper)
        
        # 3. Add a single new <style> tag with all the rewritten CSS
        if all_rewritten_css:
            final_css = "\n\n".join(all_rewritten_css)
            new_style_tag = soup.new_tag('style', type='text/css')
            new_style_tag.string = final_css
            
            # Prepend the new style to the body, as it's a fragment
            soup.body.insert(0, new_style_tag)

        #raise Exception("test")
        # 4. Return the processed HTML fragment
        # We join the contents of the body to avoid returning the auto-added <html><body> tags.
        return ''.join(str(c) for c in soup.body.contents)

    except Exception as e:
        print(f"Failed to process app styles for appid {appid}: {e}")
        # In case of any unexpected error, return the original payload to prevent crashes.
        return ""
    
 