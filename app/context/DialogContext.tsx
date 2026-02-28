"use client";

import { createContext, useContext, useState, ReactNode, useRef, useEffect } from "react";
// Import tambahan ikon buat berbagai jenis alert
import { AlertCircle, HelpCircle, MessageSquare, X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

type DialogType = "alert" | "confirm" | "prompt";
// Tipe baru untuk varian Alert
export type AlertVariant = "success" | "warning" | "danger" | "info";

interface DialogState {
    isOpen: boolean;
    type: DialogType;
    title: string;
    message: string;
    defaultValue?: string;
    variant?: AlertVariant; // Nyimpen data varian alert
    resolve: (value: any) => void;
}

interface DialogContextType {
    // Update showAlert biar bisa nerima varian
    showAlert: (message: string, title?: string, variant?: AlertVariant) => Promise<void>;
    showConfirm: (message: string, title?: string) => Promise<boolean>;
    showPrompt: (message: string, title?: string, defaultValue?: string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
    const [dialog, setDialog] = useState<DialogState | null>(null);
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (dialog?.isOpen && dialog.type === "prompt" && inputRef.current) {
            inputRef.current.focus();
        }
    }, [dialog]);

    // --- FUNGSI SAKTI PEMANGGIL DIALOG DIUPGRADE ---
    // Sekarang defaultnya "info", tapi bisa diganti "success", "warning", atau "danger"
    const showAlert = (message: string, title = "Informasi", variant: AlertVariant = "info") => {
        return new Promise<void>((resolve) => {
            setDialog({ isOpen: true, type: "alert", title, message, variant, resolve });
        });
    };

    const showConfirm = (message: string, title = "Konfirmasi") => {
        return new Promise<boolean>((resolve) => {
            setDialog({ isOpen: true, type: "confirm", title, message, resolve });
        });
    };

    const showPrompt = (message: string, title = "Input Dibutuhkan", defaultValue = "") => {
        setInputValue(defaultValue);
        return new Promise<string | null>((resolve) => {
            setDialog({ isOpen: true, type: "prompt", title, message, defaultValue, resolve });
        });
    };

    const handleClose = (value: any) => {
        if (dialog) {
            dialog.resolve(value);
            setDialog({ ...dialog, isOpen: false });
            setTimeout(() => setDialog(null), 200);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (dialog?.type === "alert") handleClose(undefined);
            if (dialog?.type === "confirm") handleClose(true);
            if (dialog?.type === "prompt") handleClose(inputValue);
        }
    };

    // --- LOGIKA WARNA TOMBOL UTAMA ---
    let primaryBtnClass = "bg-sumi text-washi hover:bg-sumi-light"; // Default (Hitam)
    if (dialog?.type === "alert" && dialog.variant === "danger") {
        primaryBtnClass = "bg-red-500 text-washi hover:bg-red-600"; // Merah khusus error fatal
    } else if (dialog?.type === "alert" && dialog.variant === "success") {
        primaryBtnClass = "bg-emerald-600 text-washi hover:bg-emerald-700"; // Hijau khusus sukses
    }

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}

            {dialog && (
                <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 ${dialog.isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>

                    <div className="absolute inset-0 bg-sumi/40 backdrop-blur-sm" onClick={() => dialog.type !== 'alert' ? handleClose(dialog.type === 'confirm' ? false : null) : handleClose(undefined)} />

                    <div className={`relative bg-washi w-full max-w-sm rounded-2xl shadow-2xl border border-sumi-10 overflow-hidden transform transition-all duration-200 ${dialog.isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>

                        {/* Header Dialog */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-sumi-10 bg-washi-dark/50">

                            {/* RENDER IKON BERDASARKAN VARIAN ALERT */}
                            {dialog.type === "alert" && (
                                <>
                                    {dialog.variant === "success" && <CheckCircle2 size={18} className="text-emerald-500" />}
                                    {dialog.variant === "warning" && <AlertTriangle size={18} className="text-amber-500" />}
                                    {dialog.variant === "danger" && <XCircle size={18} className="text-red-500" />}
                                    {dialog.variant === "info" && <Info size={18} className="text-blue-500" />}
                                </>
                            )}

                            {dialog.type === "confirm" && <HelpCircle size={18} className="text-blue-500" />}
                            {dialog.type === "prompt" && <MessageSquare size={18} className="text-emerald-500" />}

                            <h3 className="font-bold text-sumi flex-1">{dialog.title}</h3>

                            <button onClick={() => dialog.type === 'alert' ? handleClose(undefined) : handleClose(dialog.type === 'confirm' ? false : null)} className="text-sumi-muted hover:text-sumi transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Isi Dialog */}
                        <div className="p-5">
                            <p className="text-sm text-sumi-light mb-4 leading-relaxed">{dialog.message}</p>

                            {dialog.type === "prompt" && (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full bg-washi-dark border border-sumi-10 rounded-lg px-3 py-2 text-sm text-sumi outline-none focus:border-sumi transition-colors"
                                    placeholder="Ketik di sini..."
                                />
                            )}
                        </div>

                        {/* Tombol Aksi */}
                        <div className="px-5 py-4 bg-washi-dark/80 border-t border-sumi-10 flex justify-end gap-3">

                            {dialog.type !== "alert" && (
                                <button
                                    onClick={() => handleClose(dialog.type === 'confirm' ? false : null)}
                                    className="px-4 py-2 rounded-lg text-xs font-bold text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors"
                                >
                                    Batal
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    if (dialog.type === "alert") handleClose(undefined);
                                    if (dialog.type === "confirm") handleClose(true);
                                    if (dialog.type === "prompt") handleClose(inputValue);
                                }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${primaryBtnClass}`}
                            >
                                {dialog.type === "alert" ? "Mengerti" : "Konfirmasi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DialogContext.Provider>
    );
}

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) throw new Error("useDialog harus di dalam DialogProvider");
    return context;
};