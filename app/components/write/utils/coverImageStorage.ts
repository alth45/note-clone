// app/components/write/utils/coverImageStorage.ts
// Helper untuk simpan/load cover image dari localStorage
// sebagai preview sementara sebelum tersimpan ke server.

const LS_COVER_PREFIX = "noteos_cover_";

export function saveCoverToLS(postId: string, url: string): void {
    try {
        localStorage.setItem(`${LS_COVER_PREFIX}${postId}`, url);
    } catch { }
}

export function loadCoverFromLS(postId: string): string | null {
    try {
        return localStorage.getItem(`${LS_COVER_PREFIX}${postId}`);
    } catch {
        return null;
    }
}

export function clearCoverFromLS(postId: string): void {
    try {
        localStorage.removeItem(`${LS_COVER_PREFIX}${postId}`);
    } catch { }
}