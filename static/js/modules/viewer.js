import { API_BASE, IMAGE_EXTS, VIDEO_EXTS } from './config.js';
import { escapeHtml } from './utils.js';
import { mediaContainer, modal } from './ui.js';
import { addRecentFile } from './store.js';
import { getCurrentItems } from './actions.js';

let currentMediaItem = null;

// Keyboard navigation
// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex' && currentMediaItem) {
        if (e.key === 'ArrowLeft') navigateMedia(-1);
        if (e.key === 'ArrowRight') navigateMedia(1);
    }
});

// Touch Swipe Navigation
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    if (modal.style.display === 'flex' && currentMediaItem) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }
}, { passive: true });

document.addEventListener('touchend', (e) => {
    if (modal.style.display === 'flex' && currentMediaItem) {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;

        handleSwipeGesture(touchStartX, touchStartY, touchEndX, touchEndY);
    }
}, { passive: true });

function handleSwipeGesture(startX, startY, endX, endY) {
    const diffX = endX - startX;
    const diffY = endY - startY;
    const threshold = 50; // min distance to capture swipe

    // Ensure it's a horizontal swipe (more horizontal than vertical)
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Swipe Right -> Previous
                navigateMedia(-1);
            } else {
                // Swipe Left -> Next
                navigateMedia(1);
            }
        }
    }
}

export function closeModal() {
    modal.classList.remove('danger-active');
    modal.style.display = 'none';
    mediaContainer.innerHTML = '';
    document.body.classList.remove('modal-open');
    currentMediaItem = null;
}

export function openMedia(item) {
    currentMediaItem = item;
    const ext = item.name.split('.').pop().toLowerCase();
    const viewUrl = `${API_BASE}/view?path=${encodeURIComponent(item.path)}`;

    // Navigation buttons HTML
    const navHtml = `
        <div class="media-nav prev" onclick="window.navigateMedia(-1)">❮</div>
        <div class="media-nav next" onclick="window.navigateMedia(1)">❯</div>
    `;

    if (IMAGE_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `${navHtml}<img src="${viewUrl}" alt="${escapeHtml(item.name)}">`;
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        addRecentFile(item);
    } else if (VIDEO_EXTS.includes(ext)) {
        let mimeType = `video/${ext}`;
        if (ext === 'mov') mimeType = 'video/mp4';
        if (ext === 'mkv') mimeType = 'video/webm';

        mediaContainer.innerHTML = `
            ${navHtml}
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
        // No nav for PDF usually, or could add it
    }
}

export function navigateMedia(step) {
    if (!currentMediaItem) return;

    const items = getCurrentItems();
    if (!items || items.length === 0) return;

    // Filter only navigable items (images/videos)
    const navigableItems = items.filter(i => {
        if (i.is_dir) return false;
        const ext = i.name.split('.').pop().toLowerCase();
        return IMAGE_EXTS.includes(ext) || VIDEO_EXTS.includes(ext);
    });

    if (navigableItems.length <= 1) return;

    const currentIndex = navigableItems.findIndex(i => i.path === currentMediaItem.path);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex + step;
    // Wrap around
    if (nextIndex < 0) nextIndex = navigableItems.length - 1;
    if (nextIndex >= navigableItems.length) nextIndex = 0;

    openMedia(navigableItems[nextIndex]);
}

export function openRecentFile(filePath, fileName) {
    // ... existing ... but update to set currentMediaItem if possible, 
    // though navigating from recent files implies we might not have the full context of that folder loaded.
    // For now, disable nav when opening from recent files or limit it.
    // Actually, openMedia relies on item object. openRecentFile only has path/name.
    // We'll keep openRecentFile simple and maybe NOT support nav there unless we fetch the folder.

    currentMediaItem = null; // No context for navigation

    const ext = fileName.split('.').pop().toLowerCase();
    const viewUrl = `${API_BASE}/view?path=${encodeURIComponent(filePath)}`;

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

export function previewArchiveEntry(archivePath, entryName) {
    currentMediaItem = null;
    const ext = entryName.split('.').pop().toLowerCase();
    const viewUrl = `${API_BASE}/archive/view?path=${encodeURIComponent(archivePath)}&entry=${encodeURIComponent(entryName)}`;

    const backBtn = `<div class="archive-back-bar">
        <button onclick="window.renderArchiveTable(document.getElementById('media-container')._archiveData, document.getElementById('media-container')._archivePath)" class="archive-back-btn">← BACK TO ARCHIVE</button>
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

export function playFeedVideo(container, event) {
    event.stopPropagation();
    const video = container.querySelector('video');
    const playBtn = container.querySelector('.archive-gallery-play');
    if (playBtn) playBtn.style.display = 'none';
    video.controls = true;
    video.muted = false;
    video.play();
}
