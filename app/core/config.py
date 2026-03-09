from pydantic_settings import BaseSettings
import os
import secrets
from pathlib import Path



class Settings(BaseSettings):
    """
    Application settings.
    """
    APP_NAME: str = ("APP_NAME")
    DEBUG: bool = ("DEBUG").lower() == "true"
    SECRET_KEY: str = ("SECRET_KEY")
    ACCESS_PIN: str = ("ACCESS_PIN")
    
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
    READ_ONLY: bool = ("READ_ONLY").lower() == "true"
    
    # Path to the app-local trash directory
    TRASH_DIR: str = ("TRASH_DIR")
    
    class Config:
        env_file = ".env"
        extra = "ignore" # Allow extra fields in env file or ignored fields

settings = Settings()
