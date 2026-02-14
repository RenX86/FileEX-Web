import os
from app.core.config import settings

def validate_path(path: str) -> None:
    """
    Validates if a path is accessible (not restricted).
    Raises PermissionError if restricted.
    """
    if not path:
        return

    path_norm = os.path.normpath(path).lower()
    
    for restricted in settings.RESTRICTED_PATHS:
        restricted_norm = os.path.normpath(restricted).lower()
        if path_norm == restricted_norm or path_norm.startswith(restricted_norm + os.sep):
            raise PermissionError(f"Access to {path} is restricted.")

    # Resolve to real absolute path to catch symlinks and traversal
    resolved = os.path.normpath(os.path.realpath(path)).lower()
    if resolved != path_norm:
        raise PermissionError(f"Access to {path} is restricted (path traversal detected).")
