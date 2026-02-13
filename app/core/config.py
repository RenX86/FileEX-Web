from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Application settings.
    """
    APP_NAME: str = "FileEX"
    DEBUG: bool = True
    
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
    READ_ONLY: bool = True
    
    class Config:
        env_file = ".env"
        extra = "ignore" # Allow extra fields in env file or ignored fields

settings = Settings()
