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
    if path_norm.startswith('\\\\?\\') or path_norm.startswith('\\\\.\\'):
        path_norm = path_norm[4:]
    
    for restricted in settings.RESTRICTED_PATHS:
        restricted_norm = os.path.normpath(restricted).lower()
        if path_norm == restricted_norm or path_norm.startswith(restricted_norm + os.sep):
            raise PermissionError(f"Access to {path} is restricted.")

    # Resolve to real absolute path to catch symlinks and traversal
    resolved = os.path.normpath(os.path.realpath(path)).lower()
    if resolved.startswith('\\\\?\\') or resolved.startswith('\\\\.\\'):
        resolved = resolved[4:]
        
    if resolved != path_norm and not (path_norm == "" or path_norm == "."):
        raise PermissionError(f"Access to {path} is restricted (path traversal detected).")
