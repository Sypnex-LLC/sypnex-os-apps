# Sypnex OS Development CLI 🚀

A unified command-line interface for Sypnex OS app development. No more remembering multiple scripts - one CLI to rule them all!

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

3. **Start developing:**
   ```bash
   cd devtools
   python sypnex.py config  # Verify configuration
   python sypnex.py create my_awesome_app
   python sypnex.py deploy app my_awesome_app
   ```

## 📋 Commands

### App Development
```bash
# Navigate to devtools directory first
cd devtools

# Create a new app
python sypnex.py create my_awesome_app

# Deploy an app for testing
python sypnex.py deploy app my_awesome_app

# Deploy to remote instance
python sypnex.py deploy app my_app --server https://your-instance.com/

# Deploy all apps
python sypnex.py deploy all

# Auto-deploy on file changes
python sypnex.py deploy app my_app --watch

# Package app for distribution
python sypnex.py pack my_awesome_app
```

### VFS (Script) Deployment
```bash
# Deploy Python script to VFS
python sypnex.py deploy vfs my_script.py

# Deploy to remote instance
python sypnex.py deploy vfs script.py --server https://your-instance.com/
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

- **Single entry point** - No more remembering multiple scripts
- **Consistent syntax** - Same flags and patterns everywhere
- **Centralized config** - JWT tokens and server URLs in .env file
- **Security** - .env file is gitignored, tokens never committed
- **Flexibility** - Override .env settings with command flags
- **Better UX** - Clear help messages and error handling

## 📁 Project Structure

```
sypnex-os-apps/
├── devtools/              # Development tools directory
│   ├── sypnex.py          # Main CLI entry point
│   ├── .env               # Your configuration (gitignored)
│   ├── .env.example       # Configuration template
│   ├── tools/             # Development tools (modular)
│   │   ├── dev_deploy.py  # App deployment
│   │   ├── vfs_deploy.py  # VFS script deployment
│   │   ├── pack_app.py    # App packaging
│   │   └── create_app.py  # App scaffolding
│   └── config/            # Configuration management
│       └── settings.py    # Centralized config loader
├── requirements.txt       # Python dependencies
└── [apps...]              # Your actual apps (flow_runner, etc.)
```

## 🔒 Security

- JWT tokens are stored in `.env` file (gitignored)
- Never commit tokens to version control
- Use different tokens for different environments
- Tokens have 1-year expiration for security

Happy app building! 🎉
