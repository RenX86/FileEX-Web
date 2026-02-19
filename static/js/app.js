const API_BASE = '/api/files';
const listContainer = document.getElementById('file-list');
const breadcrumbContainer = document.getElementById('breadcrumb');

// Supported media extensions (single source of truth)
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico'];
const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'];
const ARCHIVE_EXTS = ['zip', 'tar', 'gz', 'bz2', '7z', 'rar'];

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
        listContainer.innerHTML = '<div class="loading" style="background:var(--card-bg);color:var(--text-color);">📂 NO FILES HERE</div>';
        return;
    }

    items.forEach((item, index) => {
        const card = document.createElement('div');
        // Cycle through 5 color variants (1-5)
        const colorIndex = (index % 5) + 1;
        const colorClass = `color-${colorIndex}`;

        card.className = `file-card ${colorClass}${item.type === 'drive' ? ' drive-card' : ''}`;
        card.setAttribute('data-file-path', item.path);
        card.onclick = () => handleItemClick(item);

        const ext = item.name.split('.').pop().toLowerCase();
        let iconContent;

        if (!item.is_dir && IMAGE_EXTS.includes(ext)) {
            const viewUrl = `/api/files/thumbnail?path=${encodeURIComponent(item.path)}`;
            iconContent = `<img src="${viewUrl}" class="file-thumbnail" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.onerror=null;this.parentNode.innerHTML='📄'">`;
        } else {
            const fileExt = item.name.split('.').pop().toLowerCase();
            if (fileExt === 'pdf') {
                iconContent = '📕';
            } else if (ARCHIVE_EXTS.includes(fileExt)) {
                iconContent = '📦';
            } else {
                iconContent = item.is_dir ? (item.type === 'drive' ? '💿' : '📁') : '📄';
            }
        }

        // Determine meta badge class based on file type
        let metaClass = 'file-meta';
        if (item.type === 'drive') metaClass += ' file-meta--drive';
        else if (item.is_dir) metaClass += ' file-meta--dir';
        else if (IMAGE_EXTS.includes(ext)) metaClass += ' file-meta--image';
        else if (VIDEO_EXTS.includes(ext)) metaClass += ' file-meta--video';
        else if (ARCHIVE_EXTS.includes(ext)) metaClass += ' file-meta--archive';

        // Build meta text
        let metaText = '';
        if (item.stats) {
            metaText = `${item.stats.free} free of ${item.stats.total}`;
        } else if (item.size && item.size !== '-') {
            metaText = item.size;
        } else if (item.type === 'drive') {
            metaText = 'DRIVE';
        } else if (item.is_dir) {
            metaText = 'DIR';
        }

        // Build drive progress bar for drive cards
        let progressHtml = '';
        if (item.type === 'drive' && item.stats) {
            const freeMatch = item.stats.free.match(/([\d.]+)/);
            const totalMatch = item.stats.total.match(/([\d.]+)/);
            if (freeMatch && totalMatch) {
                const free = parseFloat(freeMatch[1]);
                const total = parseFloat(totalMatch[1]);
                // Convert to same unit if needed (both should be GB from API)
                const usedPct = Math.round(((total - free) / total) * 100);
                let usageTier = 'usage-low';
                if (usedPct > 90) usageTier = 'usage-critical';
                else if (usedPct > 75) usageTier = 'usage-high';
                else if (usedPct > 50) usageTier = 'usage-mid';
                progressHtml = `
                    <div class="drive-progress">
                        <div class="drive-progress-fill ${usageTier}" style="width:${usedPct}%"></div>
                    </div>
                    <div class="drive-progress-text">${usedPct}% USED</div>
                `;
            }
        }

        card.innerHTML = `
            <div class="icon">${iconContent}</div>
            <div class="file-info">
                <span class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                <div class="${metaClass}">${metaText}</div>
            </div>
            ${progressHtml}
            ${!item.is_dir ? `<div class="file-delete-btn" onclick="confirmDelete(event, '${escapeHtml(item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'"))}', '${escapeHtml(item.name.replace(/'/g, "\\'"))}')">
                <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>` : ''}
        `;

        card.style.animationDelay = `${index * 30}ms`;
        listContainer.appendChild(card);
    });

    // Show recent files strip on home page (when showing drives)
    if (items.length > 0 && items[0].type === 'drive') {
        renderRecentFiles();
    }
}

