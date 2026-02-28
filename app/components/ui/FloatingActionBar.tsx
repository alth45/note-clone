"use client";

import { useState, useEffect } from "react";
import { Heart, Bookmark, Share2, Command, MoreVertical } from "lucide-react";
import { useDialog } from "@/context/DialogContext"; // Hook buat notifikasi keren
import { useSession } from "next-auth/react";

// Terima prop dari halaman baca artikel
interface FloatingActionBarProps {
    postId: string;
    initialLikes?: number;
    hasLiked?: boolean;
    hasBookmarked?: boolean;
}

export default function FloatingActionBar({
    postId,
    initialLikes = 0,
    hasLiked = false,
    hasBookmarked = false
}: FloatingActionBarProps) {
    const { data: session } = useSession();
    const { showAlert } = useDialog();

    const [isOpen, setIsOpen] = useState(false);

    // State buat nampung angka dan status dari database
    const [liked, setLiked] = useState(hasLiked);
    const [likesCount, setLikesCount] = useState(initialLikes);
    const [bookmarked, setBookmarked] = useState(hasBookmarked);

    // Shortcut Keyboard (Ctrl + J atau Cmd + J)
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // FUNGSI HANDLE LIKE (Optimistic Update)
    const handleLike = async () => {
        if (!session) {
            showAlert("Belum Masuk", "Silakan login untuk menyukai artikel ini.", "warning");
            return;
        }

        // Langsung ubah di layar biar kerasa cepet
        const wasLiked = liked;
        setLiked(!wasLiked);
        setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

        try {
            await fetch("/api/interact", {
                method: "POST",
                body: JSON.stringify({ action: "like", postId })
            });
        } catch (error) {
            // Kalau gagal nyambung, balikin lagi angkanya
            setLiked(wasLiked);
            setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
            showAlert("Gagal", "Koneksi ke server terputus.", "danger");
        }
    };

    // FUNGSI HANDLE BOOKMARK
    const handleBookmark = async () => {
        if (!session) {
            showAlert("Belum Masuk", "Silakan login untuk menyimpan artikel ini.", "warning");
            return;
        }

        const wasBookmarked = bookmarked;
        setBookmarked(!wasBookmarked);

        try {
            const res = await fetch("/api/interact", {
                method: "POST",
                body: JSON.stringify({ action: "bookmark", postId })
            });

            if (res.ok) {
                if (!wasBookmarked) showAlert("Tersimpan!", "Artikel ditambahkan ke daftar simpanan Anda.", "success");
            }
        } catch (error) {
            setBookmarked(wasBookmarked);
            showAlert("Gagal", "Tidak dapat menyimpan artikel saat ini.", "danger");
        }
    };

    // FUNGSI HANDLE SHARE KEREN
    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showAlert("Tautan Disalin! 🔗", "Bagikan artikel ini ke media sosial atau teman Anda.", "success");
            setIsOpen(false);
        } catch (err) {
            showAlert("Gagal", "Browser Anda tidak mendukung fitur copy link.", "danger");
        }
    };

    return (
        <>
            {/* 1. TRIGGER DESKTOP */}
            <button
                onClick={() => setIsOpen(true)}
                className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 px-3 py-1.5 rounded-full bg-washi-dark/50 backdrop-blur-sm border border-sumi-10 text-sumi-muted hover:text-sumi hover:bg-sumi/10 transition-all opacity-40 hover:opacity-100 shadow-sm"
                title="Buka Menu Aksi (Ctrl+J)"
            >
                <Command size={14} />
                <span className="text-[10px] font-bold tracking-widest">J</span>
            </button>

            {/* 2. TRIGGER MOBILE */}
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center justify-center bg-washi/80 backdrop-blur-md border border-r-0 border-sumi-10 text-sumi-muted p-2 rounded-l-2xl shadow-[-4px_0_15px_rgba(28,28,30,0.05)] opacity-60 hover:opacity-100 transition-opacity"
            >
                <MoreVertical size={20} className="mr-0.5" />
            </button>

            {/* 3. POP-UP KAPSUL AKSI */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[100] bg-sumi/10 backdrop-blur-[2px] transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] animate-in fade-in zoom-in-90 duration-200">
                        <div className="flex flex-col items-center gap-3 md:gap-4">

                            <div className="flex items-center gap-1 md:gap-2 bg-washi/90 backdrop-blur-md border border-sumi-10 p-1.5 md:p-2 rounded-[2rem] shadow-[0_20px_40px_rgba(28,28,30,0.15)]">

                                {/* Tombol Like */}
                                <button
                                    onClick={handleLike}
                                    className="group flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] hover:bg-sumi/5 transition-all"
                                >
                                    <Heart
                                        size={24}
                                        className={`mb-1 md:mb-1.5 transition-colors md:w-[28px] md:h-[28px] ${liked ? "fill-red-500 text-red-500" : "text-sumi-muted group-hover:text-sumi"}`}
                                    />
                                    <span className={`text-[10px] md:text-[11px] font-bold transition-colors ${liked ? "text-red-500" : "text-sumi-muted group-hover:text-sumi"}`}>
                                        {likesCount}
                                    </span>
                                </button>

                                <div className="w-[1px] h-10 md:h-12 bg-sumi-10"></div>

                                {/* Tombol Bookmark */}
                                <button
                                    onClick={handleBookmark}
                                    className="group flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] hover:bg-sumi/5 transition-all"
                                >
                                    <Bookmark
                                        size={24}
                                        className={`mb-1 md:mb-1.5 transition-colors md:w-[28px] md:h-[28px] ${bookmarked ? "fill-sumi text-sumi" : "text-sumi-muted group-hover:text-sumi"}`}
                                    />
                                    <span className={`text-[10px] md:text-[11px] font-bold transition-colors ${bookmarked ? "text-sumi" : "text-sumi-muted group-hover:text-sumi"}`}>
                                        Simpan
                                    </span>
                                </button>

                                <div className="w-[1px] h-10 md:h-12 bg-sumi-10"></div>

                                {/* Tombol Share */}
                                <button
                                    onClick={handleShare}
                                    className="group flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-[1.5rem] hover:bg-sumi/5 transition-all"
                                >
                                    <Share2 size={24} className="mb-1 md:mb-1.5 md:w-[28px] md:h-[28px] text-sumi-muted group-hover:text-sumi transition-colors" />
                                    <span className="text-[10px] md:text-[11px] font-bold text-sumi-muted group-hover:text-sumi">
                                        Bagikan
                                    </span>
                                </button>

                            </div>

                            <span className="text-[9px] md:text-[10px] text-sumi-muted/80 bg-washi-dark px-3 py-1.5 rounded-full border border-sumi-10 shadow-sm tracking-wide">
                                <span className="hidden md:inline">Tekan <strong className="text-sumi">ESC</strong> untuk kembali membaca</span>
                                <span className="md:hidden">Ketuk di luar kotak untuk menutup</span>
                            </span>

                        </div>
                    </div>
                </>
            )}
        </>
    );
}