import time
from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from app.core.config import settings

router = APIRouter()
templates = Jinja2Templates(directory="templates")

LOGIN_ATTEMPTS = {}

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Render the PIN login page."""
    # If already authenticated, redirect to home
    if request.session.get("authenticated"):
        return RedirectResponse(url="/", status_code=302)
    return templates.TemplateResponse("login.html", {"request": request, "error": None})


@router.post("/login")
async def login(request: Request, pin: str = Form(...)):
    """Validate PIN and set session."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    global LOGIN_ATTEMPTS
    # Cleanup attempts older than 60 seconds
    LOGIN_ATTEMPTS = {ip: attempts for ip, attempts in LOGIN_ATTEMPTS.items() if now - attempts[-1] < 60}
    
    attempts = LOGIN_ATTEMPTS.get(client_ip, [])
    if len(attempts) >= 5:
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "TOO MANY ATTEMPTS. PLEASE WAIT."},
            status_code=429
        )

    if pin == settings.ACCESS_PIN:
        request.session["authenticated"] = True
        if client_ip in LOGIN_ATTEMPTS:
            del LOGIN_ATTEMPTS[client_ip]
        return RedirectResponse(url="/", status_code=302)
        
    attempts.append(now)
    LOGIN_ATTEMPTS[client_ip] = attempts

    return templates.TemplateResponse(
        "login.html",
        {"request": request, "error": "WRONG PIN. TRY AGAIN."},
        status_code=401
    )


@router.get("/logout")
async def logout(request: Request):
    """Clear session and redirect to login."""
    request.session.clear()
    return RedirectResponse(url="/login", status_code=302)
