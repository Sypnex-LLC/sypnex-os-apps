# Sypnex OS Apps

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](#contributing)

Official collection of applications and development tools for [Sypnex OS](https://github.com/Sypnex-LLC/sypnex-os) - the web-based operating system.

> **🚀 Active Development**: Sypnex OS is an open-source project in active development. We welcome contributions to help reach production readiness. Whether you're interested in feature development, testing, documentation, or UI/UX improvements, contributions are welcome.

## 📖 For Developers

**👉 [Complete User App Development Guide](USER_APP_DEVELOPMENT_GUIDE.md)** - Comprehensive guide for creating apps on Sypnex OS

**Key Resources:**
- **[VS Code Extension](https://github.com/Sypnex-LLC/sypnex-os-vscode-extension)** - IntelliSense support for SypnexAPI (65+ methods)
- **[Core OS Repository](https://github.com/Sypnex-LLC/sypnex-os)** - Main Sypnex OS codebase
- **Development Tools** - Included in this repository (see below)


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

### Create Your First App

```bash
# 1. Create a new app (scaffolds proper structure)
python create_app.py my_awesome_app

# 2. Edit your app files:
# my_awesome_app/my_awesome_app.app  # App metadata
# my_awesome_app/src/index.html      # App interface  
# my_awesome_app/src/style.css       # App styles
# my_awesome_app/src/main.js         # App logic

# 3. Deploy for testing
python dev_deploy.py my_awesome_app

# 4. Package for distribution
python pack_app.py my_awesome_app
```

**👉 [Read the Complete Development Guide](USER_APP_DEVELOPMENT_GUIDE.md)** for detailed instructions, examples, and best practices.

## 🛠️ Development Tools

This repository includes powerful development tools to streamline your app development workflow:

### App Development Workflow

```bash
# 1. Create - Generate new app template
python create_app.py my_app

# 2. Develop - Edit files in the src/ directory
# 3. Test - Quick development deployment
python dev_deploy.py my_app

# 4. Package - Create distributable packages  
python pack_app.py my_app

# 5. Deploy - Install through Sypnex OS App Store
```

### Available Development Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| **`create_app.py`** | Generate new app template | `python create_app.py my_app` |
| **`dev_deploy.py`** | Quick development deployment | `python dev_deploy.py my_app` |
| **`pack_app.py`** | Package apps for distribution | `python pack_app.py my_app` |
| **`term_deploy.py`** | Deploy Python scripts to VFS | `python term_deploy.py script.py` |
| **`enhanced_workflow_runner.py`** | Execute workflow files | `python enhanced_workflow_runner.py workflow.json` |

### Development Deployment Options

```bash
# Deploy individual app for development
python dev_deploy.py flow_editor

# Deploy all apps at once
python dev_deploy.py all

# Watch for changes and auto-redeploy (great for active development)
python dev_deploy.py flow_editor --watch
```

## 📋 App Structure

Each Sypnex OS app follows this standardized structure:

```
app_name/
├── app_name.app          # App metadata (JSON)
└── src/                  # Source files
    ├── index.html        # Main interface (content only, no DOCTYPE/head/body)
    ├── style.css         # App-specific styling
    ├── main.js           # JavaScript logic
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
  "type": "user_app",
  "scripts": ["main.js"]
}
```

**💡 Important Notes:**
- Apps are **sandboxed** and run within the OS environment
- HTML files should contain **content only** (no DOCTYPE, head, body)
- Use **SypnexAPI** for system integration and file operations
- Apps have access to **65+ API methods** for OS integration

**👉 [Full App Structure Guide](USER_APP_DEVELOPMENT_GUIDE.md#app-structure)**

## 🎯 Featured Applications

### 🔄 Flow Editor
A powerful visual workflow builder that demonstrates advanced Sypnex OS capabilities:
- Node-based visual programming interface
- Real-time workflow execution with live output streaming
- AI integration with local LLM models
- API integrations and data processing pipelines

**[📖 Flow Editor Documentation](flow_editor/FLOW_EDITOR_README.md)**

### 📝 Text Editor
Feature-rich code editor with integrated development tools:
- Syntax highlighting for multiple languages
- Integrated terminal for command execution
- Virtual file system integration
- Live preview capabilities

### 🏪 App Store
Central hub for managing the Sypnex OS application ecosystem:
- Browse and install available applications
- Manage installed apps and updates
- Search and filter functionality
- One-click app installation

**[📖 App Store Documentation](app_store/APP_STORE_README.md)**

### 💬 LLM Chat
AI chat interface showcasing AI integration capabilities:
- Support for multiple AI models via Ollama
- Context-aware conversations
- Integration with the OS ecosystem
- Real-time AI interactions

## 🤝 Contributing

We welcome contributions to the Sypnex OS Apps ecosystem!

### Ways to Contribute

1. **Create New Apps** - Build applications for the ecosystem
2. **Improve Existing Apps** - Enhance features and fix bugs  
3. **Development Tools** - Improve the development workflow
4. **Documentation** - Help others understand and use the apps

### Getting Started

1. Fork this repository
2. Create a new app using `python create_app.py your_app_name`
3. Develop your app following our [Development Guide](USER_APP_DEVELOPMENT_GUIDE.md)
4. Test using `python dev_deploy.py your_app_name`
5. Submit a pull request

### App Development Guidelines

- Follow the standard app structure and metadata format
- Include proper metadata in `.app` files with all required fields
- Use the SypnexAPI for OS integration (IntelliSense available via [VS Code extension](https://github.com/Sypnex-LLC/sypnex-os-vscode-extension))
- Test in development mode before submitting
- Document any special requirements or complex features
- Follow [our coding standards](CONTRIBUTING.md#code-style-guidelines)

**👉 [Complete Contributing Guide](CONTRIBUTING.md)**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- **[Sypnex OS](https://github.com/Sypnex-LLC/sypnex-os)** - The main operating system
- **[VS Code Extension](https://github.com/Sypnex-LLC/sypnex-os-vscode-extension)** - IntelliSense support for SypnexAPI

## 📚 Documentation

- **[User App Development Guide](USER_APP_DEVELOPMENT_GUIDE.md)** - Complete guide for creating apps
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to this repository
- **[Core OS Documentation](https://github.com/Sypnex-LLC/sypnex-os#documentation)** - Main OS architecture and APIs

---

*Official Sypnex OS Apps Repository - Build the future of web-based computing.*