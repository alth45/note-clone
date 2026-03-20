"use client";

// hooks/useNtcDownload.ts
// Satu tanggung jawab: export konten editor sebagai file .ntc.

import { useState, useCallback } from "react";
import { htmlToNtc, titleToSlug } from "@/components/write/utils/htmlToNtc";

interface UseNtcDownloadOptions {
    title: string;
    content: string;
    onError?: (msg: string) => void;
}

interface UseNtcDownloadReturn {
    isDownloading: boolean;
    handleDownload: () => void;
}

export function useNtcDownload({
    title,
    content,
    onError,
}: UseNtcDownloadOptions): UseNtcDownloadReturn {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = useCallback(() => {
        setIsDownloading(true);
        try {
            const ntcContent = htmlToNtc(content);
            const slug = titleToSlug(title || "tanpa-judul");

            // Tambah # H1 kalau belum ada
            const hasH1 = ntcContent.trimStart().startsWith("# ");
            const fileBody = hasH1 ? ntcContent : `# ${title}\n\n${ntcContent}`;

            const blob = new Blob([fileBody], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${slug}.ntc`;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Download .ntc failed:", err);
            onError?.("Gagal mengekspor file.");
        } finally {
            setTimeout(() => setIsDownloading(false), 800);
        }
    }, [title, content, onError]);

    return { isDownloading, handleDownload };
}