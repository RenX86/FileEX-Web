import { API_BASE, IMAGE_EXTS, VIDEO_EXTS, AUDIO_EXTS, TEXT_EXTS } from './config.js?v=21';
import { escapeHtml } from './utils.js?v=21';
import { mediaContainer, modal } from './ui.js?v=21';
import { addRecentFile } from './store.js?v=21';
import { getCurrentItems } from './actions.js?v=21';

let currentMediaItem = null;
let currentArchiveEntryName = null;

// Zoom & Pan Variables
let zoomLevel = 1;
let isPanning = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;

// Touch Swipe Navigation Variables
let touchStartX = 0;
let touchStartY = 0;

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex') {
        if (currentMediaItem) {
            if (e.key === 'ArrowLeft') navigateMedia(-1);
            if (e.key === 'ArrowRight') navigateMedia(1);
        } else if (currentArchiveEntryName) {
            if (e.key === 'ArrowLeft') navigateArchiveMedia(-1);
            if (e.key === 'ArrowRight') navigateArchiveMedia(1);
        }
        
        if (currentMediaItem || currentArchiveEntryName || document.getElementById('viewer-image-wrapper')) {
            if (e.key === '=' || e.key === '+') viewerZoom(0.2);
            if (e.key === '-') viewerZoom(-0.2);
            if (e.key === '0') viewerReset();
        }
    }
});

// Touch Navigation
document.addEventListener('touchstart', (e) => {
    if (modal.style.display === 'flex' && (currentMediaItem || currentArchiveEntryName)) {
        touchStartX = e.touches[0].screenX;
        touchStartY = e.touches[0].screenY;
    }
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (modal.style.display === 'flex' && (currentMediaItem || currentArchiveEntryName) && e.changedTouches.length > 0) {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        handleSwipeGesture(touchStartX, touchStartY, touchEndX, touchEndY);
    }
}, { passive: true });

function handleSwipeGesture(startX, startY, endX, endY) {
    // Disable swipe to navigate if we are zoomed in (so panning works)
    if (zoomLevel > 1) return;

    const diffX = endX - startX;
    const diffY = endY - startY;
    const thresholdX = 50; 
    const thresholdY = 100;

    // Horizontal Swipe
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > thresholdX) {
            const step = diffX > 0 ? -1 : 1;
            if (currentArchiveEntryName) navigateArchiveMedia(step);
            else if (currentMediaItem) navigateMedia(step);
        }
    } else {
        // Vertical Swipe (Swipe down to dismiss)
        if (diffY > thresholdY) {
            closeModal();
        }
    }
}

// Zoom & Pan Events
function attachZoomPanEvents() {
    const wrapper = document.getElementById('viewer-image-wrapper');
    const img = document.getElementById('viewer-image');
    if (!wrapper || !img) return;

    // Mouse Wheel Zoom
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        viewerZoom(delta);
    }, { passive: false });

    // Mouse Pan
    wrapper.addEventListener('mousedown', (e) => {
        if (zoomLevel <= 1) return;
        isPanning = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        wrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        e.preventDefault();
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        applyTransform();
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            wrapper.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
        }
    });
}

export function viewerZoom(amount) {
    zoomLevel += amount;
    if (zoomLevel < 0.5) zoomLevel = 0.5;
    if (zoomLevel > 5) zoomLevel = 5;

    const wrapper = document.getElementById('viewer-image-wrapper');
    if (wrapper) {
        wrapper.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
    }
    
    // Reset translation if zoomed out completely
    if (zoomLevel <= 1) {
        translateX = 0;
        translateY = 0;
    }
    applyTransform();
}

export function viewerReset() {
    zoomLevel = 1;
    translateX = 0;
    translateY = 0;
    const wrapper = document.getElementById('viewer-image-wrapper');
    if (wrapper) wrapper.style.cursor = 'default';
    applyTransform();
}

export function viewerRotate() {
    const img = document.getElementById('viewer-image');
    if (!img) return;
    let currentRotation = parseInt(img.getAttribute('data-rotation') || '0');
    currentRotation = (currentRotation + 90) % 360;
    img.setAttribute('data-rotation', currentRotation.toString());
    applyTransform();
}

