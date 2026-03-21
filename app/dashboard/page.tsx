"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    PenSquare, Settings, FileText, Eye, Bookmark,
    MoreHorizontal, Plus, Clock, ExternalLink, Camera,
    Save, X, Loader2, BookmarkX
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useDialog } from "@/context/DialogContext";
import { useRouter } from "next/navigation";
import { BarChart2 } from "lucide-react";



type Tab = "published" | "draft" | "saved";

export default function DashboardPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const { showAlert } = useDialog();
    const [activeTab, setActiveTab] = useState<Tab>("published");

    // ── Profil state ──────────────────────────────────────────────────────────
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editHandle, setEditHandle] = useState("");
    const [editBio, setEditBio] = useState("");

    // ── Data state ────────────────────────────────────────────────────────────
    const [dbPosts, setDbPosts] = useState<any[]>([]);
    const [bookmarkedPosts, setBookmarkedPosts] = useState<any[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);
    // Track which bookmarks are being removed (optimistic UI)
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

    // ── Sync profil dari session ──────────────────────────────────────────────
    useEffect(() => {
        if (session?.user) {
            const u = session.user as any;
            setEditName(u.name || "");
            setEditHandle(u.handle || `@${u.email?.split("@")[0]}`);
            setEditBio(u.bio || "Belum ada bio. Tulis sesuatu tentang dirimu.");
        }
    }, [session]);

    // ── Fetch artikel ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!session?.user) return;
        fetch("/api/posts")
            .then((r) => r.json())
            .then((data) => { if (Array.isArray(data)) setDbPosts(data); })
            .catch(console.error)
            .finally(() => setIsLoadingPosts(false));
    }, [session]);

    // ── Fetch bookmarks — lazy, hanya saat tab aktif ──────────────────────────
    const fetchBookmarks = useCallback(async () => {
        setIsLoadingSaved(true);
        try {
            const res = await fetch("/api/bookmarks");
            const data = await res.json();
            if (Array.isArray(data)) setBookmarkedPosts(data);
        } catch (err) {
            console.error("Gagal load bookmarks:", err);
        } finally {
            setIsLoadingSaved(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === "saved" && bookmarkedPosts.length === 0 && !isLoadingSaved) {
            fetchBookmarks();
        }
    }, [activeTab]);

    // ── Hapus bookmark ────────────────────────────────────────────────────────
    const handleRemoveBookmark = async (postId: string) => {
        // Optimistic: langsung hilangkan dari UI
        setRemovingIds((prev) => new Set(prev).add(postId));
        setBookmarkedPosts((prev) => prev.filter((p) => p.id !== postId));

        try {
            await fetch("/api/interact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "bookmark", postId }),
            });
        } catch {
            // Rollback kalau gagal — refetch ulang
            await fetchBookmarks();
            showAlert("Gagal menghapus bookmark.", "Error", "danger");
        } finally {
            setRemovingIds((prev) => {
                const next = new Set(prev);
                next.delete(postId);
                return next;
            });
        }
    };

    // ── Guard ─────────────────────────────────────────────────────────────────
    if (status === "loading") {
        return (
            <div className="min-h-[60vh] flex items-center justify-center text-sumi-muted font-medium animate-pulse">
                Memuat data markas...
            </div>
        );
    }
    if (status === "unauthenticated" || !session?.user) {
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

    const user = session.user;

    // ── Derived data ──────────────────────────────────────────────────────────
    const publishedPosts = dbPosts.filter((p) => p.published);
    const draftPosts = dbPosts.filter((p) => !p.published);
    const totalViews = dbPosts.reduce((acc, p) => acc + (p.views || 0), 0);

    const stats = {
        posts: dbPosts.length,
        views: totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + "k" : totalViews,
        saved: bookmarkedPosts.length,
    };

    const filteredPosts: any[] =
        activeTab === "published" ? publishedPosts :
            activeTab === "draft" ? draftPosts :
                bookmarkedPosts;

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleCreateNewPost = async () => {
        try {
            document.body.style.cursor = "wait";
            const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const newPost = await res.json();
            if (res.ok) {
                router.push(`/write/${newPost.id}`);
            } else {
                showAlert("Gagal membuat artikel baru.", "Error", "danger");
            }
        } catch {
            showAlert("Koneksi bermasalah.", "Error", "danger");
        } finally {
            document.body.style.cursor = "default";
        }
    };

    const handleSaveProfile = async () => {
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
    };

    const handleCancelEdit = () => {
        const u = user as any;
        setEditName(u.name || "");
        setEditHandle(u.handle || `@${u.email?.split("@")[0]}`);
        setEditBio(u.bio || "Belum ada bio. Tulis sesuatu tentang dirimu.");
        setIsEditing(false);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto min-h-[80vh] pb-20">

            {/* ── Header Profil ── */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12 pb-12 border-b border-sumi-10 mt-8">
                <div className="flex flex-col md:flex-row items-start gap-6 w-full md:w-auto">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border border-sumi-10 bg-washi-dark shrink-0 group">
                        <img
                            src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=1c1c1e&color=f4f4f5`}
                            alt={user.name || "User"}
                            className={`w-full h-full object-cover transition-all ${isEditing ? "opacity-50 blur-[2px]" : ""}`}
                        />
                        {isEditing && (
                            <button className="absolute inset-0 flex flex-col items-center justify-center text-washi bg-sumi/40 hover:bg-sumi/60 transition-colors z-10 cursor-pointer">
                                <Camera size={24} />
                            </button>
                        )}
                    </div>

                    <div className="w-full md:w-[400px]">
                        {isEditing ? (
                            <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama Lengkap"
                                    className="text-2xl md:text-3xl font-bold text-sumi bg-transparent border-b border-sumi-10 focus:border-sumi outline-none pb-1 w-full" />
                                <input type="text" value={editHandle} onChange={(e) => setEditHandle(e.target.value)} placeholder="Username / Handle"
                                    className="text-sm font-medium text-sumi-muted bg-transparent border-b border-sumi-10 focus:border-sumi outline-none pb-1 w-full" />
                                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tulis bio singkat..."
                                    className="text-sm text-sumi-light leading-relaxed bg-transparent border border-sumi-10 rounded-xl p-3 outline-none focus:border-sumi resize-none h-24 w-full mt-2" />
                            </div>
                        ) : (
                            <div className="animate-in fade-in duration-200">
                                <h1 className="text-3xl font-bold text-sumi tracking-tight mb-1">{editName}</h1>
                                <p className="text-sm font-medium text-sumi-muted mb-3">{editHandle}</p>
                                <p className="text-sm text-sumi-light max-w-md leading-relaxed">{editBio}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    {isEditing ? (
                        <>
                            <button onClick={handleCancelEdit}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sumi-10 text-sm font-medium text-sumi hover:bg-sumi/5 transition-colors">
                                <X size={16} /> Batal
                            </button>
                            <button onClick={handleSaveProfile}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-sumi text-washi text-sm font-bold hover:bg-sumi-light transition-all">
                                <Save size={16} /> Simpan
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sumi-10 text-sm font-medium text-sumi hover:bg-sumi/5 transition-colors">
                                <Settings size={16} /> Edit Profil
                            </button>
                            <button onClick={() => signOut({ callbackUrl: "/" })}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                                Keluar
                            </button>
                            <Link
                                href="/dashboard/analytics"
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sumi-10 text-sm font-medium text-sumi hover:bg-sumi/5 transition-colors"
                            >
                                <BarChart2 size={16} /> Analitik
                            </Link>
                            <button onClick={handleCreateNewPost}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-sumi text-washi text-sm font-bold hover:bg-sumi-light hover:-translate-y-0.5 transition-all duration-300">
                                <PenSquare size={16} /> Tulis Baru
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Statistik ── */}
            <div className="grid grid-cols-3 gap-4 mb-12">
                {[
                    { icon: <FileText size={20} />, value: stats.posts, label: "Postingan" },
                    { icon: <Link href="/dashboard/analytics"><Eye size={20} />, value: stats.views, label: "Total Views"</Link> },
                    { icon: <Bookmark size={20} />, value: isLoadingSaved && activeTab !== "saved" ? "—" : stats.saved, label: "Tersimpan" },
                ].map(({ icon, value, label }) => (

                    <div key={label} className="bg-washi-dark/50 border border-sumi-10 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                        <span className="text-sumi-muted mb-2">{icon}</span>
                        {isLoadingPosts && label !== "Tersimpan"
                            ? <Loader2 className="animate-spin text-sumi mb-1" size={24} />
                            : <span className="text-2xl font-black text-sumi mb-1">{value}</span>
                        }
                        <span className="text-[10px] font-bold text-sumi-muted uppercase tracking-widest">{label}</span>
                    </div>
                ))}
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-6 border-b border-sumi-10 mb-8 overflow-x-auto scrollbar-hide">
                {(["published", "draft", "saved"] as Tab[]).map((tab) => {
                    const labels: Record<Tab, string> = {
                        published: "Telah Terbit",
                        draft: "Draf",
                        saved: "Tersimpan",
                    };
                    const counts: Record<Tab, number> = {
                        published: publishedPosts.length,
                        draft: draftPosts.length,
                        saved: bookmarkedPosts.length,
                    };
                    const isActive = activeTab === tab;
                    return (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-bold transition-colors relative whitespace-nowrap ${isActive ? "text-sumi" : "text-sumi-muted hover:text-sumi-light"}`}>
                            {labels[tab]}
                            {counts[tab] > 0 && (
                                <span className={`ml-1 text-[10px] ${tab === "draft"
                                    ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-1.5 py-0.5 rounded-full"
                                    : "opacity-50"
                                    }`}>
                                    ({counts[tab]})
                                </span>
                            )}
                            {isActive && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sumi rounded-t-full" />}
                        </button>
                    );
                })}
            </div>

            {/* ── List Konten ── */}
            <div className="flex flex-col gap-4">

                {/* Loading states */}
                {(activeTab !== "saved" && isLoadingPosts) || (activeTab === "saved" && isLoadingSaved) ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="animate-spin text-sumi-muted" size={32} />
                    </div>

                ) : filteredPosts.length === 0 ? (
                    /* Empty states */
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
                            <button onClick={handleCreateNewPost}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-washi border border-sumi-10 text-sm font-bold text-sumi hover:bg-sumi/5 transition-colors">
                                <Plus size={16} /> Mulai Menulis
                            </button>
                        )}
                    </div>

                ) : (
                    filteredPosts.map((post) => (
                        <div key={post.id}
                            className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-sumi-10 bg-washi hover:shadow-[0_8px_30px_rgb(28,28,30,0.04)] hover:border-sumi/20 transition-all duration-300">
                            <div className="flex-1">
                                <Link href={`/write/${post.id}`} className="inline-block">
                                    <h3 className="text-lg font-bold text-sumi mb-2 group-hover:text-sumi-light transition-colors line-clamp-1">
                                        {post.title}
                                    </h3>
                                </Link>
                                <div className="flex items-center gap-3 text-xs text-sumi-muted font-medium flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {new Date(post.updatedAt || post.createdAt).toLocaleDateString("id-ID", {
                                            day: "numeric", month: "short", year: "numeric",
                                        })}
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
                                {/* Tombol buka artikel publik */}
                                {(activeTab === "published" || activeTab === "saved") && post.published && (
                                    <Link href={`/post/${post.slug}`}
                                        className="p-2 text-sumi-muted hover:text-sumi hover:bg-sumi/5 rounded-full transition-colors"
                                        title="Baca Artikel">
                                        <ExternalLink size={18} />
                                    </Link>
                                )}

                                {/* Tombol hapus bookmark — hanya di tab saved */}
                                {activeTab === "saved" && (
                                    <button
                                        onClick={() => handleRemoveBookmark(post.id)}
                                        disabled={removingIds.has(post.id)}
                                        className="p-2 text-sumi-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-40"
                                        title="Hapus dari tersimpan">
                                        {removingIds.has(post.id)
                                            ? <Loader2 size={18} className="animate-spin" />
                                            : <BookmarkX size={18} />
                                        }
                                    </button>
                                )}

                                {activeTab !== "saved" && (
                                    <button className="p-2 text-sumi-muted hover:text-sumi hover:bg-sumi/5 rounded-full transition-colors"
                                        title="Opsi Lainnya">
                                        <MoreHorizontal size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}