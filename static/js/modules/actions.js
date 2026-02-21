import { fetchFiles, fetchArchive, deleteItemAPI } from './api.js';
import { renderItems, updateBreadcrumbs, renderArchiveTable, renderRecentFiles, listContainer, mediaContainer, modal } from './ui.js';
import { openMedia } from './viewer.js';
import { ARCHIVE_EXTS } from './config.js';
import { escapeHtml, showToast } from './utils.js';
import { closeModal } from './viewer.js';
import { getRecentFiles, clearRecentFiles as storeClearRecent } from './store.js';

// Expose functions to the global window object for inline HTML event handlers
window.handleItemClick = handleItemClick;
window.confirmDelete = confirmDelete;
window.deleteItem = deleteItem;
window.closeModal = closeModal; // From viewer.js, but often used in actions.js context
window.clearRecentFiles = clearRecentFiles;
window.loadPath = loadPath;
window.loadTrash = loadTrash;
window.restoreTrashItem = restoreTrashItem;
window.permanentDeleteTrashItem = permanentDeleteTrashItem;
// The following functions are not defined in this file, assuming they are imported or defined elsewhere
// window.renderArchiveGallery = renderArchiveGallery;
// window.previewArchiveEntry = previewArchiveEntry;
// window.playFeedVideo = playFeedVideo;
// window.navigateMedia = navigateMedia;


let currentPath = '';
let currentItems = [];
let currentSkip = 0;
const currentLimit = 100;
let hasMoreFiles = false;
let isLoadingMore = false;
let scrollObserver = null;

export function getCurrentItems() {
    return currentItems;
}

export async function loadPath(path) {
    currentPath = path;
    updateBreadcrumbs(path);
    listContainer.innerHTML = '<div class="loading">LOADING...</div>';

    currentSkip = 0;
    hasMoreFiles = false;
    isLoadingMore = false;
    currentItems = [];

    const oldSentinel = document.getElementById('scroll-sentinel');
    if (oldSentinel) oldSentinel.remove();

    try {
        const data = await fetchFiles(path, currentSkip, currentLimit);
        currentItems = data.items;
        hasMoreFiles = data.has_more;
        currentSkip += currentLimit;

        listContainer.innerHTML = '';
        renderItems(data.items, false);

        if (data.items.length > 0 && data.items[0].type === 'drive') {
            renderRecentFiles(getRecentFiles());
        }

        setupScrollSentinel();
    } catch (error) {
        listContainer.innerHTML = `<div class="loading" style="background:var(--c-pink); color:#000;">ERROR: ${error.message}</div>`;
    }
}

export async function loadMoreFiles() {
    if (isLoadingMore || !hasMoreFiles || currentPath === 'TRASH') return;

    isLoadingMore = true;
    const loader = document.createElement('div');
    loader.className = 'loading loading-more';
    loader.style.gridColumn = '1 / -1';
    loader.style.padding = '1rem';
    loader.innerText = 'LOADING MORE...';
    listContainer.appendChild(loader);

    try {
        const data = await fetchFiles(currentPath, currentSkip, currentLimit);
        currentItems = currentItems.concat(data.items);
        hasMoreFiles = data.has_more;
        currentSkip += currentLimit;

        loader.remove();
        renderItems(data.items, true);

        if (!hasMoreFiles) {
            const sentinel = document.getElementById('scroll-sentinel');
            if (sentinel) sentinel.remove();
        }
    } catch (error) {
        loader.innerText = `ERROR: ${error.message}`;
        setTimeout(() => loader.remove(), 2000);
    } finally {
        isLoadingMore = false;
    }
}

function setupScrollSentinel() {
    if (scrollObserver) {
        scrollObserver.disconnect();
    }

    if (!hasMoreFiles) return;

    let sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.style.height = '10px';
    sentinel.style.gridColumn = '1 / -1';
    listContainer.parentNode.insertBefore(sentinel, listContainer.nextSibling);

    scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            loadMoreFiles();
        }
    }, { rootMargin: '200px' });

    scrollObserver.observe(sentinel);
}

export function handleItemClick(item) {
    if (item.is_dir) {
        loadPath(item.path);
    } else {
        const ext = item.name.split('.').pop().toLowerCase();
        if (ARCHIVE_EXTS.includes(ext)) {
            openArchiveViewer(item);
        } else if (item.is_dir === false) {
            openMedia(item);
        }
    }
}

