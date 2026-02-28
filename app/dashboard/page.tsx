"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    PenSquare, Settings, FileText, Eye, Bookmark,
    MoreHorizontal, Plus, Clock, ExternalLink, Camera, Save, X, Loader2
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useDialog } from "@/context/DialogContext";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const { showAlert } = useDialog();
    const [activeTab, setActiveTab] = useState<"published" | "draft" | "saved">("published");

    // --- STATE PROFIL ---
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editHandle, setEditHandle] = useState("");
    const [editBio, setEditBio] = useState("");

    // --- STATE DATABASE ---
    const [dbPosts, setDbPosts] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // CEK BIO ASLI DARI SESSION
    useEffect(() => {
        if (session?.user) {
            const currentUser = session.user as any;
            setEditName(currentUser.name || "");
            setEditHandle(currentUser.handle || `@${currentUser.email?.split('@')[0]}`);
            setEditBio(currentUser.bio || "Belum ada bio. Tulis sesuatu tentang dirimu.");
        }
    }, [session]);

    // TARIK DATA POSTINGAN DARI POSTGRESQL
    useEffect(() => {
        if (session?.user) {
            fetch("/api/posts")
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setDbPosts(data);
                })
                .catch(err => console.error("Gagal load posts:", err))
                .finally(() => setIsLoadingData(false));
        }
    }, [session]);

    if (status === "loading") {
        return <div className="min-h-[60vh] flex items-center justify-center text-sumi-muted font-medium animate-pulse">Memuat data markas...</div>;
    }

    if (status === "unauthenticated" || !session?.user) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl font-bold text-sumi mb-2">Akses Ditolak</h2>
                <p className="text-sumi-muted mb-6">Silakan masuk untuk melihat dashboard Anda.</p>
                <Link href="/login" className="px-6 py-2 bg-sumi text-washi rounded-full font-bold">Masuk Sekarang</Link>
            </div>
        );
    }

    const user = session.user;

    // --- LOGIKA FILTER & STATISTIK ---
    const publishedPosts = dbPosts.filter(p => p.published);
    const draftPosts = dbPosts.filter(p => !p.published);

    const filteredPosts = dbPosts.filter(post => {
        if (activeTab === "published") return post.published;
        if (activeTab === "draft") return !post.published;
        if (activeTab === "saved") return false; // Fitur bookmark belum ada di DB
        return false;
    });

    const totalViews = dbPosts.reduce((acc, curr) => acc + (curr.views || 0), 0);
    const stats = {
        posts: dbPosts.length,
        views: totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + "k" : totalViews,
        saved: 0 // Placeholder fitur bookmark
    };

    // FUNGSI SAKTI BIKIN DRAFT
    const handleCreateNewPost = async () => {
        try {
            document.body.style.cursor = "wait";
            const res = await fetch("/api/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const newPost = await res.json();

            if (res.ok) {
                router.push(`/write/${newPost.id}`);
            } else {
                showAlert("Gagal membuat artikel baru.", "Error", "danger");
            }
        } catch (error) {
            showAlert("Koneksi bermasalah.", "Error", "danger");
        } finally {
            document.body.style.cursor = "default";
        }
    };

    // UPDATE FUNGSI SIMPAN
    const handleSaveProfile = async () => {
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, handle: editHandle, bio: editBio })
            });

            const data = await res.json();
            if (!res.ok) {
                showAlert(data.message, "Gagal Menyimpan", "warning");
                return;
            }

            await update({ name: editName, handle: editHandle, bio: editBio });
            showAlert(data.message, "Sukses", "success");
            setIsEditing(false);

        } catch (error) {
            showAlert("Koneksi bermasalah. Coba lagi nanti.", "Error", "danger");
        }
    };

    const handleCancelEdit = () => {
        setEditName(user.name || "");
        setEditHandle((user as any).handle || `@${user.email?.split('@')[0]}`);
        setEditBio((user as any).bio || "Belum ada bio. Tulis sesuatu tentang dirimu.");
        setIsEditing(false);
    };

    return (
        <div className="max-w-5xl mx-auto min-h-[80vh] pb-20">

            {/* --- HEADER PROFIL --- */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-12 pb-12 border-b border-sumi-10 mt-8">
                <div className="flex flex-col md:flex-row items-start gap-6 w-full md:w-auto">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border border-sumi-10 bg-washi-dark shrink-0 group">
                        <img
                            src={user.image || `https://ui-avatars.com/api/?name=${user.name}&background=1c1c1e&color=f4f4f5`}
                            alt={user.name || "User"}
                            className={`w-full h-full object-cover transition-all ${isEditing ? 'opacity-50 blur-[2px]' : ''}`}
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
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama Lengkap" className="text-2xl md:text-3xl font-bold text-sumi bg-transparent border-b border-sumi-10 focus:border-sumi outline-none pb-1 w-full" />
                                <input type="text" value={editHandle} onChange={(e) => setEditHandle(e.target.value)} placeholder="Username / Handle" className="text-sm font-medium text-sumi-muted bg-transparent border-b border-sumi-10 focus:border-sumi outline-none pb-1 w-full" />
                                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tulis bio singkat tentang diri Anda..." className="text-sm text-sumi-light leading-relaxed bg-transparent border border-sumi-10 rounded-xl p-3 outline-none focus:border-sumi resize-none h-24 w-full mt-2" />
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
                            <button onClick={handleCancelEdit} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sumi-10 text-sm font-medium text-sumi hover:bg-sumi/5 transition-colors">
                                <X size={16} /> Batal
                            </button>
                            <button onClick={handleSaveProfile} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-sumi text-washi text-sm font-bold hover:bg-sumi-light hover:shadow-md transition-all">
                                <Save size={16} /> Simpan
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sumi-10 text-sm font-medium text-sumi hover:bg-sumi/5 transition-colors">
                                <Settings size={16} /> Edit Profil
                            </button>
                            <button onClick={() => signOut({ callbackUrl: '/' })} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                                Keluar
                            </button>
                            <button onClick={handleCreateNewPost} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-sumi text-washi text-sm font-bold hover:bg-sumi-light hover:-translate-y-0.5 transition-all duration-300">
                                <PenSquare size={16} /> Tulis Baru
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* --- STATISTIK SINGKAT --- */}
            <div className="grid grid-cols-3 gap-4 mb-12">
                <div className="bg-washi-dark/50 border border-sumi-10 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                    <FileText size={20} className="text-sumi-muted mb-2" />
                    {isLoadingData ? <Loader2 className="animate-spin text-sumi mb-1" size={24} /> : <span className="text-2xl font-black text-sumi mb-1">{stats.posts}</span>}
                    <span className="text-[10px] font-bold text-sumi-muted uppercase tracking-widest">Postingan</span>
                </div>
                <div className="bg-washi-dark/50 border border-sumi-10 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                    <Eye size={20} className="text-sumi-muted mb-2" />
                    {isLoadingData ? <Loader2 className="animate-spin text-sumi mb-1" size={24} /> : <span className="text-2xl font-black text-sumi mb-1">{stats.views}</span>}
                    <span className="text-[10px] font-bold text-sumi-muted uppercase tracking-widest">Total Views</span>
                </div>
                <div className="bg-washi-dark/50 border border-sumi-10 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                    <Bookmark size={20} className="text-sumi-muted mb-2" />
                    <span className="text-2xl font-black text-sumi mb-1">{stats.saved}</span>
                    <span className="text-[10px] font-bold text-sumi-muted uppercase tracking-widest">Tersimpan</span>
                </div>
            </div>

            {/* --- MENU TABS --- */}
            <div className="flex items-center gap-6 border-b border-sumi-10 mb-8 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab("published")}
                    className={`pb-3 text-sm font-bold transition-colors relative whitespace-nowrap ${activeTab === "published" ? "text-sumi" : "text-sumi-muted hover:text-sumi-light"}`}
                >
                    Telah Terbit <span className="ml-1 text-[10px] opacity-50">({publishedPosts.length})</span>
                    {activeTab === "published" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sumi rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab("draft")}
                    className={`pb-3 text-sm font-bold transition-colors relative whitespace-nowrap ${activeTab === "draft" ? "text-sumi" : "text-sumi-muted hover:text-sumi-light"}`}
                >
                    Draf
                    {draftPosts.length > 0 && <span className="ml-1 bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-1.5 py-0.5 rounded-full text-[10px]">{draftPosts.length}</span>}
                    {activeTab === "draft" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sumi rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab("saved")}
                    className={`pb-3 text-sm font-bold transition-colors relative whitespace-nowrap ${activeTab === "saved" ? "text-sumi" : "text-sumi-muted hover:text-sumi-light"}`}
                >
                    Tersimpan
                    {activeTab === "saved" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-sumi rounded-t-full" />}
                </button>
            </div>

            {/* --- LIST KONTEN --- */}
            <div className="flex flex-col gap-4">
                {isLoadingData ? (
                    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-sumi-muted" size={32} /></div>
                ) : filteredPosts.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center border border-dashed border-sumi-10 rounded-2xl bg-washi-dark/30">
                        <div className="w-16 h-16 bg-washi border border-sumi-10 rounded-full flex items-center justify-center mb-4 text-sumi-muted">
                            {activeTab === "saved" ? <Bookmark size={24} /> : <FileText size={24} />}
                        </div>
                        <h3 className="text-base font-bold text-sumi mb-1">
                            {activeTab === "saved" ? "Belum ada artikel tersimpan" : "Belum ada tulisan di sini"}
                        </h3>
                        <p className="text-sm text-sumi-muted max-w-sm mb-6">
                            {activeTab === "saved"
                                ? "Simpan artikel yang menarik perhatian Anda untuk dibaca lagi nanti."
                                : "Mulai tuangkan ide dan pikiran Anda ke dalam tulisan pertama."}
                        </p>
                        {activeTab !== "saved" && (
                            <button onClick={handleCreateNewPost} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-washi border border-sumi-10 text-sm font-bold text-sumi hover:bg-sumi/5 transition-colors">
                                <Plus size={16} /> Mulai Menulis
                            </button>
                        )}
                    </div>
                ) : (
                    filteredPosts.map((post) => (
                        <div key={post.id} className="group flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border border-sumi-10 bg-washi hover:shadow-[0_8px_30px_rgb(28,28,30,0.04)] hover:border-sumi/20 transition-all duration-300">
                            <div className="flex-1">
                                {/* Klik Judul selalu mengarah ke halaman Edit */}
                                <Link href={`/write/${post.id}`} className="inline-block">
                                    <h3 className="text-lg font-bold text-sumi mb-2 group-hover:text-sumi-light transition-colors line-clamp-1">
                                        {post.title}
                                    </h3>
                                </Link>
                                <div className="flex items-center gap-3 text-xs text-sumi-muted font-medium">
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {new Date(post.updatedAt || post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                    {activeTab === "published" && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1"><Eye size={12} /> {post.views || 0} views</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 md:mt-0">
                                {activeTab === "published" && (
                                    <Link href={`/read/${post.slug}`} className="p-2 text-sumi-muted hover:text-sumi hover:bg-sumi/5 rounded-full transition-colors" title="Lihat Artikel di Publik">
                                        <ExternalLink size={18} />
                                    </Link>
                                )}
                                <button className="p-2 text-sumi-muted hover:text-sumi hover:bg-sumi/5 rounded-full transition-colors" title="Opsi Lainnya">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}