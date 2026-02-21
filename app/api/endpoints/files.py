from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from app.services.drive import DriveService
from app.core.config import settings
import os
import platform
from fastapi.responses import FileResponse, StreamingResponse
from PIL import Image
import io
from app.utils.security import validate_path
from app.core.constants import IMAGE_EXTENSIONS, ARCHIVE_EXTENSIONS

router = APIRouter()

@router.get("/list")
async def list_files(path: Optional[str] = Query(None), skip: int = Query(0, ge=0), limit: int = Query(100, ge=1)):
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

        return DriveService.list_directory(path, skip=skip, limit=limit)
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
    Stream a file for viewing (e.g., images, videos, PDFs).
    """
    try:
        validate_path(path)
        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="File not found")
        stat = os.stat(path)
        return FileResponse(
            path,
            stat_result=stat,
            headers={"Cache-Control": "public, max-age=3600"}  # Cache 1 hour
        )
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
            
            return StreamingResponse(
                buf,
                media_type=f"image/{format.lower()}",
                headers={"Cache-Control": "public, max-age=86400"}  # Cache 1 day
            )
        except Exception as e:
            print(f"Thumbnail generation failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate thumbnail")

    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/archive")
async def list_archive(path: str = Query(...)):
    """
    List the contents of an archive file (zip, tar, gz, bz2).
    """
    try:
        validate_path(path)

        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="File not found")

        ext = path.split('.')[-1].lower()
        # Handle compound extensions like .tar.gz, .tar.bz2
        basename = os.path.basename(path).lower()

        entries = []

        if ext == 'zip':
            import zipfile
            if not zipfile.is_zipfile(path):
                raise HTTPException(status_code=400, detail="Not a valid zip file")
            with zipfile.ZipFile(path, 'r') as zf:
                for info in zf.infolist():
                    entries.append({
                        "name": info.filename,
                        "size": info.file_size,
                        "compressed": info.compress_size,
                        "is_dir": info.is_dir(),
                    })

        elif basename.endswith('.tar.gz') or basename.endswith('.tar.bz2') or ext in ('tar', 'gz', 'bz2'):
            import tarfile
            try:
                with tarfile.open(path, 'r:*') as tf:
                    for member in tf.getmembers():
                        entries.append({
                            "name": member.name,
                            "size": member.size,
                            "compressed": member.size,
                            "is_dir": member.isdir(),
                        })
            except tarfile.TarError:
                raise HTTPException(status_code=400, detail="Not a valid tar archive")

        elif ext == '7z':
            raise HTTPException(status_code=400, detail="7z format requires py7zr library (not installed)")

        elif ext == 'rar':
            raise HTTPException(status_code=400, detail="RAR format requires rarfile library (not installed)")

        else:
            raise HTTPException(status_code=400, detail="Unsupported archive format")

        # Sort: directories first, then files, both alphabetical
        entries.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

        from app.utils.formatters import format_size
        for entry in entries:
            entry["size_fmt"] = format_size(entry["size"]) if not entry["is_dir"] else "-"
            entry["compressed_fmt"] = format_size(entry["compressed"]) if not entry["is_dir"] else "-"

        return {
            "filename": os.path.basename(path),
            "total_files": sum(1 for e in entries if not e["is_dir"]),
            "total_dirs": sum(1 for e in entries if e["is_dir"]),
            "entries": entries
        }

    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read archive: {str(e)}")


@router.get("/archive/view")
async def view_archive_entry(path: str = Query(...), entry: str = Query(...)):
    """
    Extract and stream a single file from inside an archive (zip or tar).
    Used for previewing images/videos within archives.
    """
    import mimetypes as mt

    try:
        validate_path(path)

        if not os.path.isfile(path):
            raise HTTPException(status_code=404, detail="Archive not found")

        ext = path.split('.')[-1].lower()
        basename = os.path.basename(path).lower()
        data = None
        content_type = mt.guess_type(entry)[0] or "application/octet-stream"

        if ext == 'zip':
            import zipfile
            if not zipfile.is_zipfile(path):
                raise HTTPException(status_code=400, detail="Not a valid zip file")
            with zipfile.ZipFile(path, 'r') as zf:
                if entry not in zf.namelist():
                    raise HTTPException(status_code=404, detail="Entry not found in archive")
                data = zf.read(entry)

        elif basename.endswith('.tar.gz') or basename.endswith('.tar.bz2') or ext in ('tar', 'gz', 'bz2'):
            import tarfile
            try:
                with tarfile.open(path, 'r:*') as tf:
                    member = tf.getmember(entry)
                    f = tf.extractfile(member)
                    if f is None:
                        raise HTTPException(status_code=400, detail="Cannot extract this entry (directory or link)")
                    data = f.read()
            except KeyError:
                raise HTTPException(status_code=404, detail="Entry not found in archive")
            except tarfile.TarError:
                raise HTTPException(status_code=400, detail="Not a valid tar archive")
        else:
            raise HTTPException(status_code=400, detail="Unsupported archive format")

        return StreamingResponse(io.BytesIO(data), media_type=content_type)

    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract file: {str(e)}")

@router.delete("/delete")
async def delete_file(path: str = Query(...)):
    """
    Delete a file or list of files (move to app-local trash).
    """
    if settings.READ_ONLY:
         raise HTTPException(status_code=405, detail="Delete not allowed in Read-Only mode")
    
    try:
        validate_path(path)
        
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="Item not found")
            
        DriveService.delete_file(path)
        return {"detail": "Item moved to trash"}
        
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete item: {str(e)}")

@router.get("/trash", response_model=List[Dict[str, Any]])
async def list_trash():
    """
    List all items currently in the Trash.
    """
    try:
        return DriveService.list_trash()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list trash: {str(e)}")

@router.post("/trash/restore")
async def restore_trash_item(trash_id: str = Query(...)):
    """
    Restore an item from the Trash.
    """
    if settings.READ_ONLY:
         raise HTTPException(status_code=405, detail="Restore not allowed in Read-Only mode")
         
    try:
        DriveService.restore_file(trash_id)
        return {"detail": "Item restored successfully"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to restore item: {str(e)}")

@router.delete("/trash/permanent")
async def permanent_delete_trash_item(trash_id: str = Query(...)):
    """
    Permanently delete an item from the Trash.
    """
    if settings.READ_ONLY:
         raise HTTPException(status_code=405, detail="Permanent delete not allowed in Read-Only mode")
         
    try:
        DriveService.permanent_delete(trash_id)
        return {"detail": "Item permanently deleted"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to permanently delete item: {str(e)}")
