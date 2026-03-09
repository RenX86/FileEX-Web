# 📁 FileEX - Blazing Fast Network File Explorer

FileEX is a lightweight, high-performance web-based file explorer designed for local networks. It allows you to browse, preview, and manage your host computer's files from any device (phone, tablet, or another PC) on your Wi-Fi.

Built for speed and simplicity, FileEX avoids heavy frontend frameworks, delivering a "blazing fast" experience through **FastAPI** and **Vanilla JavaScript**.

---

## ✨ Key Features

### 🖼️ Real-Time Media Previews
* **Dynamic Thumbnails:** Instant 100x100 previews for images and videos using **Pillow** and **FFmpeg**.
* **Media Viewer:** High-performance modal for viewing images and streaming videos directly in the browser.
* **Touch & Keyboard Support:** Navigate through media in a folder using Arrow keys or touch-swipe gestures.

### 📦 Advanced Archive Engine
* **On-the-Fly Browsing:** Explore contents of `zip`, `7z`, `rar`, and `tar` files without extracting them.
* **Partial Extraction:** Stream or download a single file (like an image inside a 2GB zip) instantly.
* **Encrypted Archives:** Full support for password-protected 7z, rar, and zip files.
* **Gallery Mode:** View a thumbnail gallery of all media contained within an archive.

### 🗑️ Custom Trash System
* **Safe Deletion:** Files aren't permanently deleted; they are moved to a local `Trash` folder with detailed metadata.
* **One-Click Restore:** Restore items to their original location with a single click, even across different drives.
* **Metadata Tracking:** Records original path and deletion timestamp.

### 🔒 Security First
* **PIN Authentication:** Secure your file system with a configurable session-based PIN.
* **Read-Only Mode:** A global toggle to disable all write/delete operations for guest access.
* **Path Traversal Protection:** Rigorous validation prevents access to system-critical folders or directory traversal attacks.
* **Restricted Paths:** Hardcoded blocks for sensitive OS directories (e.g., `C:\Windows`, `/etc`).

### ⚡ Performance Optimized
* **Infinite Scroll:** Paginated directory listings for fast navigation through folders with thousands of files.
* **Low Footprint:** No build tools, no `node_modules` on the frontend, and minimal backend dependencies.
* **GZip Compression:** All API responses are compressed to save bandwidth on slow Wi-Fi.

---

## 🛠️ Tech Stack

* **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+), [Uvicorn](https://www.uvicorn.org/), [Pillow](https://python-pillow.org/), [FFmpeg](https://ffmpeg.org/).
* **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3 (Modern Flexbox/Grid).

---

## 🚀 Quick Start

### 1. Prerequisites
* **Python 3.9+**
* **FFmpeg** (Required for video thumbnails and streaming).
    * **Windows:** `choco install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/).
    * **Linux:** `sudo apt install ffmpeg`.

### 2. Local Installation
```bash
# Clone the repository
git clone https://github.com/RenX86/FileEX-Web.git
cd FileEX-Web

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env to set your SECRET_KEY and ACCESS_PIN
```

### 3. Run Application
**Windows (Convenience Script):**
```powershell
./FileEX.ps1
```
**Manual:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 6979 --reload
```

---

## 🐳 Docker Deployment

FileEX is fully Docker-ready for isolated environments.

**Using Docker Compose:**
```bash
docker-compose up -d
```
The application will be available at `http://localhost:6979`. You can map your host drives to the `/mnt` directory in the container via `docker-compose.yml`.

---

## ⚙️ Configuration (.env)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SECRET_KEY` | Key for session encryption (Required). | - |
| `ACCESS_PIN` | PIN required to access the dashboard. | `1234` |
| `READ_ONLY` | If `True`, blocks all delete/restore actions. | `True` |
| `TRASH_DIR` | Path to store deleted files and metadata. | `./Trash` |
| `DEBUG` | Enables FastAPI debug mode. | `False` |

---

## 📂 Project Architecture

```text
app/
├── api/             # API Router & Endpoints (Auth, Files, Archives)
├── core/            # Config, Constants, and Security Middleware
├── services/        # DriveService (FS logic, Trash, Drives)
├── utils/           # Security validation & Formatters
static/
├── js/modules/      # ES6 Modules (Actions, API, UI, Viewer)
├── css/modules/     # Modular CSS (Grid, Cards, Modals)
templates/           # Jinja2 Templates (Base, Login, Dashboard)
```

---

## ⚖️ License & Disclaimer
This tool is intended for **local network use only**. Exposing this to the public internet without additional security layers (like a Reverse Proxy with SSL) is not recommended.

Developed with ❤️ for speed.
