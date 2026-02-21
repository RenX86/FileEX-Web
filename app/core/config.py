from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv
import secrets
from pathlib import Path

load_dotenv()

class Settings(BaseSettings):
    """
    Application settings.
    """
    APP_NAME: str = os.getenv("APP_NAME")
    DEBUG: bool = os.getenv("DEBUG").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ACCESS_PIN: str = os.getenv("ACCESS_PIN")
    
    # Security: Paths that are strictly forbidden
    RESTRICTED_PATHS: list = [
        "C:\\Windows", 
        "C:\\Program Files", 
        "C:\\Program Files (x86)", 
        "C:\\$Recycle.Bin", 
        "C:\\System Volume Information",
        "/etc", "/var", "/usr", "/sys", "/proc", "/dev", "/root"
    ]
    
    # Hardcoded Read-Only Mode
    READ_ONLY: bool = os.getenv("READ_ONLY", "True").lower() == "true"
    
    # Path to the app-local trash directory
    TRASH_DIR: str = os.getenv("TRASH_DIR", "./Trash")
    
    class Config:
        env_file = ".env"
        extra = "ignore" # Allow extra fields in env file or ignored fields

settings = Settings()
