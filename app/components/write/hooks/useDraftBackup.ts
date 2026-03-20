"use client";

// hooks/useDraftBackup.ts
// Mengelola seluruh lifecycle localStorage backup:
//   - deteksi draft saat load
//   - simpan saat auto-save gagal
//   - offer recovery ke user
//   - apply / dismiss

import { useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
    DraftBackup,
    saveDraftToLS,
    loadDraftFromLS,
    clearDraftFromLS,
} from "@/components/write/utils/draftStorage";

interface UseDraftBackupOptions {
    postId: string;
    editor: Editor | null;
    setTitle: (t: string) => void;
    setContent: (c: string) => void;
    onRestoreComplete: () => void; // dipanggil setelah apply recovery
}

interface UseDraftBackupReturn {
    pendingBackup: DraftBackup | null;
    checkForBackup: (serverTitle: string, serverContent: string) => void;
    saveBackup: (title: string, content: string) => void;
    clearBackup: () => void;
    handleRestore: () => void;
    handleDismiss: () => void;
}

export function useDraftBackup({
    postId,
    editor,
    setTitle,
    setContent,
    onRestoreComplete,
}: UseDraftBackupOptions): UseDraftBackupReturn {
    const [pendingBackup, setPendingBackup] = useState<DraftBackup | null>(null);

    // Dipanggil setelah data server di-load — cek apakah ada LS backup yang lebih baru
    const checkForBackup = useCallback(
        (serverTitle: string, serverContent: string) => {
            const backup = loadDraftFromLS(postId);
            if (!backup) return;

            const isDifferent =
                backup.title !== serverTitle ||
                backup.content !== serverContent;

            if (isDifferent) {
                setPendingBackup(backup);
            } else {
                clearDraftFromLS(postId); // Sama — tidak relevan, bersihkan
            }
        },
        [postId]
    );

    const saveBackup = useCallback(
        (title: string, content: string) => {
            saveDraftToLS(postId, title, content);
        },
        [postId]
    );

    const clearBackup = useCallback(() => {
        clearDraftFromLS(postId);
    }, [postId]);

    // User klik "Pulihkan"
    const handleRestore = useCallback(() => {
        if (!pendingBackup || !editor) return;

        setTitle(pendingBackup.title);
        setContent(pendingBackup.content);
        editor.commands.setContent(pendingBackup.content);
        setPendingBackup(null);

        // Notifikasi ke parent biar auto-save guard bisa di-reset
        setTimeout(onRestoreComplete, 100);
    }, [pendingBackup, editor, setTitle, setContent, onRestoreComplete]);

    // User klik "Abaikan"
    const handleDismiss = useCallback(() => {
        clearDraftFromLS(postId);
        setPendingBackup(null);
    }, [postId]);

    return {
        pendingBackup,
        checkForBackup,
        saveBackup,
        clearBackup,
        handleRestore,
        handleDismiss,
    };
}