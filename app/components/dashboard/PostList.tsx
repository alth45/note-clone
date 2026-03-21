"use client";

// components/dashboard/PostList.tsx
// Render list PostRow atau empty/loading state.

import { FileText, Bookmark, Plus, Loader2 } from "lucide-react";
import PostRow from "./PostRow";
import type { Tab, DashboardPost } from "@/hooks/useDashboard";

interface PostListProps {
    posts: DashboardPost[];
    activeTab: Tab;
    isLoading: boolean;
    removingIds: Set<string>;
    onRemoveBookmark: (id: string) => void;
    onCreatePost: () => void;
}

export default function PostList({
    posts,
    activeTab,
    isLoading,
    removingIds,
    onRemoveBookmark,
    onCreatePost,
}: PostListProps) {
    if (isLoading) {
        return (
            <div className="py-20 flex justify-center">
                <Loader2 className="animate-spin text-sumi-muted" size={32} />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="py-16 flex flex-col items-center justify-center text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                <div className="w-16 h-16 bg-washi border border-sumi-10 rounded-full flex items-center justify-center mb-4 text-sumi-muted">
                    {activeTab === "saved" ? <Bookmark size={24} /> : <FileText size={24} />}
                </div>
                <h3 className="text-base font-bold text-sumi mb-1">
                    {activeTab === "saved"
                        ? "Belum ada artikel tersimpan"
                        : "Belum ada tulisan di sini"}
                </h3>
                <p className="text-sm text-sumi-muted max-w-sm mb-6">
                    {activeTab === "saved"
                        ? "Tekan ikon bookmark saat membaca artikel untuk menyimpannya di sini."
                        : "Mulai tuangkan ide dan pikiran Anda ke dalam tulisan pertama."}
                </p>
                {activeTab !== "saved" && (
                    <button
                        onClick={onCreatePost}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-washi border border-sumi-10 text-sm font-bold text-sumi hover:bg-sumi/5 transition-colors"
                    >
                        <Plus size={16} /> Mulai Menulis
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {posts.map((post) => (
                <PostRow
                    key={post.id}
                    post={post}
                    activeTab={activeTab}
                    isRemoving={removingIds.has(post.id)}
                    onRemoveBookmark={onRemoveBookmark}
                />
            ))}
        </div>
    );
}