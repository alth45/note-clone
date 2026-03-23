"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, ChevronRight, X, Eye } from "lucide-react";

export default function PostRecommendation({ posts = [] }: { posts?: any[] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const popularPosts = posts
        .filter(post => post.published && (post.views || 0) > 20)
        .sort((a, b) => (b.views || 0) - (a.views || 0));

    if (popularPosts.length === 0) return null;

    const sidebarPicks = popularPosts.slice(0, 4).map(post => ({
        id: post.id,
        slug: post.slug,
        title: post.title,
        views: post.views,
        image: post.coverImage || "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=400&auto=format&fit=crop"
    }));

    const half = Math.ceil(popularPosts.length / 2);
    const trendingTech = popularPosts.slice(0, half);
    const eksplorasi = popularPosts.slice(half);

    const modalData = [
        {
            category: "Trending & Viral 🔥",
            items: trendingTech.map(post => ({
                id: post.id,
                slug: post.slug,
                title: post.title,
                views: post.views,
                image: post.coverImage || "https://images.unsplash.com/photo-1555099962-4199c345e5dd?q=80&w=600&auto=format&fit=crop"
            }))
        }
    ];

    if (eksplorasi.length > 0) {
        modalData.push({
            category: "Paling Banyak Dibaca",
            items: eksplorasi.map(post => ({
                id: post.id,
                slug: post.slug,
                title: post.title,
                views: post.views,
                image: post.coverImage || "https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?q=80&w=600&auto=format&fit=crop"
            }))
        });
    }

    return (
        <>
            {/* --- TAMPILAN SIDEBAR --- */}
            <aside className="hidden lg:block w-72 xl:w-80 shrink-0">
                <div className="sticky top-28">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-sumi-muted uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp size={14} className="text-emerald-500" /> Pilihan Editor
                        </h3>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-[10px] font-bold uppercase tracking-wider text-sumi-light hover:text-sumi flex items-center gap-1 bg-sumi-10 hover:bg-sumi/10 px-2 py-1 rounded-md transition-all"
                        >
                            Eksplor <ChevronRight size={12} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {sidebarPicks.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => setIsModalOpen(true)}
                                className="group relative aspect-square rounded-xl overflow-hidden bg-washi-dark shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-sumi-10"
                            >
                                <img
                                    src={post.image}
                                    alt={post.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-sumi/90 via-sumi/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1">
                                    <h4 className="text-xs font-bold text-washi leading-snug line-clamp-2">
                                        {post.title}
                                    </h4>
                                    <span className="text-[9px] font-medium text-washi/70 flex items-center gap-1">
                                        <Eye size={10} /> {post.views}x Dilihat
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* --- MODAL --- */}
            {isModalOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-sumi/40 backdrop-blur-sm z-[110] transition-opacity"
                        onClick={() => setIsModalOpen(false)}
                    />

                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-5xl bg-washi text-sumi rounded-2xl shadow-2xl z-[120] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-sumi-10">

                        <div className="flex items-center justify-between px-6 py-4 border-b border-sumi-10 bg-washi/80 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <span className="bg-emerald-500 text-washi px-2 py-0.5 rounded-md font-black text-lg leading-none tracking-tighter">E</span>
                                <h2 className="text-lg font-bold tracking-tight">Eksplorasi Konten</h2>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 rounded-full text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[75vh] scrollbar-hide">
                            {modalData.map((category, index) => (
                                <div key={index} className="mb-8 last:mb-2">
                                    <h3 className="text-base font-bold mb-3 text-sumi">
                                        {category.category}
                                    </h3>

                                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-hide">
                                        {category.items.map((item) => (
                                            // ✅ FIX: /read/ → /post/
                                            <Link
                                                href={`/post/${item.slug}`}
                                                key={item.id}
                                                className="group shrink-0 w-[220px] md:w-[260px] snap-start relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_8px_30px_rgb(28,28,30,0.12)] bg-washi border border-sumi-10 flex flex-col"
                                            >
                                                <div className="aspect-video w-full relative border-b border-sumi-10">
                                                    <img
                                                        src={item.image}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="p-3 bg-washi group-hover:bg-washi-dark transition-colors flex-1 flex flex-col justify-between">
                                                    <h4 className="font-bold text-sm text-sumi line-clamp-1 mt-2">{item.title}</h4>
                                                    <div className="flex items-center gap-2 mt-3 text-[10px] font-bold text-sumi-muted">
                                                        <span className="text-emerald-600 flex items-center gap-1">
                                                            <Eye size={10} /> {item.views} Dilihat
                                                        </span>
                                                        <span>•</span>
                                                        <span>Topik Hangat</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}