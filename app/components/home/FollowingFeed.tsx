"use client";

// components/home/FollowingFeed.tsx
// Tab "Following" di beranda — artikel dari user yang di-follow.
// Client component karena butuh session + infinite scroll.

import { useState, useEffect } from "react";
import { Loader2, UserPlus, ArrowRight } from "lucide-react";
import Link from "next/link";
import PostCard from "@/components/ui/PostCard";

interface FeedPost {
    id: string;
    title: string;
    slug: string;
    tags: string[];
    updatedAt: string;
    folderId: string | null;
    author: { name: string | null; image: string | null; handle: string | null };
}

export default function FollowingFeed() {
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [followingCount, setFollowingCount] = useState(0);

    const fetchFeed = async (cursorId?: string) => {
        const append = !!cursorId;
        if (append) setIsLoadingMore(true);
        else setIsLoading(true);

        try {
            const params = new URLSearchParams();
            if (cursorId) params.set("cursor", cursorId);

            const res = await fetch(`/api/feed/following?${params}`);
            const data = await res.json();

            if (data.message === "Harus login.") {
                setIsLoading(false);
                return;
            }

            if (append) {
                setPosts((prev) => [...prev, ...(data.posts ?? [])]);
            } else {
                setPosts(data.posts ?? []);
                setFollowingCount(data.followingCount ?? 0);
            }

            setHasMore(data.hasMore ?? false);
            setCursor(data.nextCursor ?? null);

        } catch {
            // silent
        } finally {
            if (append) setIsLoadingMore(false);
            else setIsLoading(false);
        }
    };

    useEffect(() => { fetchFeed(); }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 text-sumi-muted gap-2">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Memuat feed...</span>
            </div>
        );
    }

    // Belum follow siapapun
    if (followingCount === 0) {
        return (
            <div className="py-16 flex flex-col items-center text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                <div className="w-14 h-14 bg-washi border border-sumi-10 rounded-full flex items-center justify-center mb-4 text-sumi-muted">
                    <UserPlus size={22} />
                </div>
                <h3 className="text-base font-bold text-sumi mb-2">
                    Belum mengikuti siapapun
                </h3>
                <p className="text-sm text-sumi-muted max-w-xs mb-6">
                    Follow penulis favoritmu untuk melihat artikel terbaru mereka di sini.
                </p>
                <Link
                    href="/"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sumi text-washi text-sm font-bold hover:bg-sumi-light transition-colors"
                >
                    Jelajahi Penulis <ArrowRight size={15} />
                </Link>
            </div>
        );
    }

    // Sudah follow tapi belum ada artikel
    if (posts.length === 0) {
        return (
            <div className="py-16 text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                <p className="text-sm text-sumi-muted font-medium">
                    Penulis yang kamu ikuti belum mempublikasikan artikel.
                </p>
                <p className="text-xs text-sumi-muted/60 mt-1">
                    Cek lagi nanti!
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {posts.map((post) => (
                    <PostCard
                        key={post.id}
                        slug={post.slug}
                        title={post.title}
                        tags={post.tags}
                        excerpt={`Artikel terbaru dari ${post.author.name ?? "penulis"}.`}
                        author={post.author.name ?? "Anonim"}
                        date={new Intl.DateTimeFormat("id-ID", {
                            day: "numeric", month: "short", year: "numeric",
                        }).format(new Date(post.updatedAt))}
                        readTime="5 min"
                    />
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center">
                    <button
                        onClick={() => fetchFeed(cursor ?? undefined)}
                        disabled={isLoadingMore}
                        className="flex items-center gap-2 px-6 py-3 rounded-full border border-sumi-10 text-sm font-medium text-sumi-muted hover:text-sumi hover:border-sumi/30 hover:bg-sumi/5 transition-all disabled:opacity-50"
                    >
                        {isLoadingMore
                            ? <><Loader2 size={14} className="animate-spin" /> Memuat...</>
                            : "Tampilkan lebih banyak"
                        }
                    </button>
                </div>
            )}
        </div>
    );
}