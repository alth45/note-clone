"use client";

// app/components/write/hooks/useCoverImage.ts
// Mengelola state cover image: load dari server, preview lokal, save ke server.

import { useState, useCallback } from "react";

export type CoverStatus = "idle" | "uploading" | "saved" | "error";

interface UseCoverImageOptions {
    postId: string;
    onError?: (msg: string) => void;
}

interface UseCoverImageReturn {
    coverUrl: string;
    coverStatus: CoverStatus;
    setCoverUrl: (url: string) => void;
    saveCover: (url: string) => Promise<void>;
    removeCover: () => Promise<void>;
}

export function useCoverImage({
    postId,
    onError,
}: UseCoverImageOptions): UseCoverImageReturn {
    const [coverUrl, setCoverUrl] = useState("");
    const [coverStatus, setCoverStatus] = useState<CoverStatus>("idle");

    const saveCover = useCallback(async (url: string) => {
        if (!url.trim()) return;
        setCoverStatus("uploading");
        try {
            const res = await fetch(`/api/posts/${postId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coverImage: url.trim() }),
            });
            if (!res.ok) throw new Error("server error");
            setCoverUrl(url.trim());
            setCoverStatus("saved");
            setTimeout(() => setCoverStatus("idle"), 2000);
        } catch {
            setCoverStatus("error");
            onError?.("Gagal menyimpan cover image.");
            setTimeout(() => setCoverStatus("idle"), 3000);
        }
    }, [postId, onError]);

    const removeCover = useCallback(async () => {
        setCoverStatus("uploading");
        try {
            const res = await fetch(`/api/posts/${postId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coverImage: null }),
            });
            if (!res.ok) throw new Error("server error");
            setCoverUrl("");
            setCoverStatus("idle");
        } catch {
            setCoverStatus("error");
            onError?.("Gagal menghapus cover image.");
            setTimeout(() => setCoverStatus("idle"), 3000);
        }
    }, [postId, onError]);

    return { coverUrl, coverStatus, setCoverUrl, saveCover, removeCover };
}