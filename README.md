# Sypnex OS Apps

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](#contributing)

Official collection of applications and development tools for [Sypnex OS](https://github.com/Sypnex-LLC/sypnex-os) - the web-based operating system.

> **🚀 Active Development**: Sypnex OS is an open-source project in active development. We welcome contributions to help reach production readiness. Whether you're interested in feature development, testing, documentation, or UI/UX improvements, contributions are welcome.


## 📱 Included Apps

### Core Applications
- **🏪 App Store** - Browse, install, and manage Sypnex OS applications
- **📝 Text Editor** - Feature-rich code editor with syntax highlighting and terminal integration
- **🔄 Flow Editor** - Visual workflow builder with node-based programming interface
- **� LLM Chat** - AI chat interface for interacting with language models

### Development Tools
- **📦 Pack App** - Package development apps for distribution
- **🚀 Dev Deploy** - Quick deployment tool for development iterations
- **🔧 Create App** - Scaffold new applications with proper structure
- **📊 Enhanced Workflow Runner** - Execute and manage complex workflows

## 🏗️ Project Structure

```
sypnex-os-apps/
├── app_store/              # App marketplace and manager
├── flow_editor/            # Visual workflow builder
│   ├── src/               # Application source code
│   └── node-definitions/  # Available workflow nodes
├── llm_chat/              # AI chat application
├── text_editor/           # Code editor application
├── create_app.py          # App scaffolding tool
├── pack_app.py           # App packaging utility
├── dev_deploy.py         # Development deployment tool
└── term_deploy.py        # Terminal script deployment
```

## 🚀 Quick Start

### Prerequisites
- [Sypnex OS](https://github.com/Sypnex-LLC/sypnex-os) running locally
- Python 3.7 or higher (for development tools)

### Installing Apps

1. **Using Dev Deploy (Development)**:
   ```bash
   # Deploy individual app for development
   python dev_deploy.py flow_editor
   
   # Deploy all apps at once
   python dev_deploy.py all
   
   # Watch for changes and auto-redeploy
   python dev_deploy.py flow_editor --watch
   ```

2. **Using Pack & Install (Production)**:
   ```bash
   # Package an app for distribution
   python pack_app.py flow_editor
   
   # Install via Sypnex OS App Store
   # Upload the generated .app file through the UI
   ```

### Creating New Apps

```bash
# Create a new application
python create_app.py my_awesome_app

# This creates:
# my_awesome_app/
# ├── my_awesome_app.app    # App metadata
# └── src/
#     ├── index.html        # Main interface
#     ├── style.css         # Styling
#     └── script.js         # JavaScript logic
```

## 🛠️ Development Tools

### App Development Workflow

1. **Create** - Use `create_app.py` to scaffold new applications
2. **Develop** - Edit files in the `src/` directory
3. **Test** - Use `dev_deploy.py` for quick deployment and testing
4. **Package** - Use `pack_app.py` to create distributable packages
5. **Deploy** - Install through Sypnex OS App Store

### Available Scripts

- **`create_app.py`** - Generate new app template
- **`pack_app.py`** - Package apps for distribution
- **`dev_deploy.py`** - Quick development deployment
- **`term_deploy.py`** - Deploy Python scripts to VFS
- **`enhanced_workflow_runner.py`** - Execute workflow files

## 📋 App Structure

Each Sypnex OS app follows this structure:

```
app_name/
├── app_name.app          # App metadata (JSON)
└── src/                  # Source files
    ├── index.html        # Main interface
    ├── style.css         # Styling
    ├── script.js         # JavaScript
    └── ...               # Additional resources
```

### App Metadata (`.app` file)

```json
{
  "id": "my_app",
  "name": "My App",
  "description": "A sample application",
  "icon": "fas fa-star",
  "keywords": ["sample", "app"],
  "author": "Developer Name",
  "version": "1.0.0",
  "type": "user_app"
}
```

## 🎯 Featured Applications

### Flow Editor
A powerful visual workflow builder that allows you to:
- Create node-based workflows
- Connect data between different services
- Execute complex automation tasks
- Integrate with AI models and APIs

### Text Editor
A feature-rich code editor with:
- Syntax highlighting for multiple languages
- Integrated terminal
- File management
- Live preview capabilities

### App Store
Central hub for managing applications:
- Browse available apps
- Install new applications
- Manage installed apps
- Update existing apps

## 🤝 Contributing

We welcome contributions to the Sypnex OS Apps ecosystem!

### Ways to Contribute

1. **Create New Apps** - Build applications for the ecosystem
2. **Improve Existing Apps** - Enhance features and fix bugs
3. **Development Tools** - Improve the development workflow
4. **Documentation** - Help others understand and use the apps

### Getting Started

1. Fork this repository
2. Create a new app or modify existing ones
3. Test your changes using the development tools
4. Submit a pull request

### App Development Guidelines

- Follow the standard app structure
- Include proper metadata in `.app` files
- Use the SypnexAPI for OS integration
- Test in development mode before submitting
- Document any special requirements

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- **[Sypnex OS](https://github.com/Sypnex-LLC/sypnex-os)** - The main operating system

---

*Official Sypnex OS Apps Repository - Build the future of web-based computing.*