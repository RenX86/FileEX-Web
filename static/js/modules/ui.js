import { API_BASE, IMAGE_EXTS, VIDEO_EXTS, ARCHIVE_EXTS } from './config.js';
import { escapeHtml } from './utils.js';

export const listContainer = document.getElementById('file-list');
export const breadcrumbContainer = document.getElementById('breadcrumb');
export const mediaContainer = document.getElementById('media-container');
export const modal = document.getElementById('media-modal');

export function renderItems(items) {
    listContainer.innerHTML = '';

    if (items.length === 0) {
        listContainer.innerHTML = '<div class="loading" style="background:var(--card-bg);color:var(--text-color);">📂 NO FILES HERE</div>';
        return;
    }

    items.forEach((item, index) => {
        const card = document.createElement('div');
        const colorIndex = (index % 5) + 1;
        const colorClass = `color-${colorIndex}`;

        card.className = `file-card ${colorClass}${item.type === 'drive' ? ' drive-card' : ''}`;
        card.setAttribute('data-file-path', item.path);
        // We use window.handleItemClick
        card.onclick = () => window.handleItemClick(item);

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

        let metaClass = 'file-meta';
        if (item.type === 'drive') metaClass += ' file-meta--drive';
        else if (item.is_dir) metaClass += ' file-meta--dir';
        else if (IMAGE_EXTS.includes(ext)) metaClass += ' file-meta--image';
        else if (VIDEO_EXTS.includes(ext)) metaClass += ' file-meta--video';
        else if (ARCHIVE_EXTS.includes(ext)) metaClass += ' file-meta--archive';

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

        let progressHtml = '';
        if (item.type === 'drive' && item.stats) {
            const freeMatch = item.stats.free.match(/([\d.]+)/);
            const totalMatch = item.stats.total.match(/([\d.]+)/);
            if (freeMatch && totalMatch) {
                const free = parseFloat(freeMatch[1]);
                const total = parseFloat(totalMatch[1]);
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

        const escapedPath = item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const escapedName = item.name.replace(/'/g, "\\'");

        card.innerHTML = `
            <div class="icon">${iconContent}</div>
            <div class="file-info">
                <span class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                <div class="${metaClass}">${metaText}</div>
            </div>
            ${progressHtml}
            ${!item.is_dir ? `<div class="file-delete-btn" onclick="window.confirmDelete(event, '${escapedPath}', '${escapedName}')">
                <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>` : ''}
        `;

        card.style.animationDelay = `${index * 30}ms`;
        listContainer.appendChild(card);
    });
}

export function updateBreadcrumbs(path) {
    if (!path) {
        breadcrumbContainer.innerHTML = '<span class="crumb home-crumb active" onclick="window.loadPath(\'\')">HOME</span>';
        return;
    }

    let html = '<span class="crumb home-crumb" onclick="window.loadPath(\'\')">HOME</span>';
    const parts = path.split(/[/\\]/).filter(p => p);
    let currentBuild = '';

    // If the original path started with a slash (Linux/Docker absolute path), 
    // we need to ensure the first build starts with one.
    const isAbsolutePosix = path.startsWith('/');

    parts.forEach((part, index) => {
        if (index === 0) {
            if (part.includes(':')) {
                currentBuild = part + '/'; // Windows drive
            } else if (isAbsolutePosix) {
                currentBuild = '/' + part; // Linux absolute
            } else {
                currentBuild = part; // Relative?
            }
        } else {
            currentBuild = currentBuild ? (currentBuild.endsWith('/') ? currentBuild + part : currentBuild + '/' + part) : part;
        }

        const isActive = index === parts.length - 1;
        const activeClass = isActive ? 'active' : '';
        // Escape backslashes if they exist, but we are building with forward slashes now.
        // Also escape single quotes for the onclick handler.
        const escapedPath = currentBuild.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const clickAction = isActive ? '' : `onclick="window.loadPath('${escapedPath}')"`;

        html += `<span class="crumb ${activeClass}" ${clickAction}>${part}</span>`;
    });

    breadcrumbContainer.innerHTML = html;
}

export function renderArchiveTable(data, archivePath) {
    const previewableExts = [...IMAGE_EXTS, ...VIDEO_EXTS, 'pdf'];
    const escapedPath = archivePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const mediaCount = data.entries.filter(e => {
        const ext = e.name.split('.').pop().toLowerCase();
        return !e.is_dir && [...IMAGE_EXTS, ...VIDEO_EXTS].includes(ext);
    }).length;

    const galleryBtn = mediaCount > 0 ? `<button class="archive-mode-btn active">📋 LIST</button><button class="archive-mode-btn" onclick="window.renderArchiveGallery(document.getElementById('media-container')._archiveData, document.getElementById('media-container')._archivePath)">🖼️ GALLERY (${mediaCount})</button>` : '';

    // Icons
    const iconFolder = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    const iconFile = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
    const iconEye = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const iconDownload = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

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
                        <tr><th style="width:60%">Name</th><th>Size</th><th>Comp.</th><th style="width:50px"></th></tr>
                    </thead>
                    <tbody>`;

    for (const entry of data.entries) {
        const entryExt = entry.name.split('.').pop().toLowerCase();
        const isPreviewable = !entry.is_dir && previewableExts.includes(entryExt);

        let icon = entry.is_dir ? iconFolder : iconFile;
        // If previewable, use Eye icon? Or just keep file icon and make it clickable? 
        // Let's use Eye for distinct action, or just File icon with hover effect.
        // User asked for better icons.

        const clickClass = isPreviewable ? 'archive-previewable' : '';
        const clickAttr = isPreviewable
            ? `onclick="window.previewArchiveEntry('${escapedPath}', '${entry.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"`
            : '';

        // Download Link
        // /api/archive/view?path=...&entry=...
        const downloadUrl = `${API_BASE}/archive/view?path=${encodeURIComponent(archivePath)}&entry=${encodeURIComponent(entry.name)}`;
        const downloadAction = !entry.is_dir
            ? `<a href="${downloadUrl}" download="${entry.name.split('/').pop()}" class="archive-dl-btn" title="Download" onclick="event.stopPropagation()">${iconDownload}</a>`
            : '';

        html += `
            <tr class="${entry.is_dir ? 'archive-dir' : ''} ${clickClass}" ${clickAttr}>
                <td><div class="archive-name-wrap">${icon} <span>${escapeHtml(entry.name)}</span></div></td>
                <td>${entry.size_fmt}</td>
                <td>${entry.compressed_fmt}</td>
                <td style="text-align:right;">${downloadAction}</td>
            </tr>`;
    }

    html += `</tbody></table></div></div>`;
    mediaContainer.innerHTML = html;

    mediaContainer._archiveData = data;
    mediaContainer._archivePath = archivePath;
}

export function renderArchiveGallery(data, archivePath) {
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
                    <button class="archive-mode-btn" onclick="window.renderArchiveTable(document.getElementById('media-container')._archiveData, document.getElementById('media-container')._archivePath)">📋 LIST</button>
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
                ? `<div class="archive-feed-item archive-feed-video-item" onclick="window.playFeedVideo(this, event)">
                <video src="${viewUrl}" muted preload="metadata" class="archive-feed-media"></video>
                <div class="archive-gallery-play">▶</div>
                <div class="archive-feed-label">${escapeHtml(shortName)}</div>
               </div>`
                : `<div class="archive-feed-item" onclick="window.previewArchiveEntry('${escapedPath}', '${entry.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">
                <img src="${viewUrl}" alt="${escapeHtml(shortName)}" class="archive-feed-media" loading="lazy">
                <div class="archive-feed-label">${escapeHtml(shortName)}</div>
               </div>`}`;
    }

    html += `</div></div></div>`;
    mediaContainer.innerHTML = html;

    mediaContainer._archiveData = data;
    mediaContainer._archivePath = archivePath;
}

export function renderRecentFiles(recent) {
    if (recent.length === 0) return;

    const existing = document.querySelector('.recent-files-section');
    if (existing) existing.remove();

    const section = document.createElement('div');
    section.className = 'recent-files-section';

    let thumbsHtml = '';
    for (const file of recent) {
        const thumbUrl = file.isImage
            ? `${API_BASE}/thumbnail?path=${encodeURIComponent(file.path)}`
            : '';
        const shortName = file.name.split('/').pop().split('\\').pop();
        const escapedPath = file.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        thumbsHtml += `
            <div class="recent-file-thumb" onclick="window.openRecentFile('${escapedPath}', '${shortName.replace(/'/g, "\\'")}')" title="${escapeHtml(shortName)}">
                ${file.isImage
                ? `<img src="${thumbUrl}" alt="${escapeHtml(shortName)}" loading="lazy">`
                : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:2rem;background:#222;">🎬</div>`}
                <div class="recent-file-name">${escapeHtml(shortName)}</div>
            </div>`;
    }

    section.innerHTML = `
        <div class="recent-files-header">
            <span class="recent-files-title">🕑 Recently Viewed</span>
            <button class="recent-files-clear" onclick="window.clearRecentFiles()">CLEAR</button>
        </div>
        <div class="recent-files-strip">${thumbsHtml}</div>
    `;

    listContainer.parentNode.insertBefore(section, listContainer);
}
