# 📁 FileEX - Blazing Fast Network File Explorer

FileEX is a lightweight, high-performance web-based file explorer designed for local networks. It allows you to browse, preview, and manage your host computer's files from any device (phone, tablet, or another PC) on your Wi-Fi.

Built for speed and simplicity, FileEX avoids heavy frontend frameworks, delivering a "blazing fast" experience through **FastAPI** and **Vanilla JavaScript** wrapped in a sleek **Cyberpunk Aesthetic**.

---

## ✨ Key Features

### 🎨 Subtle Cyberpunk UI & Desktop Sidebar
* **Dark Mode Void:** Deep obsidian backgrounds with sharp electric cyan accents and glassmorphism elements.
* **Desktop Sidebar:** A fixed navigation sidebar with a dynamically loaded list of your local drives (C:\, D:\, etc.) for instant access, resembling a native file manager.
* **Storage Dashboard:** A dedicated dashboard view showing drive usage progress bars, free space stats, and quick system utilities (Trash, Clear Recents, Lock Terminal).

### 🖼️ Real-Time Media Previews
* **Dynamic Thumbnails:** Instant 100x100 previews for images and videos using **Pillow** and **FFmpeg**.
* **Plyr Media Engine:** Integrated **Plyr** video and audio player for a modern, 100% offline media playback experience.
* **Pan & Zoom Controls:** Use your mouse wheel to zoom into images, and click-and-drag to pan around. Keyboard shortcuts (`+`, `-`, `0`) are also supported.
* **Glassmorphism Toolbar:** Hovering action toolbar for zooming, rotating, and instantly downloading media.
* **Touch & Keyboard Support:** Navigate through media in a folder using Arrow keys or touch-swipe gestures. Swipe down to dismiss the viewer on mobile devices.

### 📝 Text & Code Previewer
* **Raw Source View:** Click any code or text file (`.txt`, `.json`, `.py`, `.js`, etc.) to view its raw source code inside a clean `<pre>` block.
* **Visual Render Mode:** For HTML, SVG, or Markdown files, click the "RENDER PREVIEW" button to view the visual output safely inside a strict `sandbox=""` iframe that blocks all scripts and forms.

### 📦 Advanced Archive Engine
* **On-the-Fly Browsing:** Explore contents of `zip`, `7z`, `rar`, and `tar` files without extracting them.
* **Partial Extraction:** Stream or download a single file (like an image inside a 2GB zip) instantly.
* **Live Search:** Instantly filter archive contents using the sticky search bar.
* **Masonry Gallery:** View a beautiful, responsive multi-column grid of all images and videos inside the archive.
* **Archive Navigation:** Seamlessly navigate to the "next" or "previous" image/video while inside the archive using UI arrows or keyboard keys.
* **Path Highlighting & Icons:** Distinct color-coded icons for different file types and faded directory paths for effortless scanning.
* **Download Archive:** Instantly download the entire archive via a quick-action button in the header.

### 🗑️ Custom Trash System
* **Safe Deletion:** Files aren't permanently deleted; they are moved to a local `Trash` folder with detailed metadata.
* **One-Click Restore:** Restore items to their original location with a single click, even across different drives.
* **Metadata Tracking:** Records original path and deletion timestamp.

### 🔒 Security First
* **Strict Configuration:** No hardcoded secrets. The app refuses to boot without properly configured `SECRET_KEY` and `ACCESS_PIN` environment variables.
* **Brute-Force Protection:** The `/login` endpoint features IP-based rate limiting to block brute-force PIN guessing.
* **Path Traversal Blocking:** Advanced path normalization strictly blocks attempts to escape restricted directories, including bypassing via Windows UNC paths (`\\?\`).
* **Safe Archive Extraction:** Archive streaming uses memory-efficient generators to prevent RAM exhaustion (DoS attacks) when previewing massive files.
* **Read-Only Mode:** A global toggle to disable all write/delete operations for guest access.

### ⚡ Performance Optimized
* **Infinite Scroll:** Paginated directory listings for fast navigation through massive folders.
* **Low Footprint:** No build tools, no `node_modules` on the frontend, and minimal backend dependencies.
* **GZip Compression:** All API responses are compressed to save bandwidth on slow Wi-Fi.

---

## 🛠️ Tech Stack

* **Backend:** [FastAPI](https://fastapi.tiangolo.com/) (Python 3.9+), [Uvicorn](https://www.uvicorn.org/), [Pillow](https://python-pillow.org/), [FFmpeg](https://ffmpeg.org/).
* **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3 (Modern Flexbox/Grid), Plyr.

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
# Edit .env to set your SECRET_KEY and ACCESS_PIN (Required)
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
| `ACCESS_PIN` | PIN required to access the dashboard (Required). | - |
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
