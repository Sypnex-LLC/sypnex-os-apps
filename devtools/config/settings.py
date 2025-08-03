"""
Configuration management for Sypnex OS development tools

Loads configuration from .env file and provides centralized access to settings.
"""

import os
from typing import Optional

# Try to load python-dotenv if available
try:
    from dotenv import load_dotenv
    load_dotenv()
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False
    print("💡 Tip: Install python-dotenv for .env file support: pip install python-dotenv")

class SypnexConfig:
    """Centralized configuration for Sypnex OS development tools"""
    
    def __init__(self):
        # Load .env file if python-dotenv is available
        if HAS_DOTENV:
            load_dotenv()
    
    @property
    def dev_token(self) -> Optional[str]:
        """Get the developer JWT token"""
        return os.getenv('SYPNEX_DEV_TOKEN')
    
    @property
    def server_url(self) -> str:
        """Get the default server URL"""
        return os.getenv('SYPNEX_SERVER_URL', 'http://localhost:5000')
    
    @property
    def instance_name(self) -> str:
        """Get the instance name"""
        return os.getenv('SYPNEX_INSTANCE_NAME', 'local-dev')
    
    def get_auth_headers(self) -> dict:
        """Get headers with authentication token"""
        token = self.dev_token
        if not token:
            raise ValueError(
                "❌ No JWT token configured!\n"
                "Please:\n"
                "1. Copy .env.example to .env\n"
                "2. Get your JWT token from System Settings > Developer Mode\n"
                "3. Set SYPNEX_DEV_TOKEN in .env file"
            )
        
        return {
            'X-Session-Token': token,
            'Content-Type': 'application/json'
        }
    
    def validate_config(self) -> bool:
        """Validate that required configuration is present"""
        if not self.dev_token:
            print("❌ Missing SYPNEX_DEV_TOKEN in .env file")
            return False
        
        print(f"✅ Configuration loaded:")
        print(f"   Server: {self.server_url}")
        print(f"   Instance: {self.instance_name}")
        print(f"   Token: {self.dev_token[:20] if self.dev_token else 'None'}...")
        return True

# Global config instance
config = SypnexConfig()
