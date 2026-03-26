/**
 * app/components/write/components/CoverImageUploader.tsx
 *
 * Gantikan file yang sudah ada.
 *
 * Perubahan vs versi lama:
 *  - Tab "Upload file" sekarang benar-benar upload ke Supabase Storage
 *  - Progress bar saat uploading
 *  - File lama otomatis dihapus dari storage saat ganti cover
 *  - Error handling yang proper
 */

"use client";

import { useState, useRef, useCallback } from "react";
import {
    ImagePlus, Link2, Upload, Trash2,
    Loader2, Check, X, RefreshCw,
} from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import type { CoverStatus } from "@/components/write/hooks/useCoverImage";

const UNSPLASH_TOPICS = [
    "technology", "coding", "minimal", "desk", "abstract",
    "nature", "architecture", "dark", "pattern", "texture",
];

function randomUnsplashUrl(): string {
    const topic = UNSPLASH_TOPICS[Math.floor(Math.random() * UNSPLASH_TOPICS.length)];
    return `https://source.unsplash.com/1200x630/?${topic}&sig=${Date.now()}`;
}

interface CoverImageUploaderProps {
    coverUrl: string;
    status: CoverStatus;
    onSave: (url: string) => void;
    onRemove: () => void;
}

export default function CoverImageUploader({
    coverUrl,
    status,
    onSave,
    onRemove,
}: CoverImageUploaderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"url" | "upload" | "suggest">("upload");
    const [urlInput, setUrlInput] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [imgError, setImgError] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { upload, isUploading, progress, error: uploadError, reset: resetUpload } = useUpload("cover");

    // ── URL tab ───────────────────────────────────────────────────────────────
    const handleUrlChange = useCallback((val: string) => {
        setUrlInput(val);
        setImgError(false);
        if (val.trim().startsWith("http")) setPreviewUrl(val.trim());
        else setPreviewUrl("");
    }, []);

    // ── Upload tab — kirim ke Supabase ────────────────────────────────────────
    const handleFileChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Preview lokal dulu biar responsif
            const localUrl = URL.createObjectURL(file);
            setPreviewUrl(localUrl);
            setImgError(false);
            resetUpload();

            // Upload ke Supabase, pass oldUrl supaya yang lama dihapus
            const uploadedUrl = await upload(file, coverUrl || undefined);

            URL.revokeObjectURL(localUrl); // bersihkan object URL

            if (uploadedUrl) {
                // Langsung apply — tidak perlu klik "Terapkan" lagi
                onSave(uploadedUrl);
                setIsOpen(false);
                setPreviewUrl("");
            } else {
                setPreviewUrl(""); // upload gagal, hapus preview
            }
        },
        [upload, coverUrl, onSave, resetUpload]
    );

    // ── Suggest tab ───────────────────────────────────────────────────────────
    const handleSuggest = useCallback(() => {
        setImgError(false);
        const url = randomUnsplashUrl();
        setPreviewUrl(url);
        setUrlInput(url);
    }, []);

    // ── Apply URL ─────────────────────────────────────────────────────────────
    const handleApply = () => {
        if (!previewUrl || imgError) return;
        onSave(previewUrl);
        setIsOpen(false);
        setUrlInput("");
        setPreviewUrl("");
    };

    const handleCancel = () => {
        setIsOpen(false);
        setUrlInput("");
        setPreviewUrl("");
        setImgError(false);
        resetUpload();
    };

    const isBusy = status === "uploading" || isUploading;

    // ── Sudah ada cover ───────────────────────────────────────────────────────
    if (coverUrl) {
        return (
            <div className="relative w-full h-52 rounded-2xl overflow-hidden mb-6 group border border-sumi-10">
                <img
                    src={coverUrl}
                    alt="Cover artikel"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-sumi/0 group-hover:bg-sumi/40 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <button
                        onClick={() => { setIsOpen(true); setActiveTab("upload"); }}
                        className="flex items-center gap-2 px-3 py-2 bg-washi text-sumi text-xs font-bold rounded-xl hover:bg-washi-dark transition-colors shadow-md"
                    >
                        <ImagePlus size={14} /> Ganti
                    </button>
                    <button
                        onClick={onRemove}
                        disabled={isBusy}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors shadow-md disabled:opacity-50"
                    >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Hapus
                    </button>
                </div>
                {status === "saved" && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                        <Check size={10} /> Tersimpan
                    </div>
                )}
            </div>
        );
    }

    // ── Belum ada cover ───────────────────────────────────────────────────────
    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 mb-6 text-sm text-sumi-muted hover:text-sumi transition-colors group"
                >
                    <div className="w-8 h-8 rounded-xl border border-dashed border-sumi-10 group-hover:border-sumi/30 flex items-center justify-center transition-colors">
                        <ImagePlus size={14} />
                    </div>
                    <span>Tambah cover image</span>
                </button>
            )}

            {isOpen && (
                <div className="mb-6 border border-sumi-10 rounded-2xl overflow-hidden bg-washi-dark/30">

                    {/* Tab bar */}
                    <div className="flex border-b border-sumi-10">
                        {(["upload", "url", "suggest"] as const).map((tab) => {
                            const labels = { upload: "Upload file", url: "Paste URL", suggest: "Pilihkan saya" };
                            const icons = {
                                upload: <Upload size={13} />,
                                url: <Link2 size={13} />,
                                suggest: <RefreshCw size={13} />,
                            };
                            return (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setPreviewUrl("");
                                        setUrlInput("");
                                        setImgError(false);
                                        resetUpload();
                                    }}
                                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors border-b-2 ${activeTab === tab
                                            ? "border-sumi text-sumi bg-washi"
                                            : "border-transparent text-sumi-muted hover:text-sumi"
                                        }`}
                                >
                                    {icons[tab]} {labels[tab]}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-4">

                        {/* Upload tab */}
                        {activeTab === "upload" && (
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-full py-8 border-2 border-dashed border-sumi-10 rounded-xl text-sumi-muted hover:text-sumi hover:border-sumi/30 transition-colors text-sm flex flex-col items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            <span>Mengupload ke Supabase...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={20} />
                                            <span>Klik untuk pilih gambar</span>
                                            <span className="text-xs text-sumi-muted/60">JPG, PNG, WebP · maks 5 MB</span>
                                        </>
                                    )}
                                </button>

                                {/* Progress bar */}
                                {isUploading && progress > 0 && (
                                    <div className="mt-3 h-1.5 bg-sumi-10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-sumi transition-all duration-300 rounded-full"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                )}

                                {/* Error */}
                                {uploadError && (
                                    <p className="mt-3 text-xs text-red-500 text-center">{uploadError}</p>
                                )}
                            </div>
                        )}

                        {/* URL tab */}
                        {activeTab === "url" && (
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => handleUrlChange(e.target.value)}
                                    placeholder="https://images.unsplash.com/..."
                                    className="flex-1 text-sm bg-washi border border-sumi-10 rounded-xl px-3 py-2 outline-none focus:border-sumi transition-colors text-sumi placeholder:text-sumi-muted/40"
                                    autoFocus
                                />
                            </div>
                        )}

                        {/* Suggest tab */}
                        {activeTab === "suggest" && (
                            <div className="flex flex-col items-center gap-3">
                                <button
                                    onClick={handleSuggest}
                                    className="flex items-center gap-2 px-4 py-2 bg-sumi text-washi text-xs font-bold rounded-xl hover:bg-sumi-light transition-colors"
                                >
                                    <RefreshCw size={13} /> Generate gambar acak
                                </button>
                                <p className="text-[10px] text-sumi-muted/60 text-center">
                                    Dari Unsplash · selalu gratis
                                </p>
                            </div>
                        )}

                        {/* Preview untuk URL/Suggest */}
                        {previewUrl && !imgError && activeTab !== "upload" && (
                            <div className="mt-4 relative rounded-xl overflow-hidden border border-sumi-10 bg-sumi-10/50" style={{ aspectRatio: "1200/630" }}>
                                <img
                                    src={previewUrl}
                                    alt="Preview cover"
                                    className="w-full h-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                            </div>
                        )}

                        {imgError && (
                            <p className="mt-3 text-xs text-red-500 text-center">
                                Gambar tidak bisa dimuat. Coba URL lain.
                            </p>
                        )}

                        {/* Actions — hanya untuk URL/Suggest tab */}
                        {activeTab !== "upload" && (
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-xs font-medium text-sumi-muted hover:text-sumi transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleApply}
                                    disabled={!previewUrl || imgError}
                                    className="flex items-center gap-2 px-4 py-2 bg-sumi text-washi text-xs font-bold rounded-xl hover:bg-sumi-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Check size={12} /> Terapkan
                                </button>
                            </div>
                        )}

                        {/* Cancel untuk upload tab */}
                        {activeTab === "upload" && !isUploading && (
                            <div className="flex justify-end mt-3">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-xs font-medium text-sumi-muted hover:text-sumi transition-colors"
                                >
                                    Batal
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}