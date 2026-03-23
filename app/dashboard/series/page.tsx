"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Plus, BookOpen, Loader2, Trash2, GripVertical,
    ChevronDown, ChevronRight, Eye, EyeOff,
    ExternalLink, X, Check,
} from "lucide-react";

interface SeriesPostItem {
    id: string;
    order: number;
    post: {
        id: string;
        title: string;
        slug: string;
        published: boolean;
    };
}

interface Series {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    published: boolean;
    posts: SeriesPostItem[];
    createdAt: string;
}

interface UserPost {
    id: string;
    title: string;
    slug: string;
    published: boolean;
}

// ─── Drag & drop reorder hook ─────────────────────────────────────────────────

function useDragReorder(
    items: SeriesPostItem[],
    onReorder: (orderedIds: string[]) => void
) {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [localItems, setLocalItems] = useState(items);

    useEffect(() => { setLocalItems(items); }, [items]);

    function handleDragStart(postId: string) {
        setDraggingId(postId);
    }

    function handleDragOver(e: React.DragEvent, targetPostId: string) {
        e.preventDefault();
        if (!draggingId || draggingId === targetPostId) return;

        const newItems = [...localItems];
        const fromIdx = newItems.findIndex((i) => i.post.id === draggingId);
        const toIdx = newItems.findIndex((i) => i.post.id === targetPostId);

        const [moved] = newItems.splice(fromIdx, 1);
        newItems.splice(toIdx, 0, moved);
        setLocalItems(newItems);
    }

    function handleDragEnd() {
        setDraggingId(null);
        onReorder(localItems.map((i) => i.post.id));
    }

    return { localItems, draggingId, handleDragStart, handleDragOver, handleDragEnd };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SeriesDashboardPage() {
    const [seriesList, setSeriesList] = useState<Series[]>([]);
    const [userPosts, setUserPosts] = useState<UserPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Form buat series baru
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Add artikel ke series
    const [addingToSeriesId, setAddingToSeriesId] = useState<string | null>(null);
    const [selectedPostId, setSelectedPostId] = useState("");

    useEffect(() => {
        Promise.all([
            fetch("/api/series").then((r) => r.json()),
            fetch("/api/posts").then((r) => r.json()),
        ]).then(([series, posts]) => {
            if (Array.isArray(series)) setSeriesList(series);
            if (Array.isArray(posts)) setUserPosts(posts);
        }).finally(() => setIsLoading(false));
    }, []);

    // ── Buat series baru ──────────────────────────────────────────────────────
    async function createSeries() {
        if (!newTitle.trim()) return;
        setIsCreating(true);
        try {
            const res = await fetch("/api/series", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() || null }),
            });
            if (res.ok) {
                const created = await res.json();
                setSeriesList((prev) => [created, ...prev]);
                setNewTitle("");
                setNewDesc("");
                setShowCreateForm(false);
                setExpandedId(created.id);
            }
        } finally {
            setIsCreating(false);
        }
    }

    // ── Toggle published ──────────────────────────────────────────────────────
    async function togglePublished(series: Series) {
        const res = await fetch(`/api/series/${series.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published: !series.published }),
        });
        if (res.ok) {
            setSeriesList((prev) =>
                prev.map((s) => s.id === series.id ? { ...s, published: !s.published } : s)
            );
        }
    }

    // ── Hapus series ──────────────────────────────────────────────────────────
    async function deleteSeries(id: string) {
        if (!confirm("Hapus series ini? Artikel tidak ikut terhapus.")) return;
        const res = await fetch(`/api/series/${id}`, { method: "DELETE" });
        if (res.ok) {
            setSeriesList((prev) => prev.filter((s) => s.id !== id));
        }
    }

    // ── Tambah artikel ke series ──────────────────────────────────────────────
    async function addPost(seriesId: string) {
        if (!selectedPostId) return;
        const res = await fetch(`/api/series/${seriesId}/posts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId: selectedPostId }),
        });
        if (res.ok) {
            const newSp = await res.json();
            setSeriesList((prev) =>
                prev.map((s) =>
                    s.id === seriesId
                        ? { ...s, posts: [...s.posts, newSp] }
                        : s
                )
            );
            setSelectedPostId("");
            setAddingToSeriesId(null);
        }
    }

    // ── Hapus artikel dari series ─────────────────────────────────────────────
    async function removePost(seriesId: string, postId: string) {
        const res = await fetch(`/api/series/${seriesId}/posts`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId }),
        });
        if (res.ok) {
            setSeriesList((prev) =>
                prev.map((s) =>
                    s.id === seriesId
                        ? { ...s, posts: s.posts.filter((sp) => sp.post.id !== postId) }
                        : s
                )
            );
        }
    }

    // ── Reorder artikel ───────────────────────────────────────────────────────
    const reorder = useCallback(async (seriesId: string, orderedPostIds: string[]) => {
        await fetch(`/api/series/${seriesId}/posts`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderedPostIds }),
        });
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="animate-spin text-sumi-muted" size={28} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-20">

            {/* ── Header ── */}
            <div className="flex items-center justify-between mt-8 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-sumi tracking-tight flex items-center gap-2">
                        <BookOpen size={22} className="text-sumi-muted" /> Series
                    </h1>
                    <p className="text-sm text-sumi-muted mt-1">
                        Kelompokkan artikel menjadi bacaan berseri
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateForm((v) => !v)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-sumi text-washi text-sm font-bold hover:bg-sumi-light transition-all"
                >
                    <Plus size={16} /> Buat Series
                </button>
            </div>

            {/* ── Form buat series baru ── */}
            {showCreateForm && (
                <div className="mb-6 p-5 rounded-2xl border border-sumi-10 bg-washi-dark/30">
                    <h3 className="text-sm font-bold text-sumi mb-4">Series Baru</h3>
                    <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Judul series..."
                        maxLength={150}
                        className="w-full bg-washi border border-sumi-10 rounded-xl px-4 py-2.5 text-sm text-sumi outline-none focus:border-sumi/40 transition-colors placeholder:text-sumi-muted/50 mb-3"
                        autoFocus
                    />
                    <textarea
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Deskripsi singkat (opsional)..."
                        maxLength={500}
                        rows={3}
                        className="w-full bg-washi border border-sumi-10 rounded-xl px-4 py-2.5 text-sm text-sumi outline-none focus:border-sumi/40 transition-colors placeholder:text-sumi-muted/50 resize-none mb-4"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => { setShowCreateForm(false); setNewTitle(""); setNewDesc(""); }}
                            className="px-4 py-2 text-xs font-bold text-sumi-muted hover:text-sumi transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={createSeries}
                            disabled={!newTitle.trim() || isCreating}
                            className="flex items-center gap-2 px-4 py-2 bg-sumi text-washi text-xs font-bold rounded-xl hover:bg-sumi-light transition-colors disabled:opacity-50"
                        >
                            {isCreating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            Buat
                        </button>
                    </div>
                </div>
            )}

            {/* ── List series ── */}
            {seriesList.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-sumi-10 rounded-2xl">
                    <BookOpen size={40} className="mx-auto mb-3 text-sumi-muted/30" />
                    <p className="text-sm font-medium text-sumi-muted">Belum ada series.</p>
                    <p className="text-xs text-sumi-muted/60 mt-1">
                        Buat series untuk mengelompokkan artikel berseri.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {seriesList.map((series) => (
                        <SeriesCard
                            key={series.id}
                            series={series}
                            userPosts={userPosts}
                            isExpanded={expandedId === series.id}
                            onToggleExpand={() => setExpandedId(expandedId === series.id ? null : series.id)}
                            onTogglePublished={() => togglePublished(series)}
                            onDelete={() => deleteSeries(series.id)}
                            onAddPost={addPost}
                            onRemovePost={removePost}
                            onReorder={(ids) => reorder(series.id, ids)}
                            addingActive={addingToSeriesId === series.id}
                            onToggleAdding={() => setAddingToSeriesId(
                                addingToSeriesId === series.id ? null : series.id
                            )}
                            selectedPostId={selectedPostId}
                            onSelectPost={setSelectedPostId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Series card dengan drag & drop ──────────────────────────────────────────

function SeriesCard({
    series, userPosts, isExpanded,
    onToggleExpand, onTogglePublished, onDelete,
    onAddPost, onRemovePost, onReorder,
    addingActive, onToggleAdding,
    selectedPostId, onSelectPost,
}: {
    series: Series;
    userPosts: UserPost[];
    isExpanded: boolean;
    onToggleExpand: () => void;
    onTogglePublished: () => void;
    onDelete: () => void;
    onAddPost: (seriesId: string) => void;
    onRemovePost: (seriesId: string, postId: string) => void;
    onReorder: (ids: string[]) => void;
    addingActive: boolean;
    onToggleAdding: () => void;
    selectedPostId: string;
    onSelectPost: (id: string) => void;
}) {
    const { localItems, draggingId, handleDragStart, handleDragOver, handleDragEnd } =
        useDragReorder(series.posts, onReorder);

    // Artikel yang belum masuk series ini
    const postsInSeries = new Set(series.posts.map((sp) => sp.post.id));
    const availablePosts = userPosts.filter((p) => !postsInSeries.has(p.id));

    return (
        <div className="border border-sumi-10 rounded-2xl overflow-hidden bg-washi">

            {/* Header card */}
            <div className="flex items-center gap-3 p-4 bg-washi-dark/30">
                <button
                    onClick={onToggleExpand}
                    className="flex items-center gap-2 flex-1 text-left min-w-0"
                >
                    {isExpanded
                        ? <ChevronDown size={16} className="text-sumi-muted shrink-0" />
                        : <ChevronRight size={16} className="text-sumi-muted shrink-0" />
                    }
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-sumi truncate">{series.title}</h3>
                        <p className="text-[10px] text-sumi-muted mt-0.5">
                            {series.posts.length} artikel
                        </p>
                    </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                    {/* Published toggle */}
                    <button
                        onClick={onTogglePublished}
                        title={series.published ? "Jadikan privat" : "Publikasikan"}
                        className={`p-2 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 ${series.published
                            ? "text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20"
                            : "text-sumi-muted hover:bg-sumi/5"
                            }`}
                    >
                        {series.published
                            ? <><Eye size={14} /> Publik</>
                            : <><EyeOff size={14} /> Draft</>
                        }
                    </button>

                    {/* Link ke halaman publik */}
                    {series.published && (
                        <Link
                            href={`/series/${series.slug}`}
                            target="_blank"
                            className="p-2 text-sumi-muted hover:text-sumi hover:bg-sumi/5 rounded-lg transition-colors"
                            title="Lihat halaman publik"
                        >
                            <ExternalLink size={14} />
                        </Link>
                    )}

                    {/* Hapus */}
                    <button
                        onClick={onDelete}
                        className="p-2 text-sumi-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus series"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
                <div className="p-4 border-t border-sumi-10">

                    {/* Deskripsi */}
                    {series.description && (
                        <p className="text-xs text-sumi-muted mb-4 leading-relaxed">
                            {series.description}
                        </p>
                    )}

                    {/* List artikel dengan drag handle */}
                    {localItems.length === 0 ? (
                        <p className="text-xs text-sumi-muted/60 text-center py-6">
                            Belum ada artikel. Tambahkan di bawah.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-1 mb-4">
                            {localItems.map((sp, index) => (
                                <div
                                    key={sp.post.id}
                                    draggable
                                    onDragStart={() => handleDragStart(sp.post.id)}
                                    onDragOver={(e) => handleDragOver(e, sp.post.id)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${draggingId === sp.post.id
                                        ? "border-sumi/30 bg-sumi/5 opacity-50"
                                        : "border-transparent hover:border-sumi-10 hover:bg-washi-dark/30"
                                        }`}
                                >
                                    <GripVertical size={14} className="text-sumi-muted/40 cursor-grab shrink-0" />
                                    <span className="text-[10px] font-black text-sumi-muted/40 w-4 text-center shrink-0">
                                        {index + 1}
                                    </span>
                                    <span className="text-sm text-sumi flex-1 truncate">
                                        {sp.post.title}
                                    </span>
                                    {!sp.post.published && (
                                        <span className="text-[9px] font-bold text-yellow-600 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                                            DRAFT
                                        </span>
                                    )}
                                    <button
                                        onClick={() => onRemovePost(series.id, sp.post.id)}
                                        className="p-1 text-sumi-muted/40 hover:text-red-400 transition-colors shrink-0"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tambah artikel */}
                    {addingActive ? (
                        <div className="flex gap-2">
                            <select
                                value={selectedPostId}
                                onChange={(e) => onSelectPost(e.target.value)}
                                className="flex-1 bg-washi border border-sumi-10 rounded-xl px-3 py-2 text-sm text-sumi outline-none focus:border-sumi/40 transition-colors"
                            >
                                <option value="">Pilih artikel...</option>
                                {availablePosts.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.title} {!p.published ? "(Draft)" : ""}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => onAddPost(series.id)}
                                disabled={!selectedPostId}
                                className="px-4 py-2 bg-sumi text-washi text-xs font-bold rounded-xl hover:bg-sumi-light transition-colors disabled:opacity-40"
                            >
                                Tambah
                            </button>
                            <button
                                onClick={onToggleAdding}
                                className="px-3 py-2 text-sumi-muted hover:text-sumi transition-colors text-xs"
                            >
                                Batal
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onToggleAdding}
                            disabled={availablePosts.length === 0}
                            className="flex items-center gap-2 text-xs font-medium text-sumi-muted hover:text-sumi transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Plus size={14} />
                            {availablePosts.length === 0
                                ? "Semua artikel sudah masuk series ini"
                                : "Tambah artikel ke series"
                            }
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}