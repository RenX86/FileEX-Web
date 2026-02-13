import datetime

def format_size(size_bytes: int) -> str:
    """
    Convert bytes to a human-readable string (e.g., 1.5 MB).
    """
    if size_bytes == 0:
        return "0 B"
    
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = 0
    while size_bytes >= 1024 and i < len(size_name) - 1:
        size_bytes /= 1024.0
        i += 1
        
    return f"{size_bytes:.2f} {size_name[i]}"

def format_timestamp(timestamp: float) -> str:
    """
    Convert a unix timestamp to a readable date string.
    """
    dt = datetime.datetime.fromtimestamp(timestamp)
    return dt.strftime("%Y-%m-%d %H:%M:%S")