function handleItemClick(item) {
    if (item.is_dir) {
        loadPath(item.path);
    } else {
        // Check for media types
        const ext = item.name.split('.').pop().toLowerCase();

        const mediaContainer = document.getElementById('media-container');
        const modal = document.getElementById('media-modal');
        const viewUrl = `/api/files/view?path=${encodeURIComponent(item.path)}`;

        if (IMAGE_EXTS.includes(ext)) {
            mediaContainer.innerHTML = `<img src="${viewUrl}" alt="${escapeHtml(item.name)}">`;
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            addRecentFile(item);
        } else if (VIDEO_EXTS.includes(ext)) {
            let mimeType = `video/${ext}`;
            if (ext === 'mov') mimeType = 'video/mp4'; // Try mp4 for mov
            if (ext === 'mkv') mimeType = 'video/webm'; // Try webm for mkv (often works)

            mediaContainer.innerHTML = `
                <video controls autoplay muted playsinline style="max-width:100%; max-height:80vh;">
                    <source src="${viewUrl}" type="${mimeType}">
                    Your browser does not support the video tag.
                </video>`;
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            addRecentFile(item);
        } else if (ext === 'pdf') {
            mediaContainer.innerHTML = `
                <iframe src="${viewUrl}" style="width:80vw; height:85vh; border:none; background:#fff;"></iframe>`;
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
        } else if (ARCHIVE_EXTS.includes(ext)) {
            openArchiveViewer(item);
        } else {
            showToast(`📄 ${item.name} — Preview not supported`);
        }
    }
}

async function openArchiveViewer(item) {
    const mediaContainer = document.getElementById('media-container');
    const modal = document.getElementById('media-modal');

    mediaContainer.innerHTML = '<div class="loading">READING ARCHIVE...</div>';
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    try {
        const url = `${API_BASE}/archive?path=${encodeURIComponent(item.path)}`;
        const response = await fetch(url);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to read archive');
        }

        const data = await response.json();
        renderArchiveTable(data, item.path);

    } catch (error) {
        mediaContainer.innerHTML = `<div class="loading" style="background:var(--c-pink); color:#000;">ERROR: ${escapeHtml(error.message)}</div>`;
    }
}

function renderArchiveTable(data, archivePath) {
    const mediaContainer = document.getElementById('media-container');
    const previewableExts = [...IMAGE_EXTS, ...VIDEO_EXTS, 'pdf'];
    const escapedPath = archivePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const mediaCount = data.entries.filter(e => {
        const ext = e.name.split('.').pop().toLowerCase();
        return !e.is_dir && [...IMAGE_EXTS, ...VIDEO_EXTS].includes(ext);
    }).length;
    const galleryBtn = mediaCount > 0 ? `<button class="archive-mode-btn active">📋 LIST</button><button class="archive-mode-btn" onclick="renderArchiveGallery(document.getElementById('media-container')._archiveData, document.getElementById('media-container')._archivePath)">🖼️ GALLERY (${mediaCount})</button>` : '';

    let html = `
        <div class="archive-viewer">
            <div class="archive-header">
                <h2>📦 ${escapeHtml(data.filename)}</h2>
                <div class="archive-header-actions">
                    ${galleryBtn}
                    <span class="archive-stats">${data.total_dirs} folders · ${data.total_files} files</span>
                </div>
            </div>
            <div class="archive-table-wrap">
                <table class="archive-table">
                    <thead>
                        <tr><th>Name</th><th>Size</th><th>Compressed</th></tr>
                    </thead>
                    <tbody>`;

    for (const entry of data.entries) {
        const entryExt = entry.name.split('.').pop().toLowerCase();
        const isPreviewable = !entry.is_dir && previewableExts.includes(entryExt);
        const icon = entry.is_dir ? '📁' : (isPreviewable ? '👁️' : '📄');
        const clickClass = isPreviewable ? 'archive-previewable' : '';
        const clickAttr = isPreviewable
            ? `onclick="previewArchiveEntry('${archivePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${entry.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"`
            : '';

        html += `
            <tr class="${entry.is_dir ? 'archive-dir' : ''} ${clickClass}" ${clickAttr}>
                <td>${icon} ${escapeHtml(entry.name)}</td>
                <td>${entry.size_fmt}</td>
                <td>${entry.compressed_fmt}</td>
            </tr>`;
    }

    html += `</tbody></table></div></div>`;
    mediaContainer.innerHTML = html;

    // Store archive data for back navigation
    mediaContainer._archiveData = data;
    mediaContainer._archivePath = archivePath;
}

