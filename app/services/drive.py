import os
import platform
import pathlib
from typing import List, Dict, Any, Union
from app.utils.formatters import format_size, format_timestamp

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
            # Unix-like systems
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
        
        # Security check: prevent directory traversal if needed, 
        # but for a local file explorer, we usually want full access.
        # However, we must ensure the path exists.
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

drive_service = DriveService()
