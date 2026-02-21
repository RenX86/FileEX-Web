import { API_BASE } from './config.js';

export async function fetchFiles(path, skip = 0, limit = 100) {
    let url = path ? `${API_BASE}/list?path=${encodeURIComponent(path)}` : `${API_BASE}/list`;
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}skip=${skip}&limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to fetch files');
    }

    return await response.json();
}

export async function fetchArchive(path, password = null) {
    let url = `${API_BASE}/archive?path=${encodeURIComponent(path)}`;
    if (password) {
        url += `&password=${encodeURIComponent(password)}`;
    }
    const response = await fetch(url);

    if (!response.ok) {
        const err = await response.json();
        const errorMsg = err.detail || 'Failed to read archive';
        const error = new Error(errorMsg);
        if (response.status === 401 && errorMsg === 'password_required') {
            error.name = 'PasswordRequired';
        }
        throw error;
    }

    return await response.json();
}

export async function deleteItemAPI(path) {
    const response = await fetch(`${API_BASE}/delete?path=${encodeURIComponent(path)}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to delete item');
    }
}

export async function fetchTrash() {
    const response = await fetch(`${API_BASE}/trash`);
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to fetch trash');
    }
    return await response.json();
}

export async function restoreItemAPI(trashId) {
    const response = await fetch(`${API_BASE}/trash/restore?trash_id=${encodeURIComponent(trashId)}`, {
        method: 'POST'
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to restore item');
    }
}

export async function permanentDeleteItemAPI(trashId) {
    const response = await fetch(`${API_BASE}/trash/permanent?trash_id=${encodeURIComponent(trashId)}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to permanently delete item');
    }
}