export async function openArchiveViewer(item, providedPassword = null) {
    mediaContainer.innerHTML = '<div class="loading">READING ARCHIVE...</div>';
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    try {
        const data = await fetchArchive(item.path, providedPassword);
        mediaContainer._archivePassword = providedPassword;
        renderArchiveTable(data, item.path);
    } catch (error) {
        if (error.name === 'PasswordRequired') {
            promptArchivePassword(item);
        } else {
            mediaContainer.innerHTML = `<div class="loading" style="background:var(--c-pink); color:#000;">ERROR: ${escapeHtml(error.message)}</div>`;
        }
    }
}

function promptArchivePassword(item) {
    mediaContainer.innerHTML = `
        <div class="danger-modal" style="background:var(--card-bg); border-color:var(--border-color);">
            <div class="danger-modal-icon">🔒</div>
            <h2 style="color:var(--text-color);">PASSWORD REQUIRED</h2>
            <p style="color:var(--text-color);">Enter password to decrypt <strong>${escapeHtml(item.name)}</strong>.</p>
            <input type="password" id="archive-password-input" style="width:100%; margin-bottom:1rem; padding:0.8rem; text-align:center; border:2px solid var(--border-color); font-family:var(--font-mono); font-size:1.1rem;" placeholder="Password" autofocus onkeydown="if(event.key === 'Enter') window._submitArchivePassword('${item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${item.name.replace(/'/g, "\\'")}', this.value)">
            <div class="modal-actions">
                <button class="btn-cancel" onclick="window.closeModal()">CANCEL</button>
                <button class="btn-confirm" style="background:var(--c-green); color:#000; border-color:#000;" onclick="window._submitArchivePassword('${item.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', '${item.name.replace(/'/g, "\\'")}', document.getElementById('archive-password-input').value)">UNLOCK</button>
            </div>
        </div>
    `;
    setTimeout(() => {
        const input = document.getElementById('archive-password-input');
        if (input) input.focus();
    }, 50);
}

window._submitArchivePassword = function (path, name, password) {
    if (!password) return;
    const item = { path, name };
    openArchiveViewer(item, password);
};

