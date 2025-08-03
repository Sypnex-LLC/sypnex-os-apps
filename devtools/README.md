# Sypnex OS Development CLI 🚀

A unified command-line interface for Sypnex OS app development that's **100% decoupled** from project structure. Create apps anywhere, deploy from anywhere - no assumptions about file locations!

## ✨ Key Features

- **🎯 Explicit Paths** - Always specify exactly where your files are located
- **📁 No Structure Assumptions** - Create apps anywhere on your system
- **🔧 Single CLI** - One command interface for all development tasks
- **🔒 Secure Configuration** - JWT tokens in gitignored .env files
- **🌐 Multi-target Deployment** - Local or remote instance support
- **👀 Live Development** - Watch mode for auto-redeployment

## 🔧 Quick Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure your JWT token:**
   ```bash
   # Copy the template
   cp .env.example .env
   
   # Get your JWT token from System Settings > Developer Mode in Sypnex OS
   # Edit .env and set SYPNEX_DEV_TOKEN=your_jwt_token_here
   ```

3. **Start developing anywhere:**
   ```bash
   cd devtools
   python sypnex.py config  # Verify configuration
   python sypnex.py create my_awesome_app --output "C:\my_projects"
   python sypnex.py deploy app "C:\my_projects\my_awesome_app"
   ```

## 📋 Commands

All commands use **explicit paths** - no assumptions about where your files are located!

### App Development
```bash
# Navigate to devtools directory first
cd devtools

# Create a new app anywhere
python sypnex.py create my_awesome_app --output "C:\my_projects"
python sypnex.py create another_app --output "D:\dev\apps"

# Deploy an app using explicit path
python sypnex.py deploy app "C:\my_projects\my_awesome_app"
python sypnex.py deploy app "D:\dev\apps\another_app"

# Deploy to remote instance
python sypnex.py deploy app "C:\my_projects\my_app" --server https://your-instance.com/

# Deploy all apps from a directory
python sypnex.py deploy all "C:\my_projects"

# Auto-deploy on file changes (watch mode)
python sypnex.py deploy app "C:\my_projects\my_app" --watch

# Package app for distribution
python sypnex.py pack "C:\my_projects\my_awesome_app"
```

### VFS (Script) Deployment
```bash
# Deploy any Python script to VFS using explicit path
python sypnex.py deploy vfs "C:\my_scripts\my_script.py"
python sypnex.py deploy vfs "D:\tools\data_processor.py"

# Deploy to remote instance
python sypnex.py deploy vfs "C:\scripts\script.py" --server https://your-instance.com/
```

### Configuration Management
```bash
# Show current configuration
python sypnex.py config

# Set JWT token
python sypnex.py token set eyJhbGciOiJIUzI1NiIs...

# Show current token
python sypnex.py token get
```

## 🎯 Benefits

- **🎯 Explicit Paths** - Always specify exactly where your files are - no guessing!
- **📁 Location Independence** - Create and manage apps anywhere on your system
- **🔧 Single Entry Point** - No more remembering multiple scripts
- **📝 Consistent Syntax** - Same flags and patterns everywhere
- **⚙️ Centralized Config** - JWT tokens and server URLs in .env file
- **🔒 Security** - .env file is gitignored, tokens never committed
- **🔧 Flexibility** - Override .env settings with command flags
- **💫 Better UX** - Clear help messages and error handling

## 💡 Examples

### Working Across Different Locations
```bash
# Create apps in different locations
python sypnex.py create calculator --output "C:\work_projects"
python sypnex.py create todo_app --output "D:\personal_apps"
python sypnex.py create data_tool --output "\\server\shared\apps"

# Deploy from anywhere
python sypnex.py deploy app "C:\work_projects\calculator"
python sypnex.py deploy app "D:\personal_apps\todo_app"

# Deploy scripts from any location
python sypnex.py deploy vfs "C:\scripts\automation.py"
python sypnex.py deploy vfs "\\shared\tools\data_processor.py"

# Package apps from different drives
python sypnex.py pack "C:\work_projects\calculator"
python sypnex.py pack "D:\personal_apps\todo_app"
```

## 📁 Project Structure

The devtools are **completely decoupled** from your app structure:

```
anywhere_on_your_system/
├── sypnex-os-apps/
│   └── devtools/              # CLI tools location
│       ├── sypnex.py          # Main CLI entry point
│       ├── .env               # Your configuration (gitignored)
│       ├── .env.example       # Configuration template
│       ├── tools/             # Development tools (modular)
│       │   ├── dev_deploy.py  # App deployment
│       │   ├── vfs_deploy.py  # VFS script deployment
│       │   ├── pack_app.py    # App packaging
│       │   └── create_app.py  # App scaffolding
│       └── config/            # Configuration management
│           └── settings.py    # Centralized config loader
│
# Your apps can be ANYWHERE:
├── C:\work_projects\
│   ├── calculator/            # App created here
│   ├── todo_app/              # Another app
│   └── data_tool/             # Yet another app
├── D:\personal_apps\
│   └── game_tracker/          # Apps on different drive
├── \\server\shared\apps\
│   └── team_tool/             # Apps on network drive
└── C:\scripts\
    ├── automation.py          # Scripts for VFS deployment
    └── data_processor.py      # More scripts
```

**Key Points:**
- 🎯 **No assumptions** - CLI never assumes where your apps are
- 📁 **Full flexibility** - Create apps anywhere you want
- 🔧 **One CLI location** - Tools stay in devtools/, apps go anywhere
- 🌐 **Network support** - Works with network drives and UNC paths

## 🔒 Security

- JWT tokens are stored in `.env` file (gitignored)
- Never commit tokens to version control
- Use different tokens for different environments
- Tokens have 1-year expiration for security

Happy app building! 🎉
