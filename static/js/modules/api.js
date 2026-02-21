import { API_BASE } from './config.js';

export async function fetchFiles(path) {
    const url = path ? `${API_BASE}/list?path=${encodeURIComponent(path)}` : `${API_BASE}/list`;
    const response = await fetch(url);

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to fetch files');
    }

    return await response.json();
}

export async function fetchArchive(path) {
    const url = `${API_BASE}/archive?path=${encodeURIComponent(path)}`;
    const response = await fetch(url);

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Failed to read archive');
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
