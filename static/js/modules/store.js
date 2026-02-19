import { IMAGE_EXTS, VIDEO_EXTS } from './config.js';

export function getRecentFiles() {
    return JSON.parse(localStorage.getItem('recentFiles') || '[]');
}

export function addRecentFile(item) {
    const ext = item.name.split('.').pop().toLowerCase();
    const isImage = IMAGE_EXTS.includes(ext);
    const isVideo = VIDEO_EXTS.includes(ext);
    if (!isImage && !isVideo) return;

    let recent = getRecentFiles();
    // Remove duplicate if exists
    recent = recent.filter(r => r.path !== item.path);
    // Add to front
    recent.unshift({ name: item.name, path: item.path, isImage, isVideo });
    // Keep max 20
    if (recent.length > 20) recent = recent.slice(0, 20);
    localStorage.setItem('recentFiles', JSON.stringify(recent));
}

export function clearRecentFiles() {
    localStorage.removeItem('recentFiles');
}
