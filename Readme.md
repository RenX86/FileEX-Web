# 📁 Local Network File Explorer

A blazing-fast, lightweight web application that allows you to browse your host computer's local file system from any device on your Wi-Fi network. 

Built with a minimal footprint: no heavy frontend frameworks, no complex build steps, just raw performance.

## 🚀 Tech Stack

**Backend:**
* **[FastAPI](https://fastapi.tiangolo.com/):** Modern, high-performance web framework for building APIs.
* **[Uvicorn](https://www.uvicorn.org/):** Lightning-fast ASGI web server.
* **Python `os` / `pathlib`:** For native, deeply-integrated file system reading.

**Frontend:**
* **HTML5:** Semantic structure.
* **CSS3:** Clean, custom styling for the file tree UI.
* **Vanilla JavaScript (ES6+):** Utilizes the native `fetch()` API for asynchronous lazy-loading of directories.

---

## 📂 Project Structure

```text
FileEX-Web/
│
├── app/                     # Backend Source Code
│   ├── __init__.py
│   ├── main.py              # Application Entry Point
│   │
│   ├── core/                # Core Configuration & Security
│   │   ├── config.py        # Environment variables & settings
│   │   └── security.py      # Auth & Permissions logic
│   │
│   ├── api/                 # API Routes (Endpoints)
│   │   ├── __init__.py
│   │   └── endpoints/
│   │       ├── files.py     # File browsing/download logic
│   │       └── auth.py      # Authentication routes
│   │
│   ├── services/            # Business Logic Layer
│   │   └── drive.py         # File system interaction logic
│   │
│   └── utils/               # Utility Functions
│       ├── formatters.py    # Size/Date string formatting
│       └── validators.py    # Path/Input validation
│
├── templates/               # HTML Templates (Jinja2)
│   ├── base.html            # Base layout
│   └── index.html           # Main dashboard
│
├── static/                  # Static Assets
│   ├── css/
│   │   ├── base.css         # Global styles
│   │   └── explorer.css     # File explorer specific styles
│   ├── js/                  # Vanilla JS (No build step required)
│   │   ├── api.js           # Fetch wrapper
│   │   └── explorer.js      # UI Logic
│   └── assets/              # Icons/Images
│
├── tests/                   # Test Suite
│   ├── __init__.py
│   └── test_api.py
│
├── .env.example             # Environment variable template
├── .gitignore
├── requirements.txt
├── Dockerfile               # Containerization
├── docker-compose.yml       # Orchestration
└── README.md
```

### Key Improvements:
1. **Separation of Concerns:** Logic is split into `core` (config), `api` (routes), and `services` (logic), preventing a monolithic `main.py`.
2. **Scalability:** Segregating API endpoints allows for easily adding new features (e.g., streaming, upload) without cluttering one file.
3. **Frontend Organization:** Splitting CSS/JS makes the frontend easier to maintain, even without a framework.
4. **Environment Configuration:** Explicit `.env` support ensures sensitive data (like secret keys) isn't hardcoded.
5. **Docker Ready:** Including `Dockerfile` and `docker-compose.yml` makes deployment seamless.
