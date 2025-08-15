# Sypnex OS Development CLI

A unified command-line interface for Sypnex OS app development. Create and deploy apps from any location on your system.

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
   python sypnex.py create my_awesome_app --output "C:\my_projects"
   python sypnex.py deploy app "C:\my_projects\my_awesome_app"
   ```

## 📋 Commands

### App Development
```bash
# Navigate to devtools directory first
cd devtools

# Create a new app
python sypnex.py create my_awesome_app --output "C:\my_projects"

# Deploy an app
python sypnex.py deploy app "C:\my_projects\my_awesome_app"

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
# Deploy Python scripts to VFS
python sypnex.py deploy vfs "C:\my_scripts\my_script.py"

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

## 🔒 Security

- JWT tokens are stored in `.env` file (gitignored)
- Never commit tokens to version control
- Tokens have 1-year expiration for security
