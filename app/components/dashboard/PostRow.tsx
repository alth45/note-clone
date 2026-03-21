"use client";

// components/dashboard/PostRow.tsx
// Satu baris artikel di list dashboard.

import Link from "next/link";
import {
    Clock, Eye, ExternalLink, Bookmark,
    BookmarkX, MoreHorizontal, Loader2,
} from "lucide-react";
import type { Tab, DashboardPost } from "@/hooks/useDashboard";

interface PostRowProps {
    post: DashboardPost;
    activeTab: Tab;
    isRemoving: boolean;
    onRemoveBookmark: (id: string) => void;
}

export default function PostRow({
    post,
    activeTab,
    isRemoving,
    onRemoveBookmark,
}: PostRowProps) {
    const date = new Date(post.updatedAt || post.createdAt).toLocaleDateString(
        "id-ID",
        { day: "numeric", month: "short", year: "numeric" }
    );

    return (
        <div className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-sumi-10 bg-washi hover:shadow-[0_8px_30px_rgb(28,28,30,0.04)] hover:border-sumi/20 transition-all duration-300">
            <div className="flex-1">
                <Link href={`/write/${post.id}`} className="inline-block">
                    <h3 className="text-lg font-bold text-sumi mb-2 group-hover:text-sumi-light transition-colors line-clamp-1">
                        {post.title}
                    </h3>
                </Link>

                <div className="flex items-center gap-3 text-xs text-sumi-muted font-medium flex-wrap">
                    <span className="flex items-center gap-1">
                        <Clock size={12} /> {date}
                    </span>

                    {activeTab === "published" && (
                        <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Eye size={12} /> {post.views || 0} views
                            </span>
                        </>
                    )}

                    {activeTab === "saved" && post.bookmarkedAt && (
                        <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Bookmark size={12} />
                                Disimpan {new Date(post.bookmarkedAt).toLocaleDateString("id-ID", {
                                    day: "numeric", month: "short",
                                })}
                            </span>
                            {post.author && (
                                <>
                                    <span>•</span>
                                    <span className="text-sumi">{post.author.name}</span>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 mt-2 md:mt-0">
                {(activeTab === "published" || activeTab === "saved") && post.published && (
                    <Link
                        href={`/post/${post.slug}`}
                        className="p-2 text-sumi-muted hover:text-sumi hover:bg-sumi/5 rounded-full transition-colors"
                        title="Baca Artikel"
                    >
                        <ExternalLink size={18} />
                    </Link>
                )}

                {activeTab === "saved" && (
                    <button
                        onClick={() => onRemoveBookmark(post.id)}
                        disabled={isRemoving}
                        className="p-2 text-sumi-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-40"
                        title="Hapus dari tersimpan"
                    >
                        {isRemoving
                            ? <Loader2 size={18} className="animate-spin" />
                            : <BookmarkX size={18} />
                        }
                    </button>
                )}

                {activeTab !== "saved" && (
                    <button
                        className="p-2 text-sumi-muted hover:text-sumi hover:bg-sumi/5 rounded-full transition-colors"
                        title="Opsi Lainnya"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                )}
            </div>
        </div>
    );
}