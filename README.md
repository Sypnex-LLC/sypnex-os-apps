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
- **� LLM Chat** - AI chat interface for interacting with language models

### Development Tools
- **📦 Pack App** - Package development apps for distribution
- **🚀 Dev Deploy** - Quick deployment tool for development iterations
- **🔧 Create App** - Scaffold new applications with proper structure

## 🚀 Quick Start

### Prerequisites
- [Sypnex OS](https://github.com/Sypnex-LLC/sypnex-os) running locally
- Python 3.7 or higher (for development tools)

### Create Your First App

```bash
# 1. Navigate to development tools
cd devtools

# 2. Configure your environment (one-time setup)
cp .env.example .env
# Edit .env and set your SYPNEX_DEV_TOKEN

# 3. Create a new app anywhere you want
python sypnex.py create my_awesome_app --output "C:\my_projects"

# 4. Edit your app files:
# C:\my_projects\my_awesome_app\my_awesome_app.app  # App metadata
# C:\my_projects\my_awesome_app\src\index.html      # App interface  
# C:\my_projects\my_awesome_app\src\style.css       # App styles
# C:\my_projects\my_awesome_app\src\script.js       # App logic

# 5. Deploy for testing (using explicit path)
python sypnex.py deploy app "C:\my_projects\my_awesome_app"

# 6. Package for distribution
python sypnex.py pack "C:\my_projects\my_awesome_app"
```

**👉 [Complete Development CLI Guide](devtools/README.md)** - Unified CLI for all development tools

**👉 [Complete Development Guide](USER_APP_DEVELOPMENT_GUIDE.md)** - Detailed instructions, examples, and best practices

## 🛠️ Development Tools

This repository includes a powerful unified CLI for streamlined app development:

**👉 [Development CLI](devtools/README.md)** - Complete guide to the unified development tools

### Quick Development Workflow

```bash
# Navigate to development tools
cd devtools

# 1. Create - Generate new app template anywhere
python sypnex.py create my_app --output "C:\your_projects"

# 2. Develop - Edit files in your app's src/ directory

# 3. Test - Quick development deployment with explicit path
python sypnex.py deploy app "C:\your_projects\my_app"

# 4. Package - Create distributable packages  
python sypnex.py pack "C:\your_projects\my_app"

# 5. Deploy files to VFS - Deploy scripts or files
python sypnex.py deploy vfs "C:\your_scripts\script.py"

# 6. Deploy all apps from a directory
python sypnex.py deploy all "C:\your_projects"
```

**Key Benefits:**
- **Single CLI** - One command interface for all development tasks
- **100% Decoupled** - Create apps anywhere, no project structure assumptions
- **Explicit Paths** - Always specify exactly where your files are
- **Centralized Config** - JWT tokens and settings in .env file  
- **Auto-deploy** - Watch mode for live development
- **Multi-target** - Deploy to local or remote instances
- **Secure** - Tokens never committed to version control

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
2. Navigate to devtools: `cd devtools`
3. Set up your environment: `cp .env.example .env` and configure
4. Create a new app: `python sypnex.py create your_app_name --output "C:\your_projects"`
5. Develop your app following our [Development Guide](USER_APP_DEVELOPMENT_GUIDE.md)
6. Test using: `python sypnex.py deploy app "C:\your_projects\your_app_name"`
7. Submit a pull request

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