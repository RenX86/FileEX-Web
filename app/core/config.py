from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Application settings.
    """
    APP_NAME: str = "FileEX"
    DEBUG: bool = True
    
    # We can add more settings here (e.g., allowed directories)
    
    class Config:
        env_file = ".env"

settings = Settings()
