import os
import platform
import pathlib
from typing import List, Dict, Any, Union
from app.utils.formatters import format_size, format_timestamp
import shutil
import json
import uuid
from datetime import datetime
from app.core.config import settings

class DriveService:
    @staticmethod
    def get_drives() -> List[Dict[str, Any]]:
        """
        Get a list of available drives (Windows) or root (Unix).
        """
        import shutil
        drives = []
        if platform.system() == "Windows":
            # List all possible drive letters
            import string
            available_drives = [f"{d}:\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\")]
            for drive in available_drives:
                try:
                    usage = shutil.disk_usage(drive)
                    total = format_size(usage.total)
                    free = format_size(usage.free)
                    used_percent = round((usage.used / usage.total) * 100, 1)
                except Exception:
                    total = "Unknown"
                    free = "Unknown"
                    used_percent = 0

                drives.append({
                    "name": drive,
                    "path": drive,
                    "is_dir": True,
                    "type": "drive",
                    "stats": {
                        "total": total,
                        "free": free,
                        "used_percent": used_percent
                    }
                })
        else:
            # Unix/Docker: check /mnt for mounted host drives
            mnt = "/mnt"
            if os.path.isdir(mnt):
                subdirs = sorted([
                    d for d in os.listdir(mnt)
                    if os.path.isdir(os.path.join(mnt, d))
                ])
                for name in subdirs:
                    mount_path = os.path.join(mnt, name)
                    try:
                        usage = shutil.disk_usage(mount_path)
                        total = format_size(usage.total)
                        free = format_size(usage.free)
                        used_percent = round((usage.used / usage.total) * 100, 1)
                    except Exception:
                        total = "Unknown"
                        free = "Unknown"
                        used_percent = 0

                    drives.append({
                        "name": f"{name}:\\",
                        "path": mount_path,
                        "is_dir": True,
                        "type": "drive",
                        "stats": {
                            "total": total,
                            "free": free,
                            "used_percent": used_percent
                        }
                    })

            # Fallback: if no mounts found, show root
            if not drives:
                drives.append({
                    "name": "/",
                    "path": "/",
                    "is_dir": True,
                    "type": "drive"
                })
        return drives

    @staticmethod
    def list_directory(path: str) -> List[Dict[str, Any]]:
        """
        List contents of a directory.
        """
        if not path:
             return DriveService.get_drives()
        
        # Security Check
        from app.utils.security import validate_path
        validate_path(path)

        if not os.path.exists(path):
            raise FileNotFoundError(f"Path not found: {path}")
            
        if not os.path.isdir(path):
             raise NotADirectoryError(f"Path is not a directory: {path}")

        items = []
        try:
            with os.scandir(path) as it:
                for entry in it:
                    try:
                        stat = entry.stat()
                        item = {
                            "name": entry.name,
                            "path": entry.path,
                            "is_dir": entry.is_dir(),
                            "size": format_size(stat.st_size) if not entry.is_dir() else "-",
                            "modified": format_timestamp(stat.st_mtime),
                            "type": "folder" if entry.is_dir() else "file"
                        }
                        items.append(item)
                    except PermissionError:
                        # Skip files we don't have permission to access
                        continue
        except PermissionError:
            raise PermissionError(f"Permission denied: {path}")

        # Sort: Directories first, then files. Both alphabetical.
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))
        return items

    @staticmethod
    def _get_trash_dir() -> str:
        """Ensure TRASH_DIR exists and return its absolute path."""
        trash_dir = os.path.abspath(settings.TRASH_DIR)
        os.makedirs(trash_dir, exist_ok=True)
        return trash_dir

    @staticmethod
    def delete_file(path: str) -> None:
        """
        Move a file or directory to the app-local Trash directory along with metadata.
        """
        if not os.path.exists(path):
            raise FileNotFoundError(f"Path not found: {path}")
            
        trash_dir = DriveService._get_trash_dir()
        
        # Security check is done in the API endpoint before calling this
        try:
            # Generate a unique ID to prevent filename collisions in Trash
            trash_id = str(uuid.uuid4())
            original_name = os.path.basename(path)
            trashed_file_name = f"{trash_id}_{original_name}"
            trashed_file_path = os.path.join(trash_dir, trashed_file_name)
            meta_file_path = os.path.join(trash_dir, f"{trash_id}.meta.json")
            
            # Save metadata
            metadata = {
                "id": trash_id,
                "original_path": os.path.abspath(path),
                "original_name": original_name,
                "deleted_at": datetime.now().isoformat(),
                "is_dir": os.path.isdir(path)
            }
            
            # Move the actual file/folder
            shutil.move(path, trashed_file_path)
            
            # Write metadata file after successful move
            with open(meta_file_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4)
                
        except Exception as e:
            raise Exception(f"Failed to move item to trash: {str(e)}")

    @staticmethod
    def list_trash() -> List[Dict[str, Any]]:
        """
        List all items in the Trash directory based on metadata files.
        """
        trash_dir = DriveService._get_trash_dir()
        items = []
        
        try:
            for filename in os.listdir(trash_dir):
                if filename.endswith(".meta.json"):
                    meta_path = os.path.join(trash_dir, filename)
                    try:
                        with open(meta_path, "r", encoding="utf-8") as f:
                            meta = json.load(f)
                        
                        trashed_file_path = os.path.join(trash_dir, f"{meta['id']}_{meta['original_name']}")
                        
                        # Add stats if the file still exists in trash
                        if os.path.exists(trashed_file_path):
                            stat = os.stat(trashed_file_path)
                            meta["size"] = format_size(stat.st_size) if not meta.get("is_dir", False) else "-"
                            items.append(meta)
                        else:
                            # Orphaned metadata file
                            os.remove(meta_path)
                    except Exception:
                        continue
        except FileNotFoundError:
             pass # Trash dir newly created or doesn't exist
             
        # Sort by deletion time descending (newest first)
        items.sort(key=lambda x: x.get("deleted_at", ""), reverse=True)
        
        # Format dates for UI
        for item in items:
             if "deleted_at" in item:
                  try:
                       dt = datetime.fromisoformat(item["deleted_at"])
                       item["deleted_at_fmt"] = dt.strftime("%Y-%m-%d %H:%M:%S")
                  except:
                       item["deleted_at_fmt"] = item["deleted_at"]
                       
        return items

    @staticmethod
    def restore_file(trash_id: str) -> None:
        """
        Restore a file from Trash to its original location.
        """
        trash_dir = DriveService._get_trash_dir()
        meta_path = os.path.join(trash_dir, f"{trash_id}.meta.json")
        
        if not os.path.exists(meta_path):
             raise FileNotFoundError(f"Trash metadata not found for ID: {trash_id}")
             
        with open(meta_path, "r", encoding="utf-8") as f:
             meta = json.load(f)
             
        trashed_file_path = os.path.join(trash_dir, f"{trash_id}_{meta['original_name']}")
        original_path = meta['original_path']
        
        if not os.path.exists(trashed_file_path):
             raise FileNotFoundError(f"Trashed file not found in Trash folder")
             
        # Ensure target directory exists
        os.makedirs(os.path.dirname(original_path), exist_ok=True)
        
        # Move back
        try:
             shutil.move(trashed_file_path, original_path)
             # Remove metadata
             os.remove(meta_path)
        except Exception as e:
             raise Exception(f"Failed to restore item: {str(e)}")

    @staticmethod
    def permanent_delete(trash_id: str) -> None:
        """
        Permanently delete a file from Trash.
        """
        trash_dir = DriveService._get_trash_dir()
        meta_path = os.path.join(trash_dir, f"{trash_id}.meta.json")
        
        if not os.path.exists(meta_path):
             raise FileNotFoundError(f"Trash metadata not found for ID: {trash_id}")
             
        with open(meta_path, "r", encoding="utf-8") as f:
             meta = json.load(f)
             
        trashed_file_path = os.path.join(trash_dir, f"{trash_id}_{meta['original_name']}")
        
        try:
             if os.path.exists(trashed_file_path):
                  if meta.get("is_dir", False):
                       shutil.rmtree(trashed_file_path)
                  else:
                       os.remove(trashed_file_path)
             # Remove metadata
             if os.path.exists(meta_path):
                 os.remove(meta_path)
        except Exception as e:
             raise Exception(f"Failed to permanently delete item: {str(e)}")

drive_service = DriveService()
