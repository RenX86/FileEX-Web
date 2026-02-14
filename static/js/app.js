const API_BASE = '/api/files';
const listContainer = document.getElementById('file-list');
const breadcrumbContainer = document.getElementById('breadcrumb');

let currentPath = '';

// Sanitize strings before injecting into innerHTML to prevent XSS
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadPath('');
});

async function loadPath(path) {
    currentPath = path;
    updateBreadcrumbs(path);

    listContainer.innerHTML = '<div class="loading">LOADING...</div>';

    try {
        const url = path ? `${API_BASE}/list?path=${encodeURIComponent(path)}` : `${API_BASE}/list`;
        const response = await fetch(url);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to fetch files');
        }

        const items = await response.json();
        renderItems(items);
    } catch (error) {
        listContainer.innerHTML = `<div class="loading" style="background:var(--c-pink); color:#000;">ERROR: ${error.message}</div>`;
    }
}

function renderItems(items) {
    listContainer.innerHTML = '';

    if (items.length === 0) {
        listContainer.innerHTML = '<div class="loading" style="background:#fff;">FOLDER IS EMPTY</div>';
        return;
    }

    items.forEach((item, index) => {
        const card = document.createElement('div');
        // Randomly assign a color class (1-4) or 0 for white
        // Use index to determinstically assign colors so they don't jump around on re-render
        const colorIndex = (index % 4) + 1;
        const colorClass = `color-${colorIndex}`;

        card.className = `file-card ${colorClass}`;
        card.onclick = () => handleItemClick(item);

        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico'];
        const ext = item.name.split('.').pop().toLowerCase();
        let iconContent;

        if (!item.is_dir && imageExts.includes(ext)) {
            const viewUrl = `/api/files/thumbnail?path=${encodeURIComponent(item.path)}`;
            iconContent = `<img src="${viewUrl}" class="file-thumbnail" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.onerror=null;this.parentNode.innerHTML='📄'">`;
        } else {
            iconContent = item.is_dir ? (item.type === 'drive' ? '💿' : '📁') : '📄';
        }

        card.innerHTML = `
            <div class="icon">${iconContent}</div>
            <div class="file-info">
                <span class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                <div class="file-meta">
                    ${item.stats ? `${item.stats.free} free of ${item.stats.total}` : (item.size && item.size !== '-' ? item.size : (item.type === 'drive' ? 'DRIVE' : (item.is_dir ? 'DIR' : '')))}
                </div>
            </div>
        `;

        listContainer.appendChild(card);
    });
}

function handleItemClick(item) {
    if (item.is_dir) {
        loadPath(item.path);
    } else {
        // Check for media types
        const ext = item.name.split('.').pop().toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico'];
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'];

        const mediaContainer = document.getElementById('media-container');
        const modal = document.getElementById('media-modal');
        const viewUrl = `/api/files/view?path=${encodeURIComponent(item.path)}`;

        if (imageExts.includes(ext)) {
            mediaContainer.innerHTML = `<img src="${viewUrl}" alt="${escapeHtml(item.name)}">`;
            modal.style.display = 'flex'; // Use flex for centering
        } else if (videoExts.includes(ext)) {
            let mimeType = `video/${ext}`;
            if (ext === 'mov') mimeType = 'video/mp4'; // Try mp4 for mov
            if (ext === 'mkv') mimeType = 'video/webm'; // Try webm for mkv (often works)

            mediaContainer.innerHTML = `
                <video controls autoplay muted playsinline style="max-width:100%; max-height:80vh;">
                    <source src="${viewUrl}" type="${mimeType}">
                    Your browser does not support the video tag.
                </video>`;
            modal.style.display = 'flex'; // Use flex for centering
        } else {
            alert(`FILE: ${escapeHtml(item.name)}\nSIZE: ${item.stats ? item.stats.total : item.size}`);
        }
    }
}

function closeModal() {
    const modal = document.getElementById('media-modal');
    const mediaContainer = document.getElementById('media-container');
    modal.style.display = 'none';
    mediaContainer.innerHTML = ''; // Stop video playback
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('media-modal');
    if (event.target === modal) {
        closeModal();
    }
}

function updateBreadcrumbs(path) {
    if (!path) {
        breadcrumbContainer.innerHTML = '<span class="crumb home-crumb active" onclick="loadPath(\'\')">HOME</span>';
        return;
    }

    let html = '<span class="crumb home-crumb" onclick="loadPath(\'\')">HOME</span>';

    // Split path by / or \
    const parts = path.split(/[/\\]/).filter(p => p);
    let currentBuild = '';

    parts.forEach((part, index) => {
        // Reconstruct path cumulatively
        if (index === 0 && part.includes(':')) {
            currentBuild = part + '\\'; // Ensure drive has slash
        } else {
            // If previous part ended with slash, don't add another
            // But here we rely on simple concatenation logic for now
            currentBuild = currentBuild ? (currentBuild.endsWith('\\') ? currentBuild + part : currentBuild + '\\' + part) : part;
        }

        const isActive = index === parts.length - 1;
        const activeClass = isActive ? 'active' : '';
        const escapedPath = currentBuild.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        // Only make it clickable if not active
        const clickAction = isActive ? '' : `onclick="loadPath('${escapedPath}')"`;

        html += `<span class="crumb ${activeClass}" ${clickAction}>${part}</span>`;
    });

    breadcrumbContainer.innerHTML = html;
}
