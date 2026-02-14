# 📁 FileEX — Local Network File Explorer

A blazing-fast, lightweight web application that allows you to browse your host computer's local file system from any device on your Wi-Fi network. 

Built with a minimal footprint: no heavy frontend frameworks, no complex build steps, just raw performance.

## 🚀 Tech Stack

**Backend:**
* **[FastAPI](https://fastapi.tiangolo.com/):** Modern, high-performance web framework for building APIs.
* **[Uvicorn](https://www.uvicorn.org/):** Lightning-fast ASGI web server.
* **Python `os` / `pathlib`:** For native, deeply-integrated file system reading.

**Frontend:**
* **HTML5:** Semantic structure.
* **CSS3:** Clean, neo-brutalist styling with Space Grotesk font.
* **Vanilla JavaScript (ES6+):** Utilizes the native `fetch()` API for asynchronous lazy-loading of directories.

---

## 📂 Project Structure

```text
FileEX-Web/
│
├── app/                         # Backend Source Code
│   ├── __init__.py
│   ├── main.py                  # Application Entry Point
│   │
│   ├── core/                    # Core Configuration & Security
│   │   ├── __init__.py
│   │   ├── config.py            # Environment variables & settings
│   │   └── constants.py         # Shared constants (file extensions)
│   │
│   ├── api/                     # API Routes (Endpoints)
│   │   ├── __init__.py
│   │   ├── router.py            # API router aggregator
│   │   └── endpoints/
│   │       ├── __init__.py
│   │       ├── files.py         # File browsing/streaming/thumbnail
│   │       └── auth.py          # PIN authentication routes
│   │
│   ├── services/                # Business Logic Layer
│   │   ├── __init__.py
│   │   └── drive.py             # File system interaction logic
│   │
│   └── utils/                   # Utility Functions
│       ├── __init__.py
│       ├── formatters.py        # Size/Date string formatting
│       └── security.py          # Path validation & traversal protection
│
├── templates/                   # HTML Templates (Jinja2)
│   ├── base.html                # Base layout
│   ├── index.html               # Main file explorer dashboard
│   └── login.html               # PIN authentication page
│
├── static/                      # Static Assets
│   ├── css/
│   │   └── style.css            # Neo-brutalist theme styles
│   └── js/
│       └── app.js               # UI Logic (vanilla JS)
│
├── .env.example                 # Environment variable template
├── .gitignore
├── requirements.txt             # Pinned Python dependencies
└── Readme.md
```

## 🔒 Security Features

1. **PIN Authentication:** Session-based PIN gate protects all routes. Configure via `ACCESS_PIN` in `.env`.
2. **Read-Only Mode:** Middleware blocks all write HTTP methods (hardcoded `READ_ONLY=True`).
3. **Restricted Paths:** System-critical directories (Windows, Program Files, /etc, /sys, etc.) are blocked.
4. **Path Traversal Protection:** Uses `os.path.realpath()` to detect and reject traversal/symlink attacks.
5. **XSS Prevention:** All filenames are sanitized before DOM injection via `escapeHtml()`.

## ⚡ Quick Start

1. Clone the repo and create a virtual environment:
   ```bash
   git clone https://github.com/RenX86/FileEX-Web.git
   cd FileEX-Web
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Copy and configure environment:
   ```bash
   cp .env.example .env
   # Edit .env to set your SECRET_KEY and ACCESS_PIN
   ```

4. Run the server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

5. Open `http://<your-ip>:8000` from any device on your network.

## 🏗️ Architecture Highlights

1. **Separation of Concerns:** Logic is split into `core` (config), `api` (routes), and `services` (logic).
2. **Proper Python Packaging:** All directories have `__init__.py` files.
3. **Cross-Platform:** Drive detection handles both Windows and Unix systems.
4. **Zero Build Tooling:** No npm, no webpack — just raw HTML/CSS/JS.
5. **Shared Constants:** File extension lists defined once in `constants.py` and `app.js`.
6. **Environment Configuration:** `.env` support ensures sensitive data isn't hardcoded.
