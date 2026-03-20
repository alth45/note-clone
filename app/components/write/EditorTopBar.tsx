"use client";

// components/write/EditorTopBar.tsx
// Sticky top bar: breadcrumb path, save status, download button, publish button.

import {
    CheckCircle2, Play, Loader2, CloudIcon, Check, Download
} from "lucide-react";
import type { SaveStatus } from "@/components/write/hooks/useEditorPost";

interface EditorTopBarProps {
    title: string;
    saveStatus: SaveStatus;
    isPublishing: boolean;
    isDownloading: boolean;
    isLoading: boolean;
    onDownload: () => void;
    onPublish: () => void;
}

export default function EditorTopBar({
    title,
    saveStatus,
    isPublishing,
    isDownloading,
    isLoading,
    onDownload,
    onPublish,
}: EditorTopBarProps) {
    return (
        <div className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-8 py-4 bg-washi/90 backdrop-blur-sm border-b border-sumi-10">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-medium text-sumi-muted truncate max-w-[50%]">
                <span className="truncate">Draft Lokal</span>
                <span className="text-sumi-10">/</span>
                <span className="text-sumi truncate">{title || "Tanpa Judul"}.md</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">

                {/* Save status indicator */}
                <div className="hidden md:flex items-center gap-1.5 text-xs font-medium transition-colors">
                    {saveStatus === "saving" && (
                        <>
                            <Loader2 size={14} className="animate-spin text-sumi-muted" />
                            <span className="text-sumi-muted">Menyimpan...</span>
                        </>
                    )}
                    {saveStatus === "saved" && (
                        <>
                            <Check size={14} className="text-emerald-500" />
                            <span className="text-emerald-600">Disimpan ke cloud</span>
                        </>
                    )}
                    {saveStatus === "error" && (
                        <>
                            <CloudIcon size={14} className="text-amber-500" />
                            <span className="text-amber-600 font-semibold">Gagal — tersimpan lokal</span>
                        </>
                    )}
                    {saveStatus === "idle" && (
                        <>
                            <CheckCircle2 size={14} className="text-sumi-muted/50" />
                            <span className="text-sumi-muted/70">Tersimpan otomatis</span>
                        </>
                    )}
                </div>

                {/* Download .ntc */}
                <button
                    onClick={onDownload}
                    disabled={isDownloading || isLoading}
                    title="Download sebagai file .ntc"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sumi-10 text-xs font-medium text-sumi-muted hover:text-sumi hover:border-sumi/30 hover:bg-sumi/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {isDownloading
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Download size={13} />
                    }
                    <span className="hidden sm:inline">
                        {isDownloading ? "Mengekspor..." : ".ntc"}
                    </span>
                </button>

                {/* Publish */}
                <button
                    onClick={onPublish}
                    disabled={isPublishing}
                    className="flex items-center gap-2 bg-sumi text-washi px-4 py-1.5 rounded-full text-xs font-bold hover:bg-sumi-light transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isPublishing
                        ? <Loader2 size={12} className="animate-spin text-washi" />
                        : <Play size={12} className="fill-washi" />
                    }
                    {isPublishing ? "Memproses..." : "Publikasikan"}
                </button>
            </div>
        </div>
    );
}