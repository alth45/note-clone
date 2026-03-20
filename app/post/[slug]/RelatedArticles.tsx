"use client";

import Link from "next/link";
import { Clock, Folder, User, TrendingUp, ArrowRight } from "lucide-react";

type RelatedReason = "folder" | "author" | "recent";

interface RelatedPost {
    id: string;
    title: string;
    slug: string;
    views: number | null;
    updatedAt: Date | string;
    author: { name: string | null } | null;
}

interface RelatedArticlesProps {
    posts: RelatedPost[];
    reason: RelatedReason;
}

// ─── Deterministic color per slug (sama kayak PostCard) ───────────────────────
function getAccent(slug: string): string {
    const palette = [
        "#4A5568", "#718096", "#2C7A7B", "#4C51BF",
        "#C53030", "#B7791F", "#2F855A", "#2B6CB0", "#97266D",
    ];
    let hash = 0;
    for (let i = 0; i < slug.length; i++) {
        hash = slug.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
}

// ─── Label & icon per reason ──────────────────────────────────────────────────
const REASON_META: Record<RelatedReason, { label: string; icon: React.ReactNode }> = {
    folder: {
        label: "Dalam seri yang sama",
        icon: <Folder size={13} />,
    },
    author: {
        label: "Dari penulis yang sama",
        icon: <User size={13} />,
    },
    recent: {
        label: "Artikel terbaru",
        icon: <TrendingUp size={13} />,
    },
};

export default function RelatedArticles({ posts, reason }: RelatedArticlesProps) {
    if (!posts || posts.length === 0) return null;

    const meta = REASON_META[reason];

    return (
        <section className="mt-20 pt-10 border-t border-sumi-10">

            {/* Header */}
            <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto px-6 md:px-8">
                <div className="flex items-center gap-2 text-sumi-muted text-xs font-bold uppercase tracking-widest">
                    <span className="text-sumi">{meta.icon}</span>
                    {meta.label}
                </div>
                {reason !== "recent" && (
                    <span className="text-[10px] text-sumi-muted/60 font-medium">
                        {posts.length} artikel
                    </span>
                )}
            </div>

            {/* Grid */}
            <div className="max-w-3xl mx-auto px-6 md:px-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {posts.map((post) => {
                    const accent = getAccent(post.slug);
                    const date = new Intl.DateTimeFormat("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                    }).format(new Date(post.updatedAt));

                    return (
                        <Link
                            key={post.id}
                            href={`/post/${post.slug}`}
                            className="group flex flex-col bg-washi rounded-2xl border border-sumi-10 overflow-hidden hover:shadow-[0_8px_30px_rgb(28,28,30,0.06)] hover:border-sumi/20 transition-all duration-300"
                        >
                            {/* Color bar */}
                            <div
                                className="h-1.5 w-full transition-all duration-300 group-hover:h-2"
                                style={{ backgroundColor: accent }}
                            />

                            <div className="p-4 flex flex-col flex-1">
                                {/* Judul */}
                                <h3 className="text-sm font-bold text-sumi line-clamp-2 leading-snug group-hover:text-sumi-light transition-colors mb-3">
                                    {post.title}
                                </h3>

                                {/* Meta */}
                                <div className="flex items-center justify-between mt-auto text-[11px] text-sumi-muted">
                                    <div className="flex items-center gap-2">
                                        {post.author?.name && (
                                            <span className="font-medium text-sumi-light truncate max-w-[100px]">
                                                {post.author.name}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} />
                                            {date}
                                        </span>
                                    </div>
                                    <ArrowRight
                                        size={14}
                                        className="text-sumi-muted/0 group-hover:text-sumi-muted/100 transition-all -translate-x-1 group-hover:translate-x-0"
                                    />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}