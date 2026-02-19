export function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

export function showToast(message) {
    const existing = document.querySelector('.file-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'file-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
