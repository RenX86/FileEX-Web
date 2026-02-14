from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from app.services.drive import DriveService
import os
import platform
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image
import io
from app.utils.security import validate_path
from app.core.constants import IMAGE_EXTENSIONS

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
        if path and path.endswith(":") and platform.system() == "Windows":
            path += "\\"

        return DriveService.list_directory(path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Path not found")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except NotADirectoryError:
        raise HTTPException(status_code=400, detail="Path is not a directory")
    except Exception as e:
        # Log the exception here in a real app
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")

@router.get("/view")
async def view_file(path: str = Query(...)):
    """
    Stream a file for viewing (e.g., images, videos).
    """
    try:
        validate_path(path)
        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(path)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")

@router.get("/thumbnail")
async def get_thumbnail(path: str = Query(...)):
    """
    Generate a thumbnail for an image file.
    """
    try:
        validate_path(path)
        
        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Verify it's an image extension
        ext = path.split('.')[-1].lower()
        if ext not in IMAGE_EXTENSIONS:
             raise HTTPException(status_code=400, detail="Not a supported image type")

        # Open image
        try:
            img = Image.open(path)
            img.thumbnail((100, 100))
            
            buf = io.BytesIO()
            format = img.format or "JPEG"
            img.save(buf, format=format)
            buf.seek(0)
            
            return StreamingResponse(buf, media_type=f"image/{format.lower()}")
        except Exception as e:
            print(f"Thumbnail generation failed: {e}")
            # If thumbnail fails, maybe client handles it. 
            # Or we could return a default icon? 
            # Raising 500 allows client to fallback (onerror).
            raise HTTPException(status_code=500, detail="Failed to generate thumbnail")

    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
