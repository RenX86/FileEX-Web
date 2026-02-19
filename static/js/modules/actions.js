import { fetchFiles, fetchArchive, deleteItemAPI } from './api.js';
import { renderItems, updateBreadcrumbs, renderArchiveTable, renderRecentFiles, listContainer, mediaContainer, modal } from './ui.js';
import { openMedia } from './viewer.js';
import { ARCHIVE_EXTS } from './config.js';
import { escapeHtml, showToast } from './utils.js';
import { closeModal } from './viewer.js';
import { getRecentFiles, clearRecentFiles as storeClearRecent } from './store.js';

let currentPath = '';
let currentItems = [];

export function getCurrentItems() {
    return currentItems;
}

export async function loadPath(path) {
    currentPath = path;
    updateBreadcrumbs(path);
    listContainer.innerHTML = '<div class="loading">LOADING...</div>';

    try {
        const items = await fetchFiles(path);
        currentItems = items; // Store for navigation
        renderItems(items);
        if (items.length > 0 && items[0].type === 'drive') {
            renderRecentFiles(getRecentFiles());
        }
    } catch (error) {
        listContainer.innerHTML = `<div class="loading" style="background:var(--c-pink); color:#000;">ERROR: ${error.message}</div>`;
    }
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

async function openArchiveViewer(item) {
    mediaContainer.innerHTML = '<div class="loading">READING ARCHIVE...</div>';
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    try {
        const data = await fetchArchive(item.path);
        renderArchiveTable(data, item.path);
    } catch (error) {
        mediaContainer.innerHTML = `<div class="loading" style="background:var(--c-pink); color:#000;">ERROR: ${escapeHtml(error.message)}</div>`;
    }
}

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
