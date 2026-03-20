// utils/draftStorage.ts
// Semua operasi localStorage untuk draft backup editor.
// Pure functions — tidak ada React, bisa ditest tanpa browser.

export interface DraftBackup {
    title: string;
    content: string;
    savedAt: number; // unix ms
}

const LS_PREFIX = "noteos_draft_";

export function lsKey(postId: string): string {
    return `${LS_PREFIX}${postId}`;
}

export function saveDraftToLS(
    postId: string,
    title: string,
    content: string
): void {
    try {
        const backup: DraftBackup = { title, content, savedAt: Date.now() };
        localStorage.setItem(lsKey(postId), JSON.stringify(backup));
    } catch {
        // localStorage penuh atau diblokir — silent fail
    }
}

export function loadDraftFromLS(postId: string): DraftBackup | null {
    try {
        const raw = localStorage.getItem(lsKey(postId));
        if (!raw) return null;
        return JSON.parse(raw) as DraftBackup;
    } catch {
        return null;
    }
}

export function clearDraftFromLS(postId: string): void {
    try {
        localStorage.removeItem(lsKey(postId));
    } catch { }
}

export function formatRelativeTime(ms: number): string {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
}