function renderArchiveGallery(data, archivePath) {
    const mediaContainer = document.getElementById('media-container');
    const escapedPath = archivePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const mediaEntries = data.entries.filter(e => {
        const ext = e.name.split('.').pop().toLowerCase();
        return !e.is_dir && [...IMAGE_EXTS, ...VIDEO_EXTS].includes(ext);
    });

    let html = `
        <div class="archive-viewer archive-gallery-mode">
            <div class="archive-header">
                <h2>📦 ${escapeHtml(data.filename)}</h2>
                <div class="archive-header-actions">
                    <button class="archive-mode-btn" onclick="renderArchiveTable(document.getElementById('media-container')._archiveData, document.getElementById('media-container')._archivePath)">📋 LIST</button>
                    <button class="archive-mode-btn active">🖼️ GALLERY (${mediaEntries.length})</button>
                    <span class="archive-stats">${mediaEntries.length} media</span>
                </div>
            </div>
            <div class="archive-gallery-wrap">
                <div class="archive-gallery-feed">`;

    for (const entry of mediaEntries) {
        const ext = entry.name.split('.').pop().toLowerCase();
        const viewUrl = `${API_BASE}/archive/view?path=${encodeURIComponent(archivePath)}&entry=${encodeURIComponent(entry.name)}`;
        const isVideo = VIDEO_EXTS.includes(ext);
        const shortName = entry.name.split('/').pop();

        html += `
            ${isVideo
                ? `<div class="archive-feed-item archive-feed-video-item" onclick="playFeedVideo(this, event)">
                <video src="${viewUrl}" muted preload="metadata" class="archive-feed-media"></video>
                <div class="archive-gallery-play">▶</div>
                <div class="archive-feed-label">${escapeHtml(shortName)}</div>
               </div>`
                : `<div class="archive-feed-item" onclick="previewArchiveEntry('${escapedPath}', '${entry.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">
                <img src="${viewUrl}" alt="${escapeHtml(shortName)}" class="archive-feed-media" loading="lazy">
                <div class="archive-feed-label">${escapeHtml(shortName)}</div>
               </div>`}`;
    }

    html += `</div></div></div>`;
    mediaContainer.innerHTML = html;

    mediaContainer._archiveData = data;
    mediaContainer._archivePath = archivePath;
}

function playFeedVideo(container, event) {
    event.stopPropagation();
    const video = container.querySelector('video');
    const playBtn = container.querySelector('.archive-gallery-play');
    if (playBtn) playBtn.style.display = 'none';
    video.controls = true;
    video.muted = false;
    video.play();
}

function previewArchiveEntry(archivePath, entryName) {
    const mediaContainer = document.getElementById('media-container');
    const ext = entryName.split('.').pop().toLowerCase();
    const viewUrl = `${API_BASE}/archive/view?path=${encodeURIComponent(archivePath)}&entry=${encodeURIComponent(entryName)}`;

    const backBtn = `<div class="archive-back-bar">
        <button onclick="renderArchiveTable(document.getElementById('media-container')._archiveData, document.getElementById('media-container')._archivePath)" class="archive-back-btn">← BACK TO ARCHIVE</button>
        <span class="archive-preview-name">${escapeHtml(entryName)}</span>
    </div>`;

    if (IMAGE_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `${backBtn}<img src="${viewUrl}" alt="${escapeHtml(entryName)}" style="max-width:100%; max-height:75vh; display:block; background:#000;">`;
    } else if (VIDEO_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `${backBtn}
            <video controls autoplay muted playsinline style="max-width:100%; max-height:75vh; background:#000;">
                <source src="${viewUrl}" type="video/${ext === 'mov' ? 'mp4' : ext}">
            </video>`;
    } else if (ext === 'pdf') {
        mediaContainer.innerHTML = `${backBtn}<iframe src="${viewUrl}" style="width:80vw; height:75vh; border:none; background:#fff;"></iframe>`;
    }
}

function closeModal() {
    const modal = document.getElementById('media-modal');
    const mediaContainer = document.getElementById('media-container');
    modal.style.display = 'none';
    mediaContainer.innerHTML = '';
    document.body.classList.remove('modal-open');
}

