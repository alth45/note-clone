"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, Calendar, TrendingUp, X } from "lucide-react";

export default function MobileExploreMenu() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* 1. Tombol Trigger (Hanya Muncul di Mobile) */}
            <button
                onClick={() => setIsOpen(true)}
                className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-sumi text-washi px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgb(28,28,30,0.3)] font-medium text-sm border border-sumi-light hover:scale-105 transition-transform"
            >
                <Compass size={16} /> Eksplor
            </button>

            {/* 2. Pop-up Menu Grid 2 Card */}
            {isOpen && (
                <>
                    {/* Backdrop gelap */}
                    <div
                        className="fixed inset-0 z-[100] bg-sumi/40 backdrop-blur-sm md:hidden transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Kotak Menu */}
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-[85vw] bg-washi rounded-2xl shadow-2xl border border-sumi-10 p-6 md:hidden animate-in fade-in zoom-in-95 duration-200">

                        <div className="flex justify-between items-center mb-6 border-b border-sumi-10 pb-3">
                            <h3 className="font-bold text-sumi flex items-center gap-2">
                                <Compass size={16} className="text-sumi-muted" /> Menu Eksplorasi
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 bg-washi-dark rounded-full text-sumi-muted hover:text-sumi transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Grid 2 Card */}
                        <div className="grid grid-cols-2 gap-4">

                            {/* Card 1: Timeline (Arah ke /calendar) */}
                            <Link
                                href="/calendar"
                                onClick={() => setIsOpen(false)}
                                className="flex flex-col items-center justify-center gap-3 bg-washi-dark p-6 rounded-xl border border-sumi-10 text-sumi hover:bg-sumi/5 transition-all active:scale-95"
                            >
                                <Calendar size={32} className="text-sumi-muted" />
                                <span className="text-sm font-bold">Timeline</span>
                            </Link>

                            {/* Card 2: Rekomendasi (Arah ke /explore) */}
                            <Link
                                href="/explore"
                                onClick={() => setIsOpen(false)}
                                className="flex flex-col items-center justify-center gap-3 bg-sumi text-washi p-6 rounded-xl shadow-[0_8px_20px_rgb(28,28,30,0.2)] hover:bg-sumi-light transition-all active:scale-95"
                            >
                                <span className="text-red-400 font-black text-2xl leading-none">E</span>
                                <span className="text-sm font-bold">Pilihan</span>
                            </Link>

                        </div>
                    </div>
                </>
            )}
        </>
    );
}