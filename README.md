# Sypnex OS Apps

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.7+](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](#contributing)

Official collection of applications and development tools for [Sypnex OS](https://github.com/Sypnex-LLC/sypnex-os) - the web-based operating system.

## 📖 For Developers

**👉 [Complete User App Development Guide](USER_APP_DEVELOPMENT_GUIDE.md)** - Comprehensive guide for creating apps on Sypnex OS

**Key Resources:**
- **[VS Code Extension](https://github.com/Sypnex-LLC/sypnex-os-vscode-extension)** - IntelliSense support for SypnexAPI (100+ methods)
- **[Core OS Repository](https://github.com/Sypnex-LLC/sypnex-os)** - Main Sypnex OS codebase


##  Quick Start

### Prerequisites
- [Sypnex OS](https://github.com/Sypnex-LLC/sypnex-os) running locally
- Python 3.7 or higher (for development tools)

### Create Your First App

```bash
# Navigate to development tools
cd devtools

# Configure your environment (one-time setup)
cp .env.example .env
# Edit .env and set your SYPNEX_DEV_TOKEN

# Create a new app
python sypnex.py create my_awesome_app --output "C:\my_projects"

# Deploy for testing
python sypnex.py deploy app "C:\my_projects\my_awesome_app"

# Package for distribution
python sypnex.py pack "C:\my_projects\my_awesome_app"
```

## 📋 App Structure

```
app_name/
├── app_name.app          # App metadata (JSON)
└── src/                  # Source files
    ├── index.html        # Main interface (content only)
    ├── style.css         # App-specific styling
    ├── main.js           # JavaScript logic
    └── ...               # Additional resources
```

**💡 Key Points:**
- Apps are sandboxed and use SypnexAPI for system integration
- HTML files should contain content only (no DOCTYPE, head, body)
- Access to 100+ API methods for OS integration

## 🤝 Contributing

We welcome contributions to the Sypnex OS Apps ecosystem!

### Getting Started

1. Fork this repository
2. Set up development tools: `cd devtools && cp .env.example .env`
3. Create a new app: `python sypnex.py create your_app_name --output "C:\your_projects"`
4. Follow our [Development Guide](USER_APP_DEVELOPMENT_GUIDE.md)
5. Submit a pull request

**👉 [Complete Contributing Guide](CONTRIBUTING.md)**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.