function applyTransform() {
    const img = document.getElementById('viewer-image');
    if (img) {
        const rotation = parseInt(img.getAttribute('data-rotation') || '0');
        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${zoomLevel}) rotate(${rotation}deg)`;
    }
}

function initPlayer() {
    if (window.plyrInstance) {
        try { window.plyrInstance.destroy(); } catch (e) {}
        window.plyrInstance = null;
    }
    const mediaEl = document.querySelector('#media-container video, #media-container audio');
    if (mediaEl && window.Plyr) {
        window.plyrInstance = new window.Plyr(mediaEl, { 
            autoplay: true,
            iconUrl: '/static/plyr.svg'
        });
    }
}

export function closeModal() {
    if (window.plyrInstance) {
        try { window.plyrInstance.destroy(); } catch (e) {}
        window.plyrInstance = null;
    }

    // If viewing an entry inside an archive, go back to the archive view
    if (currentArchiveEntryName && mediaContainer._archiveData) {
        currentArchiveEntryName = null;
        viewerReset();
        if (window.renderArchiveTable) {
            window.renderArchiveTable(mediaContainer._archiveData, mediaContainer._archivePath);
        }
        return;
    }

    modal.classList.remove('danger-active');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1';
        mediaContainer.innerHTML = '';
        document.body.classList.remove('modal-open');
        currentMediaItem = null;
        currentArchiveEntryName = null;
        viewerReset();
    }, 200);
}

export function openMedia(item) {
    currentMediaItem = item;
    currentArchiveEntryName = null;
    const ext = item.name.split('.').pop().toLowerCase();
    const viewUrl = `${API_BASE}/view?path=${encodeURIComponent(item.path)}`;
    const downloadUrl = `${API_BASE}/download?path=${encodeURIComponent(item.path)}`;

    // Navigation buttons HTML
    const navHtml = `
        <div class="media-nav prev" onclick="window.navigateMedia(-1)">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </div>
        <div class="media-nav next" onclick="window.navigateMedia(1)">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
    `;

    // Action Toolbar HTML
    const toolbarHtml = `
        <div class="viewer-toolbar">
            <div class="viewer-title">${escapeHtml(item.name)}</div>
            <div class="viewer-actions">
                <button onclick="window.viewerZoom(0.2)" title="Zoom In">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button onclick="window.viewerZoom(-0.2)" title="Zoom Out">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button onclick="window.viewerRotate()" title="Rotate">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
                <button onclick="window.viewerReset()" title="Reset View">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </button>
                <div class="toolbar-divider"></div>
                <a href="${downloadUrl}" download="${escapeHtml(item.name)}" class="viewer-btn-link" title="Download">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </a>
            </div>
        </div>
    `;

    if (IMAGE_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            ${navHtml}
            <div class="viewer-image-wrapper" id="viewer-image-wrapper">
                <img src="${viewUrl}" alt="${escapeHtml(item.name)}" id="viewer-image" data-rotation="0">
            </div>
        `;
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        document.body.classList.add('modal-open');
        viewerReset();
        setTimeout(attachZoomPanEvents, 50);
        addRecentFile(item);
    } else if (VIDEO_EXTS.includes(ext)) {
        let mimeType = `video/${ext}`;
        if (ext === 'mov') mimeType = 'video/mp4';
        if (ext === 'mkv') mimeType = 'video/webm';

        mediaContainer.innerHTML = `
            ${toolbarHtml}
            ${navHtml}
            <div class="viewer-video-wrapper">
                <video controls autoplay playsinline>
                    <source src="${viewUrl}" type="${mimeType}">
                    Your browser does not support the video tag.
                </video>
            </div>`;
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        document.body.classList.add('modal-open');
        addRecentFile(item);
    } else if (ext === 'pdf') {
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            <div class="viewer-pdf-wrapper">
                <iframe src="${viewUrl}"></iframe>
            </div>`;
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        document.body.classList.add('modal-open');
    } else if (AUDIO_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            ${navHtml}
            <div class="viewer-video-wrapper" style="height:auto; padding:2rem;">
                <audio controls autoplay style="width:100%; max-width:500px;">
                    <source src="${viewUrl}" type="audio/${ext}">
                </audio>
            </div>`;
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        document.body.classList.add('modal-open');
        addRecentFile(item);
    } else if (TEXT_EXTS.includes(ext)) {
        const isRenderable = ['html', 'htm', 'svg', 'md'].includes(ext);
        const renderBtn = isRenderable ? `<button onclick="window.renderTextIframe('${viewUrl}')" class="archive-mode-btn" style="margin-left:auto; border-color:var(--c-cyan); color:var(--c-cyan);">RENDER PREVIEW</button>` : '';
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            ${navHtml}
            <div class="viewer-pdf-wrapper text-viewer-wrapper" style="background: var(--surface-low); padding:1.5rem; overflow:auto; display:flex; flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; width:100%; flex-shrink:0;">
                    <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted);">RAW SOURCE</span>
                    ${renderBtn}
                </div>
                <pre style="margin:0; white-space:pre-wrap; font-family:var(--font-mono); font-size:0.85rem; color:var(--text-color); width:100%;" id="text-preview-container">Loading source...</pre>
            </div>`;
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        document.body.classList.add('modal-open');
        addRecentFile(item);

        fetch(viewUrl)
            .then(res => res.text())
            .then(text => {
                const el = document.getElementById('text-preview-container');
                if(el) el.textContent = text;
            })
            .catch(err => {
                const el = document.getElementById('text-preview-container');
                if(el) el.textContent = 'Failed to load text: ' + err.message;
            });
    }
    setTimeout(initPlayer, 50);
}

export function navigateMedia(step) {
    if (!currentMediaItem) return;

    const items = getCurrentItems();
    if (!items || items.length === 0) return;

    const navigableItems = items.filter(i => {
        if (i.is_dir) return false;
        const ext = i.name.split('.').pop().toLowerCase();
        return IMAGE_EXTS.includes(ext) || VIDEO_EXTS.includes(ext);
    });

    if (navigableItems.length <= 1) return;

    const currentIndex = navigableItems.findIndex(i => i.path === currentMediaItem.path);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex + step;
    if (nextIndex < 0) nextIndex = navigableItems.length - 1;
    if (nextIndex >= navigableItems.length) nextIndex = 0;

    openMedia(navigableItems[nextIndex]);
}

export function navigateArchiveMedia(step) {
    if (!currentArchiveEntryName) return;

    const data = mediaContainer._archiveData;
    const archivePath = mediaContainer._archivePath;
    if (!data || !data.entries) return;

    const navigableItems = data.entries.filter(e => {
        if (e.is_dir) return false;
        const ext = e.name.split('.').pop().toLowerCase();
        return IMAGE_EXTS.includes(ext) || VIDEO_EXTS.includes(ext);
    });

    if (navigableItems.length <= 1) return;

    const currentIndex = navigableItems.findIndex(e => e.name === currentArchiveEntryName);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex + step;
    if (nextIndex < 0) nextIndex = navigableItems.length - 1;
    if (nextIndex >= navigableItems.length) nextIndex = 0;

    previewArchiveEntry(archivePath, navigableItems[nextIndex].name);
}

export function openRecentFile(filePath, fileName) {
    currentMediaItem = null;
    currentArchiveEntryName = null;
    const ext = fileName.split('.').pop().toLowerCase();
    const viewUrl = `${API_BASE}/view?path=${encodeURIComponent(filePath)}`;
    const downloadUrl = `${API_BASE}/download?path=${encodeURIComponent(filePath)}`;

    const toolbarHtml = `
        <div class="viewer-toolbar">
            <div class="viewer-title">${escapeHtml(fileName)}</div>
            <div class="viewer-actions">
                <button onclick="window.viewerZoom(0.2)" title="Zoom In">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button onclick="window.viewerZoom(-0.2)" title="Zoom Out">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button onclick="window.viewerRotate()" title="Rotate">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                </button>
                <button onclick="window.viewerReset()" title="Reset View">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </button>
                <div class="toolbar-divider"></div>
                <a href="${downloadUrl}" download="${escapeHtml(fileName)}" class="viewer-btn-link" title="Download">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </a>
            </div>
        </div>
    `;

    if (IMAGE_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            <div class="viewer-image-wrapper" id="viewer-image-wrapper">
                <img src="${viewUrl}" alt="${escapeHtml(fileName)}" id="viewer-image" data-rotation="0">
            </div>
        `;
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        document.body.classList.add('modal-open');
        viewerReset();
        setTimeout(attachZoomPanEvents, 50);
    } else if (VIDEO_EXTS.includes(ext)) {
        let mimeType = `video/${ext}`;
        if (ext === 'mov') mimeType = 'video/mp4';
        if (ext === 'mkv') mimeType = 'video/webm';
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            <div class="viewer-video-wrapper">
                <video controls autoplay playsinline>
                    <source src="${viewUrl}" type="${mimeType}">
                </video>
            </div>
        `;
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        document.body.classList.add('modal-open');
    }
    setTimeout(initPlayer, 50);
}

export function previewArchiveEntry(archivePath, entryName) {
    currentMediaItem = null;
    currentArchiveEntryName = entryName;
    const ext = entryName.split('.').pop().toLowerCase();
    const pwdStr = mediaContainer._archivePassword ? `&password=${encodeURIComponent(mediaContainer._archivePassword)}` : '';
    const viewUrl = `${API_BASE}/archive/view?path=${encodeURIComponent(archivePath)}&entry=${encodeURIComponent(entryName)}${pwdStr}`;

    const navHtml = `
        <div class="media-nav prev" onclick="window.navigateArchiveMedia(-1)">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </div>
        <div class="media-nav next" onclick="window.navigateArchiveMedia(1)">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
    `;

    const toolbarHtml = `
        <div class="viewer-toolbar">
            <button onclick="window.renderArchiveTable(document.getElementById('media-container')._archiveData, document.getElementById('media-container')._archivePath)" class="archive-back-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                BACK
            </button>
            <div class="viewer-title">${escapeHtml(entryName)}</div>
            <div class="viewer-actions">
                <button onclick="window.viewerZoom(0.2)" title="Zoom In">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button onclick="window.viewerZoom(-0.2)" title="Zoom Out">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                </button>
                <button onclick="window.viewerReset()" title="Reset View">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </button>
            </div>
        </div>
    `;

    if (IMAGE_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            ${navHtml}
            <div class="viewer-image-wrapper" id="viewer-image-wrapper">
                <img src="${viewUrl}" alt="${escapeHtml(entryName)}" id="viewer-image" data-rotation="0">
            </div>
        `;
        viewerReset();
        setTimeout(attachZoomPanEvents, 50);
    } else if (VIDEO_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            ${navHtml}
            <div class="viewer-video-wrapper">
                <video controls autoplay playsinline>
                    <source src="${viewUrl}" type="video/${ext === 'mov' ? 'mp4' : ext}">
                </video>
            </div>
        `;
    } else if (ext === 'pdf') {
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            <div class="viewer-pdf-wrapper">
                <iframe src="${viewUrl}"></iframe>
            </div>
        `;
    } else if (AUDIO_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            ${navHtml}
            <div class="viewer-video-wrapper" style="height:auto; padding:2rem;">
                <audio controls autoplay style="width:100%; max-width:500px;">
                    <source src="${viewUrl}" type="audio/${ext}">
                </audio>
            </div>
        `;
    } else if (TEXT_EXTS.includes(ext)) {
        const isRenderable = ['html', 'htm', 'svg', 'md'].includes(ext);
        const renderBtn = isRenderable ? `<button onclick="window.renderTextIframe('${viewUrl}')" class="archive-mode-btn" style="margin-left:auto; border-color:var(--c-cyan); color:var(--c-cyan);">RENDER PREVIEW</button>` : '';
        mediaContainer.innerHTML = `
            ${toolbarHtml}
            ${navHtml}
            <div class="viewer-pdf-wrapper text-viewer-wrapper" style="background: var(--surface-low); padding:1.5rem; overflow:auto; display:flex; flex-direction:column; align-items:flex-start;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; width:100%; flex-shrink:0;">
                    <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted);">RAW SOURCE</span>
                    ${renderBtn}
                </div>
                <pre style="margin:0; white-space:pre-wrap; font-family:var(--font-mono); font-size:0.85rem; color:var(--text-color); width:100%;" id="text-preview-container">Loading source...</pre>
            </div>`;

        fetch(viewUrl)
            .then(res => res.text())
            .then(text => {
                const el = document.getElementById('text-preview-container');
                if(el) el.textContent = text;
            })
            .catch(err => {
                const el = document.getElementById('text-preview-container');
                if(el) el.textContent = 'Failed to load text: ' + err.message;
            });
    }
    setTimeout(initPlayer, 50);
}

export function playFeedVideo(container, event) {
    event.stopPropagation();
    const video = container.querySelector('video');
    const playBtn = container.querySelector('.archive-gallery-play');
    if (playBtn) playBtn.style.display = 'none';
    video.controls = true;
    video.muted = false;
    video.play();
}

window.renderTextIframe = function(url) {
    const wrapper = document.querySelector('.text-viewer-wrapper');
    if (wrapper) {
        wrapper.style.padding = '0';
        // Use a restrictive sandbox and an overlay to completely block interaction while allowing scrolling of the wrapper
        wrapper.innerHTML = `
            <div style="position:relative; width:100%; height:100%;">
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:10; cursor:not-allowed;"></div>
                <iframe src="${url}" sandbox="" style="width:100%;height:100%;border:none;background:#fff; pointer-events:none;"></iframe>
            </div>
        `;
    }
};