import { API_BASE, IMAGE_EXTS, VIDEO_EXTS, ARCHIVE_EXTS, AUDIO_EXTS, TEXT_EXTS } from './config.js?v=26';
import { escapeHtml } from './utils.js?v=26';

export const listContainer = document.getElementById('file-list');
export const breadcrumbContainer = document.getElementById('breadcrumb');
export const mediaContainer = document.getElementById('media-container');
export const modal = document.getElementById('media-modal');

export function renderItems(items, append = false) {
    if (!append) {
        listContainer.innerHTML = '';
    }

    if (items.length === 0 && !append) {
        listContainer.innerHTML = '<div class="loading" style="background:var(--card-bg);color:var(--text-color);">📂 NO FILES HERE</div>';
        return;
    }

    const startIndex = listContainer.querySelectorAll('.file-card').length;

    items.forEach((item, index) => {
        const card = document.createElement('div');
        const colorIndex = ((startIndex + index) % 5) + 1;
        const colorClass = `color-${colorIndex}`;

        card.className = `file-card ${colorClass}${item.type === 'drive' ? ' drive-card' : ''}`;
        card.setAttribute('data-file-path', item.path);
        // We use window.handleItemClick
        card.onclick = () => window.handleItemClick(item);

        const ext = item.name.split('.').pop().toLowerCase();
        let iconContent;

        if (!item.is_dir && (IMAGE_EXTS.includes(ext) || VIDEO_EXTS.includes(ext))) {
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

        card.style.animationDelay = `${(index % 20) * 30}ms`;
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
    const previewableExts = [...IMAGE_EXTS, ...VIDEO_EXTS, ...AUDIO_EXTS, ...TEXT_EXTS, 'pdf'];
    const escapedPath = archivePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const mediaCount = data.entries.filter(e => {
        const ext = e.name.split('.').pop().toLowerCase();
        return !e.is_dir && [...IMAGE_EXTS, ...VIDEO_EXTS].includes(ext);
    }).length;

    const galleryBtn = mediaCount > 0 ? `<button class="archive-mode-btn active">📋 LIST</button><button class="archive-mode-btn" onclick="window.renderArchiveGallery(document.getElementById('media-container')._archiveData, document.getElementById('media-container')._archivePath)">🖼️ GALLERY (${mediaCount})</button>` : '';

    const pwdStr = mediaContainer._archivePassword ? `&password=${encodeURIComponent(mediaContainer._archivePassword)}` : '';
    const downloadArchiveUrl = `${API_BASE}/download?path=${encodeURIComponent(archivePath)}`;
    const downloadBtn = `<a href="${downloadArchiveUrl}" download="${escapeHtml(data.filename)}" class="archive-mode-btn" style="color:var(--c-primary); border-color:var(--c-primary);" title="Download Entire Archive">↓ DOWNLOAD</a>`;
    const extractBtn = `<button onclick="window.extractArchive('${escapedPath}')" class="archive-mode-btn" style="color:#fbbf24; border-color:#fbbf24; margin-right:8px;" title="Extract Archive Here">📤 EXTRACT</button>`;

    let html = `
        <div class="archive-viewer">
            <div class="archive-header">
                <h2>📦 ${escapeHtml(data.filename)}</h2>
                <div class="archive-header-actions">
                    ${galleryBtn}
                    ${extractBtn}
                    ${downloadBtn}
                    <span class="archive-stats">${data.total_dirs} folders · ${data.total_files} files</span>
                </div>
            </div>
            <div class="archive-search-bar">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" id="archive-search-input" placeholder="Filter archive contents..." oninput="window.filterArchiveContents(this.value)">
            </div>
            <div class="archive-table-wrap">
                <table class="archive-table" id="archive-entries-table">
                    <thead>
                        <tr><th style="width:60%">Name</th><th>Size</th><th>Comp.</th><th style="width:50px"></th></tr>
                    </thead>
                    <tbody>`;

    for (const entry of data.entries) {
        const entryExt = entry.name.split('.').pop().toLowerCase();
        const isPreviewable = !entry.is_dir && previewableExts.includes(entryExt);

        let icon = getFileIcon(entry.is_dir, entryExt);

        const clickClass = isPreviewable ? 'archive-previewable' : '';
        const clickAttr = isPreviewable
            ? `onclick="window.previewArchiveEntry('${escapedPath}', '${entry.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"`
            : '';

        const downloadUrl = `${API_BASE}/archive/view?path=${encodeURIComponent(archivePath)}&entry=${encodeURIComponent(entry.name)}${pwdStr}`;
        const downloadAction = !entry.is_dir
            ? `<a href="${downloadUrl}" download="${entry.name.split('/').pop()}" class="archive-dl-btn" title="Download" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></a>`
            : '';
            
        const parts = entry.name.split('/');
        const fileName = parts.pop();
        const dirPath = parts.length > 0 ? parts.join('/') + '/' : '';
        const displayHtml = dirPath ? `<span style="opacity:0.5; font-weight:400;">${escapeHtml(dirPath)}</span><span style="font-weight:600; color:var(--text-color);">${escapeHtml(fileName)}</span>` : `<span style="font-weight:600; color:var(--text-color);">${escapeHtml(fileName)}</span>`;

        html += `
            <tr class="${entry.is_dir ? 'archive-dir' : ''} ${clickClass} archive-item-row" data-search-name="${escapeHtml(entry.name).toLowerCase()}" ${clickAttr}>
                <td><div class="archive-name-wrap">${icon} <span>${displayHtml}</span></div></td>
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

function getFileIcon(isDir, ext) {
    if (isDir) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon" style="color: var(--c-primary);"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    
    if (['js', 'py', 'html', 'css', 'json', 'ts', 'jsx', 'tsx', 'cpp', 'java', 'go'].includes(ext)) 
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon" style="color: #fbbf24;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
    
    if (IMAGE_EXTS.includes(ext))
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon" style="color: #00F5FF;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    
    if (VIDEO_EXTS.includes(ext))
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon" style="color: #8b5cf6;"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`;

    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext))
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon" style="color: #f43f5e;"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;

    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="file-icon"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
}

window.filterArchiveContents = function(query) {
    const term = query.toLowerCase();
    const rows = document.querySelectorAll('.archive-item-row');
    rows.forEach(row => {
        const name = row.getAttribute('data-search-name');
        if (name.includes(term)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
};

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
                <div class="archive-masonry-grid">`;

    for (const entry of mediaEntries) {
        const ext = entry.name.split('.').pop().toLowerCase();
        const pwdStr = mediaContainer._archivePassword ? `&password=${encodeURIComponent(mediaContainer._archivePassword)}` : '';
        const viewUrl = `${API_BASE}/archive/view?path=${encodeURIComponent(archivePath)}&entry=${encodeURIComponent(entry.name)}${pwdStr}`;
        const isVideo = VIDEO_EXTS.includes(ext);
        const shortName = entry.name.split('/').pop();

        html += `
            ${isVideo
                ? `<div class="archive-masonry-item" onclick="window.previewArchiveEntry('${escapedPath}', '${entry.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">
                <video src="${viewUrl}" muted preload="metadata" class="archive-feed-media"></video>
                <div class="archive-gallery-play">▶</div>
                <div class="archive-feed-label">${escapeHtml(shortName)}</div>
               </div>`
                : `<div class="archive-masonry-item" onclick="window.previewArchiveEntry('${escapedPath}', '${entry.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">
                <img src="${viewUrl}" alt="${escapeHtml(shortName)}" class="archive-feed-media" loading="lazy">
                <div class="archive-feed-label">${escapeHtml(shortName)}</div>
               </div>`}`;
    }

    html += `</div></div></div>`;
    mediaContainer.innerHTML = html;

    mediaContainer._archiveData = data;
    mediaContainer._archivePath = archivePath;
    mediaContainer._archiveMode = 'gallery';
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
