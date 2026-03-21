"use client";

// hooks/useDashboard.ts
// Semua state, fetching, dan handler dari dashboard dikumpulkan di sini.
// Komponen tinggal consume return value hook ini.

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/context/DialogContext";

export type Tab = "published" | "draft" | "saved";

export interface DashboardPost {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    views: number;
    folderId: string | null;
    updatedAt: string;
    createdAt: string;
    bookmarkedAt?: string;
    author?: { name: string | null };
}

export function useDashboard() {
    const { data: session, update } = useSession();
    const router = useRouter();
    const { showAlert } = useDialog();

    const user = session?.user as any;

    // ── Profile edit state ────────────────────────────────────────────────────
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editHandle, setEditHandle] = useState("");
    const [editBio, setEditBio] = useState("");

    // ── Content state ─────────────────────────────────────────────────────────
    const [dbPosts, setDbPosts] = useState<DashboardPost[]>([]);
    const [bookmarkedPosts, setBookmarkedPosts] = useState<DashboardPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<Tab>("published");

    // ── Sync profil dari session ──────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        setEditName(user.name || "");
        setEditHandle(user.handle || `@${user.email?.split("@")[0]}`);
        setEditBio(user.bio || "Belum ada bio. Tulis sesuatu tentang dirimu.");
    }, [session]);

    // ── Fetch artikel ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        fetch("/api/posts")
            .then((r) => r.json())
            .then((data) => { if (Array.isArray(data)) setDbPosts(data); })
            .catch(console.error)
            .finally(() => setIsLoadingPosts(false));
    }, [user?.email]);

    // ── Fetch bookmarks — lazy ─────────────────────────────────────────────────
    const fetchBookmarks = useCallback(async () => {
        setIsLoadingSaved(true);
        try {
            const res = await fetch("/api/bookmarks");
            const data = await res.json();
            if (Array.isArray(data)) setBookmarkedPosts(data);
        } catch {
            console.error("Gagal load bookmarks");
        } finally {
            setIsLoadingSaved(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "saved" && bookmarkedPosts.length === 0 && !isLoadingSaved) {
            fetchBookmarks();
        }
    }, [activeTab]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleCreateNewPost = useCallback(async () => {
        try {
            document.body.style.cursor = "wait";
            const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const newPost = await res.json();
            if (res.ok) router.push(`/write/${newPost.id}`);
            else showAlert("Gagal membuat artikel baru.", "Error", "danger");
        } catch {
            showAlert("Koneksi bermasalah.", "Error", "danger");
        } finally {
            document.body.style.cursor = "default";
        }
    }, [router, showAlert]);

    const handleSaveProfile = useCallback(async () => {
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, handle: editHandle, bio: editBio }),
            });
            const data = await res.json();
            if (!res.ok) { showAlert(data.message, "Gagal Menyimpan", "warning"); return; }
            await update({ name: editName, handle: editHandle, bio: editBio });
            showAlert(data.message, "Sukses", "success");
            setIsEditing(false);
        } catch {
            showAlert("Koneksi bermasalah.", "Error", "danger");
        }
    }, [editName, editHandle, editBio, update, showAlert]);

    const handleCancelEdit = useCallback(() => {
        setEditName(user?.name || "");
        setEditHandle(user?.handle || `@${user?.email?.split("@")[0]}`);
        setEditBio(user?.bio || "Belum ada bio. Tulis sesuatu tentang dirimu.");
        setIsEditing(false);
    }, [user]);

    const handleRemoveBookmark = useCallback(async (postId: string) => {
        setRemovingIds((prev) => new Set(prev).add(postId));
        setBookmarkedPosts((prev) => prev.filter((p) => p.id !== postId));
        try {
            await fetch("/api/interact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "bookmark", postId }),
            });
        } catch {
            await fetchBookmarks();
            showAlert("Gagal menghapus bookmark.", "Error", "danger");
        } finally {
            setRemovingIds((prev) => {
                const next = new Set(prev);
                next.delete(postId);
                return next;
            });
        }
    }, [fetchBookmarks, showAlert]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const publishedPosts = dbPosts.filter((p) => p.published);
    const draftPosts = dbPosts.filter((p) => !p.published);
    const totalViews = dbPosts.reduce((acc, p) => acc + (p.views || 0), 0);

    const postsByTab: Record<Tab, DashboardPost[]> = {
        published: publishedPosts,
        draft: draftPosts,
        saved: bookmarkedPosts,
    };

    return {
        // session
        user,
        // profile edit
        isEditing, setIsEditing,
        editName, setEditName,
        editHandle, setEditHandle,
        editBio, setEditBio,
        // data
        dbPosts, bookmarkedPosts,
        isLoadingPosts, isLoadingSaved,
        removingIds,
        // tabs
        activeTab, setActiveTab,
        postsByTab,
        // derived
        publishedPosts, draftPosts, totalViews,
        // handlers
        handleCreateNewPost,
        handleSaveProfile,
        handleCancelEdit,
        handleRemoveBookmark,
    };
}