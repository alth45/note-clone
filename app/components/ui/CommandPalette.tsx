"use client";

import { useState, useEffect } from "react";
import { Search, PenSquare, Home, Hash, Settings, X, FileText, ChevronRight, Terminal, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { getCommandMatch, SYSTEM_COMMANDS } from "@/lib/commandEngine";
import QuickEditorModal from "./QuickEditorModal";
import { useDialog } from "@/context/DialogContext";
import TerminalResultModal from "./TerminalResultModal";

type PostData = {
    id: string;
    title: string;
    slug: string;
    published: boolean;
};

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const router = useRouter();

    const [editorState, setEditorState] = useState({ isOpen: false, filename: "" });
    const [terminalState, setTerminalState] = useState<{ isOpen: boolean, title: string, data: any }>({ isOpen: false, title: "", data: null });
    const { showAlert } = useDialog();

    const [dbPosts, setDbPosts] = useState<PostData[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(false);

    // --- STATE BARU: INDIKATOR LOADING TERMINAL CLI ---
    const [isExecutingCli, setIsExecutingCli] = useState(false);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    // Caching Sistem untuk Pencarian Artikel
    useEffect(() => {
        if (isOpen && dbPosts.length === 0) {
            const cachedData = sessionStorage.getItem("note_posts_cache");
            if (cachedData) {
                setDbPosts(JSON.parse(cachedData));
            } else {
                setIsLoadingPosts(true);
            }

            fetch("/api/posts")
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setDbPosts(data);
                        sessionStorage.setItem("note_posts_cache", JSON.stringify(data));
                    }
                })
                .catch(err => console.error("Gagal load posts:", err))
                .finally(() => setIsLoadingPosts(false));
        }
    }, [isOpen]);

    const runCommand = (action: () => void) => {
        action();
        setIsOpen(false);
        setSearchQuery("");
    };

    const commands = [
        { icon: <Home size={16} />, label: "Beranda", action: () => router.push("/") },
        { icon: <PenSquare size={16} />, label: "Tulis Catatan Baru", action: () => router.push("/write") },
        { icon: <Hash size={16} />, label: "Jelajahi Topik Ilmiah", action: () => router.push("/tags") },
        { icon: <Settings size={16} />, label: "Pengaturan Profil", action: () => console.log("Ke Settings") },
    ];

    const isPostSearchMode = searchQuery.startsWith("/");
    const isCliMode = getCommandMatch(searchQuery) !== undefined;

    const postSearchTerm = isPostSearchMode ? searchQuery.slice(1).toLowerCase() : "";

    const parts = searchQuery.trim().split(/\s+/);
    const cliKeyword = parts[0].toLowerCase();
    const cliArgs = parts.slice(1);
    const cliArgString = cliArgs.join(" ").toLowerCase();

    const filteredCommands = commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredPosts = dbPosts.filter((post) =>
        post.title.toLowerCase().includes(postSearchTerm)
    );

    const editSuggestions = dbPosts.filter(post =>
        post.title.toLowerCase().includes(cliArgString) || post.slug.toLowerCase().includes(cliArgString)
    );

    // --- FUNGSI HANDLE ENTER DI-UPGRADE JADI ASYNC ---
    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && isCliMode && !isExecutingCli) {
            e.preventDefault();

            const match = getCommandMatch(searchQuery);
            if (!match) return;

            if (match.keyword === "edit" && cliArgs.length > 0) {
                if (editSuggestions.length > 0) {
                    const topMatch = editSuggestions[0];
                    setEditorState({ isOpen: true, filename: topMatch.slug + ".md" });
                    setIsOpen(false);
                    setSearchQuery("");
                } else {
                    showAlert(`File dengan kata kunci "${cliArgString}" tidak ditemukan di sistem.`, "File Tidak Ditemukan", "warning");
                }
                return;
            }

            // KONDISI DEFAULT: Nyalakan loading spinner, tembak API
            setIsExecutingCli(true);
            try {
                await match.execute(searchQuery, {
                    router,
                    closePalette: () => { setIsOpen(false); setSearchQuery(""); },
                    openQuickEditor: (filename) => setEditorState({ isOpen: true, filename }),
                    showAlert: showAlert,
                    openTerminalResult: (title, data) => setTerminalState({ isOpen: true, title, data })
                });
            } finally {
                // Matikan loading kalau udah selesai
                setIsExecutingCli(false);
            }
        }
    };

    // BARIS 'if (!isOpen && ...) return null;' UDAH DIHAPUS BIAR GAK NGE-BUG UNMOUNT!

    return (
        <>
            <QuickEditorModal
                isOpen={editorState.isOpen}
                filename={editorState.filename}
                onClose={() => {
                    setEditorState({ isOpen: false, filename: "" });
                    setIsOpen(true);
                }}
            />

            <TerminalResultModal
                isOpen={terminalState.isOpen}
                title={terminalState.title}
                result={terminalState.data}
                onClose={() => {
                    setTerminalState({ isOpen: false, title: "", data: null });
                    setIsOpen(true);
                }}
            />

            {isOpen && (
                <>
                    <div className="fixed inset-0 bg-sumi/40 backdrop-blur-sm z-[100] transition-opacity" onClick={() => setIsOpen(false)} />

                    <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90vw] max-w-lg bg-washi rounded-2xl shadow-2xl border border-sumi-10 z-[101] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center px-4 border-b border-sumi-10 bg-washi-dark/50">
                            {isCliMode ? (
                                <Terminal size={18} className="text-emerald-500" />
                            ) : (
                                <Search size={18} className="text-sumi-muted" />
                            )}

                            {isPostSearchMode && (
                                <span className="ml-2 bg-sumi text-washi text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <FileText size={10} /> ARTIKEL
                                </span>
                            )}

                            {/* --- EFEK LOADING TERMINAL --- */}
                            {isExecutingCli ? (
                                <div className="flex-1 px-3 py-4 flex items-center gap-2 text-emerald-600 font-mono text-sm font-bold bg-transparent">
                                    <Loader2 size={16} className="animate-spin text-emerald-500" />
                                    Menghubungi PostgreSQL...
                                </div>
                            ) : (
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Ketik '/' cari artikel, atau perintah sistem (cth: touch)..."
                                    className={`flex-1 bg-transparent border-none outline-none px-3 py-4 text-sm placeholder:text-sumi-muted/70 ${isCliMode ? 'text-emerald-600 font-mono font-bold' : 'text-sumi'}`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isExecutingCli}
                                />
                            )}

                            <button onClick={() => setIsOpen(false)} className="p-1 rounded-md text-sumi-muted hover:text-sumi hover:bg-sumi/10 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* --- KONTEN HASIL PENCARIAN --- */}
                        <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-hide">
                            {isCliMode ? (
                                <div className="p-3">
                                    <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <Terminal size={16} className="text-emerald-600 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-emerald-700">Eksekusi Perintah Sistem</h4>
                                            <p className="text-xs text-emerald-600/80 mt-1">{getCommandMatch(searchQuery)?.description}</p>
                                            <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-600/60 font-mono">
                                                <kbd className="bg-emerald-500/20 px-1.5 py-0.5 rounded">Enter</kbd> untuk jalankan
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : isPostSearchMode ? (
                                isLoadingPosts ? (
                                    <div className="p-8 flex flex-col items-center justify-center text-sumi-muted gap-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        <span className="text-xs">Menyinkronkan database...</span>
                                    </div>
                                ) : filteredPosts.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-sumi-muted">Artikel tidak ditemukan.</div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="px-2 py-1 text-[10px] font-bold text-sumi-muted uppercase tracking-widest mt-1 mb-1">Hasil Pencarian Artikel</div>
                                        {filteredPosts.map((post, index) => (
                                            <button key={index} onClick={() => runCommand(() => router.push(post.published ? `/read/${post.slug}` : `/write/${post.id}`))} className="flex items-center justify-between w-full px-3 py-3 text-left text-sm text-sumi rounded-xl hover:bg-sumi-10 transition-colors group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FileText size={16} className="text-sumi-muted shrink-0 group-hover:text-sumi transition-colors" />
                                                    <span className="truncate group-hover:font-medium transition-all">{post.title}</span>
                                                    {!post.published && (
                                                        <span className="text-[9px] font-bold bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 px-1.5 py-0.5 rounded ml-2">DRAFT</span>
                                                    )}
                                                </div>
                                                <ChevronRight size={14} className="text-sumi-muted/0 group-hover:text-sumi-muted/100 transition-all shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )
                            ) : (
                                filteredCommands.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-sumi-muted">
                                        Perintah tidak ditemukan. <br /> <span className="text-xs opacity-70">Ketik '/' untuk mencari artikel.</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="px-2 py-1 text-[10px] font-bold text-sumi-muted uppercase tracking-widest mt-1 mb-1">Saran Aksi</div>
                                        {filteredCommands.map((cmd, index) => (
                                            <button key={index} onClick={() => runCommand(cmd.action)} className="flex items-center gap-3 w-full px-3 py-2.5 text-left text-sm text-sumi rounded-xl hover:bg-sumi-10 transition-colors group">
                                                <span className="text-sumi-muted group-hover:text-sumi transition-colors">{cmd.icon}</span>
                                                {cmd.label}
                                            </button>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>

                        <div className="px-4 py-3 bg-washi-dark/80 border-t border-sumi-10 flex items-center justify-between">
                            <span className="text-[10px] text-sumi-muted flex items-center gap-1 font-medium">
                                Ketik <kbd className="bg-sumi-10 border border-sumi/10 px-1.5 py-0.5 rounded text-sumi"> / </kbd> cari artikel, <kbd className="bg-sumi-10 border border-sumi/10 px-1.5 py-0.5 rounded text-sumi ml-1"> ls </kbd> list data
                            </span>
                            <span className="text-[10px] text-sumi-muted font-medium">
                                <kbd className="bg-sumi-10 border border-sumi/10 px-1.5 py-0.5 rounded text-sumi">esc</kbd> tutup
                            </span>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}