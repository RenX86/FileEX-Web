import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from app.core.config import settings

from app.api.router import api_router
from app.api.endpoints import auth

# Resolve project root for static/template paths (works from any CWD)
BASE_DIR = Path(__file__).resolve().parent.parent

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

# Routes that don't require authentication
PUBLIC_PATHS = ("/login", "/static")


class SecurityMiddleware(BaseHTTPMiddleware):
    """Combined auth + read-only enforcement middleware."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Skip auth for public paths (login page, static assets)
        if not any(path.startswith(p) for p in PUBLIC_PATHS):
            if not request.session.get("authenticated"):
                if path.startswith("/api/"):
                    return JSONResponse(status_code=401, content={"detail": "Not authenticated"})
                return RedirectResponse(url="/login", status_code=302)

        # Block write operations in read-only mode (POST allowed for login form)
        if settings.READ_ONLY and request.method not in ("GET", "HEAD", "OPTIONS", "POST"):
            return JSONResponse(status_code=405, content={"detail": "Method Not Allowed: Server is in Read-Only Mode"})

        response = await call_next(request)
        return response


# Middleware stack (LIFO order)
app.add_middleware(SecurityMiddleware)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(GZipMiddleware, minimum_size=500)  # Compress responses > 500 bytes

# Mount static files (CSS, JS, Images)
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

# Templates
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Include Auth routes (at root level, not under /api)
app.include_router(auth.router)

# Include API Router
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "read_only": settings.READ_ONLY})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=6979, reload=True)
