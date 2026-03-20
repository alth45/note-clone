"use client";

// hooks/useEditorPost.ts
// Semua logic yang berhubungan dengan data post:
//   - state (title, content, tags)
//   - load dari server saat mount
//   - auto-save dengan debounce
//   - publish
//   - status indikator

import { useState, useEffect, useRef, useCallback } from "react";
import type { Editor } from "@tiptap/react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseEditorPostOptions {
    postId: string;
    editor: Editor | null;
    // Callback saat load selesai — dipakai useDraftBackup untuk cek LS + useCoverImage untuk set initial cover
    onLoaded: (serverTitle: string, serverContent: string, serverCover: string | null) => void;
    // Callback saat save gagal — dipakai useDraftBackup untuk simpan ke LS
    onSaveFailed: (title: string, content: string) => void;
    // Callback saat save berhasil — clear LS backup
    onSaveSuccess: () => void;
    // Guard dari luar: kalau true, auto-save tidak jalan (misal saat restore)
    isApplyingBackup: React.MutableRefObject<boolean>;
}

interface UseEditorPostReturn {
    title: string;
    content: string;
    tags: string[];
    tagInput: string;
    saveStatus: SaveStatus;
    isPublishing: boolean;
    isInitialLoading: boolean;
    setTitle: (t: string) => void;
    setContent: (c: string) => void;
    setTags: React.Dispatch<React.SetStateAction<string[]>>;
    setTagInput: (v: string) => void;
    setSaveStatus: (s: SaveStatus) => void;
    handlePublish: () => Promise<void>;
}

export function useEditorPost({
    postId,
    editor,
    onLoaded,
    onSaveFailed,
    onSaveSuccess,
    isApplyingBackup,
}: UseEditorPostOptions): UseEditorPostReturn {
    const [title, setTitle] = useState("Tanpa Judul");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [isPublishing, setIsPublishing] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const isFirstRender = useRef(true);

    // ── Load dari server ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!editor) return;

        const load = async () => {
            try {
                const res = await fetch(`/api/posts/${postId}`);
                if (!res.ok) return;

                const data = await res.json();

                const serverTitle = data.title || "Tanpa Judul";
                const serverContent = typeof data.content === "string" ? data.content : "";
                const serverTags = Array.isArray(data.tags) ? data.tags : [];
                const serverCover = data.coverImage ?? null;

                setTitle(serverTitle);
                setContent(serverContent);
                setTags(serverTags);
                editor.commands.setContent(serverContent);

                onLoaded(serverTitle, serverContent, serverCover);
            } catch (err) {
                console.error("[useEditorPost] load failed:", err);
            } finally {
                setIsInitialLoading(false);
            }
        };

        load();
    }, [postId, editor]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-save (debounce 1 s) ──────────────────────────────────────────────
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (isApplyingBackup.current) return;

        setSaveStatus("saving");

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/posts/${postId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, content, tags }),
                });

                if (res.ok) {
                    onSaveSuccess();
                    setSaveStatus("saved");
                    setTimeout(() => setSaveStatus("idle"), 2000);
                } else {
                    throw new Error("server error");
                }
            } catch {
                onSaveFailed(title, content);
                setSaveStatus("error");
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [title, content, tags]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Publish ───────────────────────────────────────────────────────────────
    const handlePublish = useCallback(async () => {
        setIsPublishing(true);
        try {
            const res = await fetch(`/api/posts/${postId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, tags, published: true }),
            });
            return res.ok;
        } catch {
            return false;
        } finally {
            setIsPublishing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [postId, title, content, tags]) as () => Promise<any>;

    return {
        title, content, tags, tagInput, saveStatus,
        isPublishing, isInitialLoading,
        setTitle, setContent, setTags, setTagInput, setSaveStatus,
        handlePublish,
    };
}