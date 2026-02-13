from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from app.services.drive import DriveService
import os

router = APIRouter()

@router.get("/list", response_model=List[Dict[str, Any]])
async def list_files(path: Optional[str] = Query(None)):
    """
    List files in a directory. 
    If path is None, returns available drives (or root on Linux).
    """
    try:
        # If path is provided but empty string, treat is as None (root)
        if path == "":
             path = None
             
        # On Windows, if we receive "C:" without slash, append it
        if path and path.endswith(":"):
            path += "\\"

        return DriveService.list_directory(path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Path not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
