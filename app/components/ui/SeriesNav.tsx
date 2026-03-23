"use client";

// components/ui/SeriesNav.tsx
// Dipasang di halaman baca artikel (/post/[slug]) kalau artikel ada dalam series.
// Menampilkan:
//   - Nama series + progress bar
//   - Tombol prev / next artikel
//   - Link ke halaman series (TOC lengkap)

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, List, X } from "lucide-react";

interface SeriesPostItem {
    order: number;
    post: {
        id: string;
        title: string;
        slug: string;
        published: boolean;
    };
}

interface SeriesData {
    id: string;
    title: string;
    slug: string;
    posts: SeriesPostItem[];
}

interface SeriesNavProps {
    // slug artikel yang sedang dibaca
    currentSlug: string;
    // slug series (dari query param ?series=xxx atau dari server)
    seriesSlug: string;
}

export default function SeriesNav({ currentSlug, seriesSlug }: SeriesNavProps) {
    const [series, setSeries] = useState<SeriesData | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetch(`/api/series/by-slug/${seriesSlug}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (data) setSeries(data); })
            .catch(() => { });
    }, [seriesSlug]);

    if (!series) return null;

    const publishedPosts = series.posts.filter((sp) => sp.post.published);
    const currentIndex = publishedPosts.findIndex((sp) => sp.post.slug === currentSlug);

    if (currentIndex === -1) return null;

    const prevPost = currentIndex > 0 ? publishedPosts[currentIndex - 1] : null;
    const nextPost = currentIndex < publishedPosts.length - 1 ? publishedPosts[currentIndex + 1] : null;
    const progress = Math.round(((currentIndex + 1) / publishedPosts.length) * 100);

    return (
        <>
            {/* ── Sticky bar di bagian bawah ── */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-washi/95 backdrop-blur-md border-t border-sumi-10 shadow-[0_-8px_30px_rgb(28,28,30,0.06)]">

                {/* Progress bar */}
                <div className="h-0.5 bg-sumi-10">
                    <div
                        className="h-full bg-sumi transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">

                    {/* Tombol TOC */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex items-center gap-2 text-xs font-medium text-sumi-muted hover:text-sumi transition-colors shrink-0"
                        title="Daftar isi series"
                    >
                        <BookOpen size={15} />
                        <span className="hidden sm:inline max-w-[140px] truncate">
                            {series.title}
                        </span>
                    </button>

                    {/* Progress text */}
                    <span className="text-[10px] text-sumi-muted/60 font-medium shrink-0">
                        {currentIndex + 1} / {publishedPosts.length}
                    </span>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Prev */}
                    {prevPost ? (
                        <Link
                            href={`/post/${prevPost.post.slug}?series=${seriesSlug}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sumi-10 text-xs font-medium text-sumi-muted hover:text-sumi hover:border-sumi/30 hover:bg-sumi/5 transition-all"
                        >
                            <ChevronLeft size={14} />
                            <span className="hidden sm:inline max-w-[100px] truncate">
                                {prevPost.post.title}
                            </span>
                            <span className="sm:hidden">Prev</span>
                        </Link>
                    ) : (
                        <div className="px-3 py-1.5 text-xs text-sumi-muted/30 cursor-not-allowed">
                            <ChevronLeft size={14} />
                        </div>
                    )}

                    {/* Next */}
                    {nextPost ? (
                        <Link
                            href={`/post/${nextPost.post.slug}?series=${seriesSlug}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sumi text-washi text-xs font-bold hover:bg-sumi-light transition-all"
                        >
                            <span className="hidden sm:inline max-w-[100px] truncate">
                                {nextPost.post.title}
                            </span>
                            <span className="sm:hidden">Next</span>
                            <ChevronRight size={14} />
                        </Link>
                    ) : (
                        <div className="px-3 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            Selesai
                        </div>
                    )}
                </div>
            </div>

            {/* ── TOC Drawer ── */}
            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[50] bg-sumi/30 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-washi rounded-t-3xl border-t border-sumi-10 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[70vh] flex flex-col">

                        {/* Handle + header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-sumi-10 shrink-0">
                            <div className="flex items-center gap-2">
                                <BookOpen size={16} className="text-sumi-muted" />
                                <h3 className="text-sm font-bold text-sumi">{series.title}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link
                                    href={`/series/${series.slug}`}
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs text-sumi-muted hover:text-sumi transition-colors flex items-center gap-1"
                                >
                                    <List size={13} /> Lihat semua
                                </Link>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 text-sumi-muted hover:text-sumi transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="px-6 py-3 border-b border-sumi-10 shrink-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-sumi-muted">Progress</span>
                                <span className="text-xs font-bold text-sumi">{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-sumi-10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-sumi rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* List artikel */}
                        <div className="overflow-y-auto flex-1 px-4 py-3 scrollbar-hide">
                            {publishedPosts.map((sp, index) => {
                                const isCurrent = sp.post.slug === currentSlug;
                                const isDone = index < currentIndex;

                                return (
                                    <Link
                                        key={sp.post.id}
                                        href={`/post/${sp.post.slug}?series=${seriesSlug}`}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1 transition-colors ${isCurrent
                                            ? "bg-sumi/5 border border-sumi/10"
                                            : "hover:bg-sumi/5"
                                            }`}
                                    >
                                        {/* Indicator */}
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isCurrent
                                            ? "bg-sumi text-washi"
                                            : isDone
                                                ? "bg-emerald-500/15 text-emerald-600"
                                                : "bg-sumi-10 text-sumi-muted"
                                            }`}>
                                            {isDone ? "✓" : index + 1}
                                        </div>

                                        <span className={`text-sm line-clamp-1 ${isCurrent
                                            ? "font-bold text-sumi"
                                            : isDone
                                                ? "text-sumi-muted line-through"
                                                : "text-sumi-light"
                                            }`}>
                                            {sp.post.title}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}