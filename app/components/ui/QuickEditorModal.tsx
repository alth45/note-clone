"use client";

import { X, Save, Maximize2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickEditorProps {
    isOpen: boolean;
    filename: string;
    onClose: () => void;
}

export default function QuickEditorModal({ isOpen, filename, onClose }: QuickEditorProps) {
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-sumi/40 backdrop-blur-sm z-[150] transition-opacity" onClick={onClose} />

            {/* Modal Editor Mini */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-2xl bg-washi rounded-2xl shadow-2xl border border-sumi-10 z-[160] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header Terminal-style */}
                <div className="flex items-center justify-between px-4 py-3 bg-washi-dark/80 border-b border-sumi-10">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-400"></span>
                        <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                        <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                        <span className="ml-2 text-xs font-mono font-bold text-sumi-muted flex items-center gap-1">
                            ~/{filename.replace('.md', '')}<span className="text-sumi">.md</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { onClose(); router.push('/write'); }}
                            className="p-1.5 text-sumi-muted hover:text-sumi hover:bg-sumi/10 rounded transition-colors"
                            title="Buka di Editor Penuh"
                        >
                            <Maximize2 size={14} />
                        </button>
                        <button onClick={onClose} className="p-1.5 text-sumi-muted hover:text-sumi hover:bg-sumi/10 rounded transition-colors">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Text Area Mini */}
                <div className="p-4 bg-washi">
                    <input
                        type="text"
                        defaultValue={filename.replace('.md', '')}
                        className="text-xl font-bold text-sumi w-full bg-transparent outline-none border-b border-sumi-10 pb-2 mb-4"
                    />
                    <textarea
                        autoFocus
                        placeholder="Mulai ngetik cepat di sini..."
                        className="w-full h-[300px] bg-transparent resize-none outline-none text-sm text-sumi-light leading-relaxed placeholder:text-sumi-muted/40 font-mono"
                    />
                </div>

                {/* Footer Actions */}
                <div className="px-4 py-3 border-t border-sumi-10 bg-washi-dark/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-sumi-muted hover:text-sumi transition-colors">Batal</button>
                    <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 bg-sumi text-washi text-xs font-bold rounded-lg hover:bg-sumi-light transition-colors">
                        <Save size={14} /> Simpan Draft
                    </button>
                </div>

            </div>
        </>
    );
}