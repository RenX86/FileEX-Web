import { loadPath, handleItemClick, confirmDelete, deleteItem, clearRecentFiles, loadTrash, restoreTrashItem, permanentDeleteTrashItem, renderTrashItems, goUp } from './modules/actions.js?v=9';
import { closeModal, openRecentFile, previewArchiveEntry, playFeedVideo, navigateMedia, navigateArchiveMedia, viewerZoom, viewerReset, viewerRotate } from './modules/viewer.js?v=9';
import { renderArchiveTable, renderArchiveGallery } from './modules/ui.js?v=9';

// Expose to window for inline onclicks
window.loadPath = loadPath;
window.handleItemClick = handleItemClick;
window.confirmDelete = confirmDelete;
window.deleteItem = deleteItem;
window.closeModal = closeModal;
window.openRecentFile = openRecentFile;
window.clearRecentFiles = clearRecentFiles;
window.renderArchiveTable = renderArchiveTable;
window.renderArchiveGallery = renderArchiveGallery;
window.previewArchiveEntry = previewArchiveEntry;
window.playFeedVideo = playFeedVideo;
window.navigateMedia = navigateMedia;
window.navigateArchiveMedia = navigateArchiveMedia;
window.viewerZoom = viewerZoom;
window.viewerReset = viewerReset;
window.viewerRotate = viewerRotate;
window.loadTrash = loadTrash;
window.restoreTrashItem = restoreTrashItem;
window.permanentDeleteTrashItem = permanentDeleteTrashItem;
window.goUp = goUp;

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    loadPath('');
});

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
