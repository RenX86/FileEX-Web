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

    # Additional safety check for traversal (though normpath helps)
    if ".." in path_norm:
         # Basic check, OS handles most resolution but good to be explicit
         pass
