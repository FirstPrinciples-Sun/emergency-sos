/**
 * API client for document storage.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DocumentMeta {
    id: string;
    filename: string;
    file_size: number;
    content_type: string;
    uploaded_at: string;
    line_user_id: string;
}

function authHeaders(token: string | null): Record<string, string> {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
}

export async function uploadDocument(
    file: File,
    token: string | null
): Promise<DocumentMeta> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        headers: authHeaders(token),
        body: formData,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `Upload failed: ${res.status}`);
    }
    return res.json();
}

export async function listDocuments(
    token: string | null
): Promise<DocumentMeta[]> {
    const res = await fetch(`${API_BASE}/api/documents`, {
        headers: authHeaders(token),
    });

    if (!res.ok) {
        throw new Error(`Failed to load documents: ${res.status}`);
    }
    return res.json();
}

export async function deleteDocument(
    docId: string,
    token: string | null
): Promise<void> {
    const res = await fetch(`${API_BASE}/api/documents/${docId}`, {
        method: "DELETE",
        headers: authHeaders(token),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `Delete failed: ${res.status}`);
    }
}

export async function getDownloadUrl(
    docId: string,
    token: string | null
): Promise<string> {
    const res = await fetch(`${API_BASE}/api/documents/${docId}/download`, {
        headers: authHeaders(token),
    });

    if (!res.ok) {
        throw new Error(`Download failed: ${res.status}`);
    }
    const data = await res.json();
    return data.url;
}
