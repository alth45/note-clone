/**
 * hooks/useUpload.ts
 *
 * Hook reusable untuk semua operasi upload gambar.
 * Dipakai oleh: CoverImageUploader, AvatarUploader, EditorToolbar.
 *
 * Cara pakai:
 *
 *   const { upload, isUploading, error } = useUpload("cover");
 *
 *   const handleFile = async (file: File) => {
 *     const url = await upload(file, oldUrl);
 *     if (url) onSave(url);
 *   };
 */

"use client";

import { useState, useCallback } from "react";

type UploadType = "cover" | "avatar" | "editor";

interface UseUploadReturn {
    upload: (file: File, oldUrl?: string) => Promise<string | null>;
    isUploading: boolean;
    progress: number; // 0–100, estimasi saja
    error: string | null;
    reset: () => void;
}

export function useUpload(type: UploadType): UseUploadReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setError(null);
        setProgress(0);
    }, []);

    const upload = useCallback(
        async (file: File, oldUrl?: string): Promise<string | null> => {
            setIsUploading(true);
            setError(null);
            setProgress(10);

            try {
                const form = new FormData();
                form.append("file", file);
                if (oldUrl) form.append("oldUrl", oldUrl);

                // Simulasi progress — fetch tidak expose upload progress
                const progressInterval = setInterval(() => {
                    setProgress((p) => Math.min(p + 15, 85));
                }, 200);

                const res = await fetch(`/api/upload?type=${type}`, {
                    method: "POST",
                    body: form,
                    // Tidak set Content-Type — biarkan browser set boundary untuk multipart
                });

                clearInterval(progressInterval);
                setProgress(95);

                const data = await res.json();

                if (!res.ok) {
                    setError(data.message ?? "Upload gagal.");
                    return null;
                }

                setProgress(100);
                return data.url as string;

            } catch (err) {
                setError("Koneksi bermasalah. Coba lagi.");
                return null;
            } finally {
                setIsUploading(false);
                // Reset progress setelah sebentar
                setTimeout(() => setProgress(0), 1000);
            }
        },
        [type]
    );

    return { upload, isUploading, progress, error, reset };
}