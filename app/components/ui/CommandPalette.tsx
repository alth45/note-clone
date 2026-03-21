"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search, PenSquare, Home, Hash, Settings, X,
    FileText, ChevronRight, Terminal, Loader2, Globe
} from "lucide-react";
import { useRouter } from "next/navigation";

import { getCommandMatch, SYSTEM_COMMANDS } from "@/lib/commandEngine";
import QuickEditorModal from "./QuickEditorModal";
import { useDialog } from "@/context/DialogContext";
import TerminalResultModal from "./TerminalResultModal";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import SearchResultItem from "@/components/ui/SearchResultItem";
import log from "loglevel";

type PostData = {
    id: string;
    title: string;
    slug: string;
    published: boolean;
};

// ─── Mode search ──────────────────────────────────────────────────────────────
//   ""         → suggestions / command mode
//   starts "/"  → cari artikel milik sendiri (private)
//   starts "@"  → global search publik
//   CLI keyword → eksekusi command terminal

function detectMode(query: string): "idle" | "private" | "global" | "cli" {
    if (!query) return "idle";
    if (query.startsWith("/")) return "private";
    if (query.startsWith("@")) return "global";
    if (getCommandMatch(query)) return "cli";
    if (query.length >= 2) return "global"; // default ke global search
    return "idle";
}

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const [editorState, setEditorState] = useState({ isOpen: false, filename: "" });
    const [terminalState, setTerminalState] = useState<{ isOpen: boolean; title: string; data: any }>(
        { isOpen: false, title: "", data: null }
    );
    const { showAlert } = useDialog();

    // Private post search (milik sendiri)
    const [dbPosts, setDbPosts] = useState<PostData[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);

    const [isExecutingCli, setIsExecutingCli] = useState(false);

    const mode = detectMode(searchQuery);

    // Global search hook — hanya aktif saat mode "global"
    const globalQuery = mode === "global" ? searchQuery.replace(/^@/, "") : "";
    const globalSearch = useGlobalSearch(globalQuery);

    // Private search term (strip leading "/")
    const privateSearchTerm = mode === "private"
        ? searchQuery.slice(1).toLowerCase()
        : "";

    // ── Keyboard shortcut ─────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((v) => !v);
            }
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    // Reset query saat ditutup
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => setSearchQuery(""), 200);
        }
    }, [isOpen]);

    // ── Cache private posts ───────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;

        if (dbPosts.length === 0) {
            const cached = sessionStorage.getItem("note_posts_cache");
            if (cached) {
                try { setDbPosts(JSON.parse(cached)); } catch { log.error("cache parse failed"); }
            } else {
                setIsLoadingPosts(true);
            }

            fetch("/api/posts")
                .then((r) => r.json())
                .then((data) => {
                    if (Array.isArray(data)) {
                        setDbPosts(data);
                        sessionStorage.setItem("note_posts_cache", JSON.stringify(data));
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoadingPosts(false));
        }
    }, [isOpen]);

    const runCommand = useCallback((action: () => void) => {
        action();
        setIsOpen(false);
        setSearchQuery("");
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setSearchQuery("");
    }, []);

    // ── Static nav commands ───────────────────────────────────────────────────
    const commands = [
        { icon: <Home size={16} />, label: "Beranda", action: () => router.push("/") },
        { icon: <PenSquare size={16} />, label: "Tulis Catatan Baru", action: () => router.push("/write") },
        { icon: <Hash size={16} />, label: "Jelajahi Topik", action: () => router.push("/tags") },
        { icon: <Settings size={16} />, label: "Pengaturan Profil", action: () => router.push("/dashboard") },
        { icon: <Globe size={16} />, label: "Search publik...", action: () => setSearchQuery("@") },
    ];

    const filteredCommands = commands.filter((c) =>
        c.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Private posts filter
    const filteredPrivate = dbPosts.filter((p) =>
        p.title.toLowerCase().includes(privateSearchTerm)
    );

    // Edit suggestions for CLI "edit" command
    const cliArgString = searchQuery.trim().split(/\s+/).slice(1).join(" ").toLowerCase();
    const editSuggestions = dbPosts.filter((p) =>
        p.title.toLowerCase().includes(cliArgString) ||
        p.slug.toLowerCase().includes(cliArgString)
    );

    // ── CLI Enter handler ─────────────────────────────────────────────────────
    const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter" || mode !== "cli" || isExecutingCli) return;
        e.preventDefault();

        const match = getCommandMatch(searchQuery);
        if (!match) return;

        if (match.keyword === "edit" && cliArgString) {
            if (editSuggestions.length > 0) {
                setEditorState({ isOpen: true, filename: editSuggestions[0].slug + ".md" });
                close();
            } else {
                showAlert(`File "${cliArgString}" tidak ditemukan.`, "File Tidak Ditemukan", "warning");
            }
            return;
        }

        setIsExecutingCli(true);
        try {
            await match.execute(searchQuery, {
                router,
                closePalette: close,
                openQuickEditor: (filename) => setEditorState({ isOpen: true, filename }),
                showAlert,
                openTerminalResult: (title, data) => setTerminalState({ isOpen: true, title, data }),
            });
        } finally {
            setIsExecutingCli(false);
        }
    }, [mode, searchQuery, cliArgString, editSuggestions, isExecutingCli, router, close, showAlert]);

    // ── Placeholder text ──────────────────────────────────────────────────────
    const placeholder = mode === "private"
        ? "Cari di artikel kamu..."
        : mode === "global"
            ? "Cari artikel publik..."
            : "Ketik untuk search, / untuk artikel kamu, @ untuk search publik...";

    return (
        <>
            <QuickEditorModal
                isOpen={editorState.isOpen}
                filename={editorState.filename}
                onClose={() => { setEditorState({ isOpen: false, filename: "" }); setIsOpen(true); }}
            />
            <TerminalResultModal
                isOpen={terminalState.isOpen}
                title={terminalState.title}
                result={terminalState.data}
                onClose={() => { setTerminalState({ isOpen: false, title: "", data: null }); setIsOpen(true); }}
            />

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 bg-sumi/40 backdrop-blur-sm z-[100] transition-opacity"
                        onClick={close}
                    />

                    <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90vw] max-w-lg bg-washi rounded-2xl shadow-2xl border border-sumi-10 z-[101] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

                        {/* ── Input bar ────────────────────────────────────────── */}
                        <div className="flex items-center px-4 border-b border-sumi-10 bg-washi-dark/50">
                            {mode === "cli" && <Terminal size={18} className="text-emerald-500 shrink-0" />}
                            {mode === "global" && <Globe size={18} className="text-blue-500 shrink-0" />}
                            {mode === "private" && (
                                <span className="ml-1 bg-sumi text-washi text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                                    <FileText size={10} /> MILIKKU
                                </span>
                            )}
                            {mode === "idle" && <Search size={18} className="text-sumi-muted shrink-0" />}

                            {isExecutingCli ? (
                                <div className="flex-1 px-3 py-4 flex items-center gap-2 text-emerald-600 font-mono text-sm font-bold">
                                    <Loader2 size={16} className="animate-spin text-emerald-500" />
                                    Menghubungi PostgreSQL...
                                </div>
                            ) : (
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder={placeholder}
                                    className={`flex-1 bg-transparent border-none outline-none px-3 py-4 text-sm placeholder:text-sumi-muted/60 ${mode === "cli" ? "text-emerald-600 font-mono font-bold" :
                                            mode === "global" ? "text-blue-600" :
                                                "text-sumi"
                                        }`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isExecutingCli}
                                />
                            )}

                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="p-1 rounded-md text-sumi-muted hover:text-sumi hover:bg-sumi/10 transition-colors shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <button
                                onClick={close}
                                className="p-1 ml-1 rounded-md text-sumi-muted hover:text-sumi hover:bg-sumi/10 transition-colors shrink-0"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* ── Content area ─────────────────────────────────────── */}
                        <div className="max-h-[380px] overflow-y-auto p-2 scrollbar-hide">

                            {/* CLI mode */}
                            {mode === "cli" && (
                                <div className="p-3">
                                    <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <Terminal size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-700">Eksekusi Perintah Sistem</h4>
                                            <p className="text-xs text-emerald-600/80 mt-1">
                                                {getCommandMatch(searchQuery)?.description}
                                            </p>
                                            <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-600/60 font-mono">
                                                <kbd className="bg-emerald-500/20 px-1.5 py-0.5 rounded">Enter</kbd> untuk jalankan
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Global search mode */}
                            {mode === "global" && (
                                <div className="flex flex-col">
                                    {globalSearch.isLoading ? (
                                        <div className="p-8 flex flex-col items-center gap-2 text-sumi-muted">
                                            <Loader2 className="animate-spin" size={20} />
                                            <span className="text-xs">Mencari...</span>
                                        </div>
                                    ) : globalQuery.length < 2 ? (
                                        <div className="p-5 text-center text-sm text-sumi-muted">
                                            Ketik minimal 2 karakter untuk search.
                                        </div>
                                    ) : globalSearch.results.length === 0 ? (
                                        <div className="p-5 text-center">
                                            <p className="text-sm text-sumi-muted">Tidak ada artikel untuk <strong>"{globalQuery}"</strong>.</p>
                                            <p className="text-xs text-sumi-muted/60 mt-1">Coba kata lain atau lebih pendek.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="px-3 py-2 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-sumi-muted uppercase tracking-widest">
                                                    {globalSearch.total} hasil publik
                                                </span>
                                                <a
                                                    href={`/search?q=${encodeURIComponent(globalQuery)}`}
                                                    onClick={close}
                                                    className="text-[10px] text-blue-500 hover:text-blue-700 font-medium"
                                                >
                                                    Lihat semua →
                                                </a>
                                            </div>

                                            {globalSearch.results.map((result) => (
                                                <SearchResultItem
                                                    key={result.id}
                                                    result={result}
                                                    query={globalQuery}
                                                    href={`/post/${result.slug}`}
                                                    onClick={close}
                                                    compact
                                                />
                                            ))}

                                            {globalSearch.hasMore && (
                                                <button
                                                    onClick={globalSearch.loadMore}
                                                    disabled={globalSearch.isLoadingMore}
                                                    className="w-full py-2 text-xs text-sumi-muted hover:text-sumi transition-colors flex items-center justify-center gap-2"
                                                >
                                                    {globalSearch.isLoadingMore
                                                        ? <><Loader2 size={12} className="animate-spin" /> Memuat...</>
                                                        : "Tampilkan lebih banyak"
                                                    }
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Private search mode (/) */}
                            {mode === "private" && (
                                isLoadingPosts ? (
                                    <div className="p-8 flex flex-col items-center gap-2 text-sumi-muted">
                                        <Loader2 className="animate-spin" size={20} />
                                        <span className="text-xs">Menyinkronkan database...</span>
                                    </div>
                                ) : filteredPrivate.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-sumi-muted">
                                        Artikel tidak ditemukan di tulisanmu.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="px-3 py-1 text-[10px] font-bold text-sumi-muted uppercase tracking-widest mt-1 mb-1">
                                            Artikel kamu ({filteredPrivate.length})
                                        </div>
                                        {filteredPrivate.map((post) => (
                                            <button
                                                key={post.id}
                                                onClick={() => runCommand(() =>
                                                    router.push(post.published ? `/post/${post.slug}` : `/write/${post.id}`)
                                                )}
                                                className="flex items-center justify-between w-full px-3 py-3 text-left text-sm text-sumi rounded-xl hover:bg-sumi-10 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText size={16} className="text-sumi-muted shrink-0" />
                                                    <span className="truncate">{post.title}</span>
                                                    {!post.published && (
                                                        <span className="text-[9px] font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-1.5 py-0.5 rounded ml-1">
                                                            DRAF
                                                        </span>
                                                    )}
                                                </div>
                                                <ChevronRight size={14} className="text-sumi-muted/0 group-hover:text-sumi-muted/100 transition-all shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )
                            )}

                            {/* Idle mode — nav suggestions */}
                            {mode === "idle" && (
                                filteredCommands.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-sumi-muted">
                                        Tidak ditemukan.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="px-3 py-1 text-[10px] font-bold text-sumi-muted uppercase tracking-widest mt-1 mb-1">
                                            Navigasi cepat
                                        </div>
                                        {filteredCommands.map((cmd, i) => (
                                            <button
                                                key={i}
                                                onClick={() => runCommand(cmd.action)}
                                                className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm text-sumi rounded-xl hover:bg-sumi-10 transition-colors group"
                                            >
                                                <span className="text-sumi-muted group-hover:text-sumi transition-colors">{cmd.icon}</span>
                                                {cmd.label}
                                            </button>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>

                        {/* ── Footer hint ───────────────────────────────────────── */}
                        <div className="px-4 py-3 bg-washi-dark/80 border-t border-sumi-10 flex items-center justify-between">
                            <span className="text-[10px] text-sumi-muted flex items-center gap-1.5 font-medium flex-wrap gap-y-1">
                                <kbd className="bg-sumi-10 border border-sumi/10 px-1.5 py-0.5 rounded text-sumi">/</kbd> artikel kamu
                                <span className="mx-1 opacity-40">·</span>
                                <kbd className="bg-sumi-10 border border-sumi/10 px-1.5 py-0.5 rounded text-sumi">@</kbd> search publik
                                <span className="mx-1 opacity-40">·</span>
                                <kbd className="bg-sumi-10 border border-sumi/10 px-1.5 py-0.5 rounded text-sumi">ls</kbd> terminal
                            </span>
                            <span className="text-[10px] text-sumi-muted font-medium shrink-0">
                                <kbd className="bg-sumi-10 border border-sumi/10 px-1.5 py-0.5 rounded text-sumi">esc</kbd> tutup
                            </span>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}