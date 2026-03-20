"use client";

// app/components/write/components/CoverImageUploader.tsx
// Cover image uploader dengan 3 mode input:
//   1. Paste URL
//   2. Upload file lokal (base64 preview — untuk real upload butuh storage backend)
//   3. Unsplash random suggestion

import { useState, useRef, useCallback } from "react";
import { ImagePlus, Link2, Upload, Trash2, Loader2, Check, X, RefreshCw } from "lucide-react";
import type { CoverStatus } from "@/components/write/hooks/useCoverImage";

// Palette Unsplash topics yang relevan untuk platform catatan teknis
const UNSPLASH_TOPICS = [
    "technology", "coding", "minimal", "desk", "abstract",
    "nature", "architecture", "dark", "pattern", "texture",
];

function randomUnsplashUrl(): string {
    const topic = UNSPLASH_TOPICS[Math.floor(Math.random() * UNSPLASH_TOPICS.length)];
    // Unsplash Source API — tidak butuh API key, free
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
    const [activeTab, setActiveTab] = useState<"url" | "upload" | "suggest">("url");
    const [urlInput, setUrlInput] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");
    const [imgError, setImgError] = useState(false);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── URL tab ───────────────────────────────────────────────────────────────
    const handleUrlChange = useCallback((val: string) => {
        setUrlInput(val);
        setImgError(false);
        if (val.trim().startsWith("http")) {
            setPreviewUrl(val.trim());
        } else {
            setPreviewUrl("");
        }
    }, []);

    // ── Upload tab — base64 preview ────────────────────────────────────────────
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validasi
        if (!file.type.startsWith("image/")) {
            alert("Hanya file gambar yang diizinkan.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("Ukuran file maksimal 5 MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            setPreviewUrl(dataUrl);
            setUrlInput(dataUrl);
        };
        reader.readAsDataURL(file);
    }, []);

    // ── Suggest tab — Unsplash random ─────────────────────────────────────────
    const handleSuggest = useCallback(() => {
        setIsLoadingPreview(true);
        setImgError(false);
        const url = randomUnsplashUrl();
        setPreviewUrl(url);
        setUrlInput(url);
    }, []);

    // ── Apply ─────────────────────────────────────────────────────────────────
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
    };

    const isBusy = status === "uploading";

    // ── Render: sudah ada cover ───────────────────────────────────────────────
    if (coverUrl) {
        return (
            <div className="relative w-full h-52 rounded-2xl overflow-hidden mb-6 group border border-sumi-10">
                <img
                    src={coverUrl}
                    alt="Cover artikel"
                    className="w-full h-full object-cover"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-sumi/0 group-hover:bg-sumi/40 transition-all duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <button
                        onClick={() => { setIsOpen(true); setActiveTab("url"); }}
                        className="flex items-center gap-2 px-3 py-2 bg-washi text-sumi text-xs font-bold rounded-xl hover:bg-washi-dark transition-colors shadow-md"
                    >
                        <ImagePlus size={14} /> Ganti
                    </button>
                    <button
                        onClick={onRemove}
                        disabled={isBusy}
                        className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors shadow-md disabled:opacity-50"
                    >
                        {isBusy
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />
                        }
                        Hapus
                    </button>
                </div>

                {/* Status badge */}
                {status === "saved" && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
                        <Check size={10} /> Tersimpan
                    </div>
                )}
                {status === "error" && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                        <X size={10} /> Gagal
                    </div>
                )}
            </div>
        );
    }

    // ── Render: belum ada cover ───────────────────────────────────────────────
    return (
        <>
            {/* Trigger button */}
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

            {/* Panel */}
            {isOpen && (
                <div className="mb-6 border border-sumi-10 rounded-2xl overflow-hidden bg-washi-dark/30">

                    {/* Tab bar */}
                    <div className="flex border-b border-sumi-10">
                        {(["url", "upload", "suggest"] as const).map((tab) => {
                            const labels = { url: "Paste URL", upload: "Upload file", suggest: "Pilihkan saya" };
                            const icons = {
                                url: <Link2 size={13} />,
                                upload: <Upload size={13} />,
                                suggest: <RefreshCw size={13} />,
                            };
                            return (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setPreviewUrl(""); setUrlInput(""); setImgError(false); }}
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

                        {/* Upload tab */}
                        {activeTab === "upload" && (
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-8 border-2 border-dashed border-sumi-10 rounded-xl text-sumi-muted hover:text-sumi hover:border-sumi/30 transition-colors text-sm flex flex-col items-center gap-2"
                                >
                                    <Upload size={20} />
                                    <span>Klik untuk pilih gambar</span>
                                    <span className="text-xs text-sumi-muted/60">JPG, PNG, WebP · maks 5 MB</span>
                                </button>
                                {!previewUrl && (
                                    <p className="mt-2 text-[10px] text-sumi-muted/60 text-center">
                                        Catatan: upload file akan disimpan sebagai base64. Untuk produksi, sambungkan ke Cloudinary atau S3.
                                    </p>
                                )}
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
                                    Menggunakan Unsplash Source API · selalu free
                                </p>
                            </div>
                        )}

                        {/* Preview */}
                        {previewUrl && !imgError && (
                            <div className="mt-4 relative rounded-xl overflow-hidden border border-sumi-10 bg-sumi-10/50" style={{ aspectRatio: "1200/630" }}>
                                <img
                                    src={previewUrl}
                                    alt="Preview cover"
                                    className="w-full h-full object-cover"
                                    onLoad={() => setIsLoadingPreview(false)}
                                    onError={() => { setImgError(true); setIsLoadingPreview(false); }}
                                />
                                {isLoadingPreview && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-washi-dark/50">
                                        <Loader2 size={20} className="animate-spin text-sumi-muted" />
                                    </div>
                                )}
                            </div>
                        )}

                        {imgError && (
                            <p className="mt-3 text-xs text-red-500 text-center">
                                Gambar tidak bisa dimuat. Coba URL lain.
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-xs font-medium text-sumi-muted hover:text-sumi transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleApply}
                                disabled={!previewUrl || imgError || isBusy}
                                className="flex items-center gap-2 px-4 py-2 bg-sumi text-washi text-xs font-bold rounded-xl hover:bg-sumi-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isBusy
                                    ? <><Loader2 size={12} className="animate-spin" /> Menyimpan...</>
                                    : <><Check size={12} /> Terapkan</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}