export function confirmDelete(event, path, name) {
    event.stopPropagation();

    mediaContainer.innerHTML = `
        <div class="danger-modal">
            <div class="danger-modal-icon">💣</div>
            <h2>DELETE ITEM?</h2>
            <p>Move <strong>${name}</strong> to Trash?</p>
            <div class="modal-actions">
                <button class="btn-cancel" onclick="window.closeModal()">NO, KEEP IT</button>
                <button class="btn-confirm" onclick="window.deleteItem('${path.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">YES, DELETE</button>
            </div>
        </div>
    `;
    modal.classList.add('danger-active');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

export async function deleteItem(path) {
    mediaContainer.innerHTML = '<div class="loading" style="background:var(--c-orange); color:#fff;">DELETING...</div>';

    try {
        await deleteItemAPI(path);
        closeModal();
        showToast('🗑️ Item moved to Recycle Bin');

        const card = document.querySelector(`.file-card[data-file-path="${path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.transform = 'scale(0.8)';
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 300);
        } else {
            loadPath(currentPath);
        }
    } catch (error) {
        mediaContainer.innerHTML = `
            <div class="modal-content danger-modal" style="background:var(--card-bg); padding:2rem; text-align:center;">
                <h2>⚠️ ERROR</h2>
                <p>${escapeHtml(error.message)}</p>
                <button class="btn-cancel" onclick="window.closeModal()">CLOSE</button>
            </div>
        `;
    }
}

export function clearRecentFiles() {
    storeClearRecent();
    const section = document.querySelector('.recent-files-section');
    if (section) section.remove();
}

export async function loadTrash() {
    currentPath = 'TRASH';
    updateBreadcrumbs('Trash'); // Special breadcrumb view
    listContainer.innerHTML = '<div class="loading">LOADING TRASH...</div>';

    // Hide recent files if viewing trash
    const recentSection = document.querySelector('.recent-files-section');
    if (recentSection) recentSection.style.display = 'none';

    try {
        const { fetchTrash } = await import('./api.js');
        const items = await fetchTrash();
        currentItems = items;
        renderTrashItems(items);
    } catch (error) {
        listContainer.innerHTML = `<div class="loading" style="background:var(--c-pink); color:#000;">ERROR: ${error.message}</div>`;
    }
}

export function renderTrashItems(items) {
    listContainer.innerHTML = '';

    if (items.length === 0) {
        listContainer.innerHTML = '<div class="loading" style="background:var(--card-bg);color:var(--text-color);">🗑️ TRASH IS EMPTY</div>';
        return;
    }

    items.forEach((item, index) => {
        const card = document.createElement('div');
        const colorIndex = (index % 5) + 1;

        // Trash items get a slightly dimmed look
        card.className = `file-card color-${colorIndex}`;
        card.style.opacity = '0.9';

        const ext = item.original_name.split('.').pop().toLowerCase();
        const iconContent = item.is_dir ? '📁' : '📄';

        const escapedId = item.id.replace(/'/g, "\\'");
        const escapedName = item.original_name.replace(/'/g, "\\'");

        card.innerHTML = `
            <div class="icon" style="filter: grayscale(0.5);">${iconContent}</div>
            <div class="file-info">
                <span class="file-name" title="${escapeHtml(item.original_name)}" style="text-decoration: line-through; opacity: 0.8;">${escapeHtml(item.original_name)}</span>
                <div class="file-meta" style="color: var(--c-orange);">Deleted: ${item.deleted_at_fmt || 'Unknown'}</div>
                <div class="file-meta">Original: ${escapeHtml(item.original_path)}</div>
            </div>
            
            <div class="trash-actions" style="display: flex; gap: 0.5rem; margin-left: auto;">
                <button title="Restore" class="btn" style="padding: 0.3rem 0.5rem; background: var(--c-green); color: black; border: 2px solid black; cursor: pointer;" onclick="window.restoreTrashItem(event, '${escapedId}')">↩️</button>
                <button title="Delete Permanently" class="btn" style="padding: 0.3rem 0.5rem; background: var(--c-pink); color: black; border: 2px solid black; cursor: pointer;" onclick="window.permanentDeleteTrashItem(event, '${escapedId}', '${escapedName}')">❌</button>
            </div>
        `;

        card.style.animationDelay = `${index * 30}ms`;
        listContainer.appendChild(card);
    });
}

export async function restoreTrashItem(event, trashId) {
    event.stopPropagation();
    mediaContainer.innerHTML = '<div class="loading" style="background:var(--c-green); color:#000;">RESTORING...</div>';

    try {
        const { restoreItemAPI } = await import('./api.js');
        await restoreItemAPI(trashId);
        showToast('✅ Item restored to original location');
        loadTrash(); // Reload trash view
    } catch (error) {
        mediaContainer.innerHTML = `
            <div class="modal-content danger-modal" style="background:var(--card-bg); padding:2rem; text-align:center;">
                <h2>⚠️ ERROR</h2>
                <p>${escapeHtml(error.message)}</p>
                <button class="btn-cancel" onclick="window.closeModal()">CLOSE</button>
            </div>
        `;
    }
}

export function permanentDeleteTrashItem(event, trashId, name) {
    event.stopPropagation();

    mediaContainer.innerHTML = `
        <div class="danger-modal" style="background: var(--c-pink);">
            <div class="danger-modal-icon">☢️</div>
            <h2>PERMANENT DELETE?</h2>
            <p>This action cannot be undone. Permanently destroy <strong>${name}</strong>?</p>
            <div class="modal-actions">
                <button class="btn-cancel" onclick="window.closeModal()">CANCEL</button>
                <button class="btn-confirm" style="background: #000; color: #fff;" onclick="window._executePermanentDelete('${trashId.replace(/'/g, "\\'")}')">DESTROY</button>
            </div>
        </div>
    `;
    modal.classList.add('danger-active');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

window._executePermanentDelete = async function (trashId) {
    mediaContainer.innerHTML = '<div class="loading" style="background:var(--c-pink); color:#000;">DESTROYING...</div>';

    try {
        const { permanentDeleteItemAPI } = await import('./api.js');
        await permanentDeleteItemAPI(trashId);
        closeModal();
        showToast('☢️ Item permanently destroyed');
        loadTrash();
    } catch (error) {
        mediaContainer.innerHTML = `
            <div class="modal-content danger-modal" style="background:var(--card-bg); padding:2rem; text-align:center;">
                <h2>⚠️ ERROR</h2>
                <p>${escapeHtml(error.message)}</p>
                <button class="btn-cancel" onclick="window.closeModal()">CLOSE</button>
            </div>
        `;
    }
}