function showToast(message) {
    const existing = document.querySelector('.file-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'file-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Recent files — stored in localStorage
function addRecentFile(item) {
    const ext = item.name.split('.').pop().toLowerCase();
    const isImage = IMAGE_EXTS.includes(ext);
    const isVideo = VIDEO_EXTS.includes(ext);
    if (!isImage && !isVideo) return;

    let recent = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    // Remove duplicate if exists
    recent = recent.filter(r => r.path !== item.path);
    // Add to front
    recent.unshift({ name: item.name, path: item.path, isImage, isVideo });
    // Keep max 20
    if (recent.length > 20) recent = recent.slice(0, 20);
    localStorage.setItem('recentFiles', JSON.stringify(recent));
}

function renderRecentFiles() {
    const recent = JSON.parse(localStorage.getItem('recentFiles') || '[]');
    if (recent.length === 0) return;

    // Remove existing section if any
    const existing = document.querySelector('.recent-files-section');
    if (existing) existing.remove();

    const section = document.createElement('div');
    section.className = 'recent-files-section';

    let thumbsHtml = '';
    for (const file of recent) {
        const thumbUrl = file.isImage
            ? `/api/files/thumbnail?path=${encodeURIComponent(file.path)}`
            : '';
        const shortName = file.name.split('/').pop().split('\\').pop();
        const escapedPath = file.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        thumbsHtml += `
            <div class="recent-file-thumb" onclick="openRecentFile('${escapedPath}', '${shortName.replace(/'/g, "\\'")}')" title="${escapeHtml(shortName)}">
                ${file.isImage
                ? `<img src="${thumbUrl}" alt="${escapeHtml(shortName)}" loading="lazy">`
                : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2rem;background:#222;">🎬</div>`}
                <div class="recent-file-name">${escapeHtml(shortName)}</div>
            </div>`;
    }

    section.innerHTML = `
        <div class="recent-files-header">
            <span class="recent-files-title">🕑 Recently Viewed</span>
            <button class="recent-files-clear" onclick="clearRecentFiles()">CLEAR</button>
        </div>
        <div class="recent-files-strip">${thumbsHtml}</div>
    `;

    // Insert before the file list
    listContainer.parentNode.insertBefore(section, listContainer);
}

function clearRecentFiles() {
    localStorage.removeItem('recentFiles');
    const section = document.querySelector('.recent-files-section');
    if (section) section.remove();
}

function openRecentFile(filePath, fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const viewUrl = `/api/files/view?path=${encodeURIComponent(filePath)}`;
    const mediaContainer = document.getElementById('media-container');
    const modal = document.getElementById('media-modal');

    if (IMAGE_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `<img src="${viewUrl}" alt="${escapeHtml(fileName)}">`;
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    } else if (VIDEO_EXTS.includes(ext)) {
        let mimeType = `video/${ext}`;
        if (ext === 'mov') mimeType = 'video/mp4';
        if (ext === 'mkv') mimeType = 'video/webm';
        mediaContainer.innerHTML = `
            <video controls autoplay muted playsinline style="max-width:100%; max-height:80vh;">
                <source src="${viewUrl}" type="${mimeType}">
            </video>`;
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}


function confirmDelete(event, path, name) {
    event.stopPropagation();
    const modal = document.getElementById('media-modal');
    const mediaContainer = document.getElementById('media-container');

    mediaContainer.innerHTML = `
        <div class="modal-content danger-modal">
            <div class="danger-modal-icon">💣</div>
            <h2>DELETE ITEM?</h2>
            <p>Move <strong>${name}</strong> to Trash?</p>
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeModal()">NO, KEEP IT</button>
                <button class="btn-confirm" onclick="deleteItem('${path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">YES, DELETE</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

async function deleteItem(path) {
    const mediaContainer = document.getElementById('media-container');
    mediaContainer.innerHTML = '<div class="loading" style="background:var(--c-orange); color:#fff;">DELETING...</div>';

    try {
        const response = await fetch(`${API_BASE}/delete?path=${encodeURIComponent(path)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to delete item');
        }

        closeModal();
        showToast('🗑️ Item moved to Recycle Bin');

        // Remove item from DOM without refreshing
        const escapedPath = path.replace(/\\/g, '\\');
        // We need to match the data-file-path attribute. 
        // Since we stored it raw, we can try to find it.
        // We can also just find by the onclick handler or add a data attribute (done in previous step).

        const card = document.querySelector(`.file-card[data-file-path="${path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.transform = 'scale(0.8)';
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
        } else {
            // Fallback if DOM element not found
            loadPath(currentPath);
        }

    } catch (error) {
        mediaContainer.innerHTML = `
            <div class="modal-content danger-modal" style="background:var(--card-bg); padding:2rem; text-align:center;">
                <h2>⚠️ ERROR</h2>
                <p>${escapeHtml(error.message)}</p>
                <button class="btn-cancel" onclick="closeModal()">CLOSE</button>
            </div>
        `;
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('media-modal');
    if (event.target === modal) {
        closeModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('media-modal');
        if (modal && modal.style.display !== 'none') {
            closeModal();
        }
    }
});

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
