import { API_BASE, IMAGE_EXTS, VIDEO_EXTS } from './config.js';
import { escapeHtml } from './utils.js';
import { mediaContainer, modal } from './ui.js';
import { addRecentFile } from './store.js';

export function closeModal() {
    modal.style.display = 'none';
    mediaContainer.innerHTML = '';
    document.body.classList.remove('modal-open');
}

export function openMedia(item) {
    const ext = item.name.split('.').pop().toLowerCase();
    const viewUrl = `${API_BASE}/view?path=${encodeURIComponent(item.path)}`;

    if (IMAGE_EXTS.includes(ext)) {
        mediaContainer.innerHTML = `<img src="${viewUrl}" alt="${escapeHtml(item.name)}">`;
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        addRecentFile(item);
    } else if (VIDEO_EXTS.includes(ext)) {
        let mimeType = `video/${ext}`;
        if (ext === 'mov') mimeType = 'video/mp4';
        if (ext === 'mkv') mimeType = 'video/webm';

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
    }
}

export function openRecentFile(filePath, fileName) {
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
