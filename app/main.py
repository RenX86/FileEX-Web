import sys
import os

# Add parent directory to path to allow running as script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.core.config import settings

from app.api.router import api_router

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG
)

# Ensure mimetypes are known
import mimetypes
mimetypes.init()
mimetypes.add_type('video/mp4', '.mp4')
mimetypes.add_type('video/webm', '.webm')
mimetypes.add_type('video/ogg', '.ogg')
mimetypes.add_type('video/quicktime', '.mov')
mimetypes.add_type('video/x-matroska', '.mkv')
mimetypes.add_type('video/x-msvideo', '.avi')

# Middleware to block write operations
@app.middleware("http")
async def read_only_middleware(request: Request, call_next):
    if settings.READ_ONLY and request.method not in ["GET", "HEAD", "OPTIONS"]:
        # Allow static files or specific exceptions if needed, but for strict mode, block all.
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=405, content={"detail": "Method Not Allowed: Server is in Read-Only Mode"})
    response = await call_next(request)
    return response

# Mount static files (CSS, JS, Images)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Include API Router
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
