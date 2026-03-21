"use client";

// app/dashboard/page.tsx
// Orchestrator — tidak ada UI logic di sini.
// Semua logic ada di useDashboard, semua UI ada di komponen.

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import { useDashboard } from "@/hooks/useDashboard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStats from "@/components/dashboard/DashboardStats";
import DashboardTabs from "@/components/dashboard/DashboardTabs";
import PostList from "@/components/dashboard/PostList";

export default function DashboardPage() {
    const { status } = useSession();

    const {
        user,
        isEditing, setIsEditing,
        editName, setEditName,
        editHandle, setEditHandle,
        editBio, setEditBio,
        isLoadingPosts, isLoadingSaved,
        removingIds,
        activeTab, setActiveTab,
        postsByTab,
        publishedPosts, draftPosts, bookmarkedPosts,
        totalViews,
        handleCreateNewPost,
        handleSaveProfile,
        handleCancelEdit,
        handleRemoveBookmark,
    } = useDashboard();

    if (status === "loading") {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-sumi-muted" size={28} />
            </div>
        );
    }

    if (status === "unauthenticated" || !user) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-sumi mb-2">Akses Ditolak</h2>
                <p className="text-sumi-muted mb-6">Silakan masuk untuk melihat dashboard Anda.</p>
                <Link href="/login" className="px-6 py-2 bg-sumi text-washi rounded-full font-bold">
                    Masuk Sekarang
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto min-h-[80vh] pb-20">

            <DashboardHeader
                user={user}
                isEditing={isEditing}
                editName={editName}
                editHandle={editHandle}
                editBio={editBio}
                onEditName={setEditName}
                onEditHandle={setEditHandle}
                onEditBio={setEditBio}
                onStartEdit={() => setIsEditing(true)}
                onSave={handleSaveProfile}
                onCancel={handleCancelEdit}
                onCreatePost={handleCreateNewPost}
            />

            <DashboardStats
                totalPosts={publishedPosts.length + draftPosts.length}
                totalViews={totalViews}
                savedCount={bookmarkedPosts.length}
                isLoadingPosts={isLoadingPosts}
                isLoadingSaved={isLoadingSaved}
                activeTab={activeTab}
            />

            <DashboardTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                publishedCount={publishedPosts.length}
                draftCount={draftPosts.length}
                savedCount={bookmarkedPosts.length}
            />

            <PostList
                posts={postsByTab[activeTab]}
                activeTab={activeTab}
                isLoading={
                    activeTab === "saved" ? isLoadingSaved : isLoadingPosts
                }
                removingIds={removingIds}
                onRemoveBookmark={handleRemoveBookmark}
                onCreatePost={handleCreateNewPost}
            />

        </div>
    );
}