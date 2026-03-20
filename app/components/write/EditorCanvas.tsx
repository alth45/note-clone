"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    CheckCircle2, Play, Bold, Italic, Heading2, Quote, Code,
    List, ListOrdered, Image as ImageIcon, Braces, Loader2,
    CloudIcon, Check, Presentation, RotateCcw, X, Download
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import CodeBlock from "@tiptap/extension-code-block";
import TiptapCode from "@tiptap/extension-code";

import { useDialog } from "@/context/DialogContext";
import { useRouter } from "next/navigation";
import { SlideEmbed } from "@/lib/SlideExtension";

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const LS_PREFIX = "noteos_draft_";

interface DraftBackup {
    title: string;
    content: string;
    savedAt: number; // timestamp ms
}

function lsKey(postId: string) {
    return `${LS_PREFIX}${postId}`;
}

function saveDraftToLS(postId: string, title: string, content: string) {
    try {
        const backup: DraftBackup = { title, content, savedAt: Date.now() };
        localStorage.setItem(lsKey(postId), JSON.stringify(backup));
    } catch {
        // localStorage penuh atau diblokir — silent fail
    }
}

function loadDraftFromLS(postId: string): DraftBackup | null {
    try {
        const raw = localStorage.getItem(lsKey(postId));
        if (!raw) return null;
        return JSON.parse(raw) as DraftBackup;
    } catch {
        return null;
    }
}

function clearDraftFromLS(postId: string) {
    try {
        localStorage.removeItem(lsKey(postId));
    } catch { }
}

function formatRelativeTime(ms: number): string {
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
}

// ─── HTML → .ntc converter ───────────────────────────────────────────────────
// Kebalikan dari parseNtcToHtml di server — konversi HTML Tiptap kembali ke
// format .ntc yang bisa di-push ulang lewat CLI.

function htmlToNtc(html: string): string {
    let text = html;

    // Code blocks: <pre><code class="language-js">...</code></pre>
    text = text.replace(
        /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi,
        (_, lang, code) => {
            const language = lang || "";
            const decoded = code
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
            return `\n\`\`\`${language}\n${decoded.trim()}\n\`\`\`\n`;
        }
    );

    // Slide embeds
    text = text.replace(
        /<div[^>]*class="[^"]*slide-wrapper[^"]*"[^>]*>[\s\S]*?src="([^"]*)"[\s\S]*?<\/div>/gi,
        (_, src) => `\n:::SLIDE\n${src}\n:::\n`
    );

    // Images (figure + figcaption)
    text = text.replace(
        /<figure[^>]*>[\s\S]*?<img[^>]+src="([^"]*)"[^>]*>[\s\S]*?<figcaption[^>]*>([\s\S]*?)<\/figcaption>[\s\S]*?<\/figure>/gi,
        (_, src, caption) => `\n:::IMAGE\n${src}\n${caption.trim()}\n:::\n`
    );
    // Images without caption
    text = text.replace(
        /<figure[^>]*>[\s\S]*?<img[^>]+src="([^"]*)"[^>]*>[\s\S]*?<\/figure>/gi,
        (_, src) => `\n:::IMAGE\n${src}\n:::\n`
    );
    // Inline images
    text = text.replace(/<img[^>]+src="([^"]*)"[^>]*>/gi, "![]($1)");

    // Tables
    text = text.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
        const rows: string[] = [];
        const rowMatches = tableHtml.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        rowMatches.forEach((row, idx) => {
            const cells = [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)]
                .map((m) => m[1].replace(/<[^>]+>/g, "").trim());
            rows.push("| " + cells.join(" | ") + " |");
            if (idx === 0) rows.push("| " + cells.map(() => "---").join(" | ") + " |");
        });
        return "\n" + rows.join("\n") + "\n";
    });

    // Headings
    text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n");
    text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n");
    text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n");

    // Blockquote
    text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
        const stripped = inner.replace(/<[^>]+>/g, "").trim();
        return "\n> " + stripped.split("\n").join("\n> ") + "\n";
    });

    // Lists
    text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner) => {
        const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
            .map((m) => "- " + m[1].replace(/<[^>]+>/g, "").trim());
        return "\n" + items.join("\n") + "\n";
    });
    text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner) => {
        const items = [...inner.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
            .map((m, i) => `${i + 1}. ` + m[1].replace(/<[^>]+>/g, "").trim());
        return "\n" + items.join("\n") + "\n";
    });

    // Inline formatting
    text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**");
    text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**");
    text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*");
    text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*");
    text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`");
    text = text.replace(/<a[^>]+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)");

    // Paragraphs & line breaks
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n");

    // Strip remaining HTML tags
    text = text.replace(/<[^>]+>/g, "");

    // Decode remaining entities
    text = text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");

    // Collapse 3+ blank lines → 2
    text = text.replace(/\n{3,}/g, "\n\n");

    return text.trim();
}

// ─── Slug generator (sama kayak server) ──────────────────────────────────────
function titleToSlug(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface RecoveryBannerProps {
    backup: DraftBackup;
    onRestore: () => void;
    onDismiss: () => void;
}

function RecoveryBanner({ backup, onRestore, onDismiss }: RecoveryBannerProps) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200 text-sm">
            <RotateCcw size={15} className="text-amber-600 shrink-0" />
            <span className="flex-1 text-amber-800">
                Draft lokal ditemukan dari{" "}
                <strong>{formatRelativeTime(backup.savedAt)}</strong>
                {" "}— mungkin lebih baru dari versi server.
            </span>
            <button
                onClick={onRestore}
                className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors shrink-0"
            >
                Pulihkan
            </button>
            <button
                onClick={onDismiss}
                className="p-1 text-amber-500 hover:text-amber-700 transition-colors shrink-0"
                title="Abaikan"
            >
                <X size={14} />
            </button>
        </div>
    );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

const MenuBar = ({ editor }: { editor: any }) => {
    const { showPrompt } = useDialog();

    const addSlideEmbed = () => {
        const url = prompt("Masukkan Link Embed Slide:");
        if (url && editor) editor.chain().focus().setSlide({ src: url }).run();
    };

    if (!editor) return null;

    return (
        <div className="flex items-center gap-1 md:gap-2 mb-8 bg-washi-dark/50 p-2 rounded-xl border border-sumi-10 overflow-x-auto scrollbar-hide">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive("bold") ? "bg-sumi text-washi" : "text-sumi-muted hover:text-sumi hover:bg-sumi/5"}`} title="Bold (Ctrl+B)"><Bold size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive("italic") ? "bg-sumi text-washi" : "text-sumi-muted hover:text-sumi hover:bg-sumi/5"}`} title="Italic (Ctrl+I)"><Italic size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1" />
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 rounded-lg transition-colors ${editor.isActive("heading", { level: 3 }) ? "bg-sumi text-washi" : "text-sumi-muted hover:text-sumi hover:bg-sumi/5"}`}><Heading2 size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive("blockquote") ? "bg-sumi text-washi" : "text-sumi-muted hover:text-sumi hover:bg-sumi/5"}`}><Quote size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1" />
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive("bulletList") ? "bg-sumi text-washi" : "text-sumi-muted hover:text-sumi hover:bg-sumi/5"}`}><List size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive("orderedList") ? "bg-sumi text-washi" : "text-sumi-muted hover:text-sumi hover:bg-sumi/5"}`}><ListOrdered size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1" />
            <button onClick={() => editor.chain().focus().toggleCode().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive("code") ? "bg-sumi text-washi" : "text-sumi-muted hover:text-sumi hover:bg-sumi/5"}`}><Code size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive("codeBlock") ? "bg-sumi text-washi" : "text-sumi-muted hover:text-sumi hover:bg-sumi/5"}`}><Braces size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1" />
            <button onClick={async () => {
                const url = await showPrompt("Masukkan URL Gambar:", "Insert Image");
                if (url) editor.chain().focus().setImage({ src: url }).run();
            }} className="p-2 rounded-lg text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors"><ImageIcon size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1" />
            <button onClick={addSlideEmbed} className="p-2 text-sumi-muted hover:text-sumi hover:bg-sumi/10 rounded-md transition-colors" title="Sisipkan Slide">
                <Presentation size={18} />
            </button>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface EditorCanvasProps {
    postId: string;
}

export default function EditorCanvas({ postId }: EditorCanvasProps) {
    const router = useRouter();
    const { showPrompt, showAlert } = useDialog();

    const [title, setTitle] = useState("Tanpa Judul");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState("");

    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [isPublishing, setIsPublishing] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Recovery state
    const [pendingBackup, setPendingBackup] = useState<DraftBackup | null>(null);

    const isFirstRender = useRef(true);
    // Track konten terakhir yang sukses di-save ke server
    // buat menentukan apakah LS backup lebih baru
    const lastServerSave = useRef<{ title: string; content: string } | null>(null);
    // Guard: jangan trigger auto-save saat sedang apply recovery
    const isApplyingBackup = useRef(false);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Image.configure({ HTMLAttributes: { class: "rounded-2xl border border-sumi-10 shadow-sm max-h-[500px] w-full object-cover my-8" } }),
            Placeholder.configure({ placeholder: "Mulai ketik pemikiran, riset, atau kode arsitektur Anda di sini..." }),
            SlideEmbed,
            CodeBlock,
            TiptapCode,
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
            LinkExtension.configure({
                openOnClick: false,
                HTMLAttributes: { class: "text-blue-500 hover:text-blue-700 underline cursor-pointer" },
            }),
        ],
        content: "",
        editorProps: {
            attributes: {
                class: "prose prose-lg prose-sumi max-w-none min-h-[500px] prose-p:text-sumi-light prose-p:leading-relaxed prose-h3:text-2xl prose-h3:font-bold prose-blockquote:border-l-4 prose-blockquote:border-sumi-10 prose-blockquote:pl-6 prose-blockquote:italic prose-pre:bg-sumi prose-pre:text-washi-dark prose-pre:rounded-xl prose-code:text-sumi-light prose-table:table-auto prose-td:border prose-td:border-sumi-10 prose-td:p-2 prose-th:border prose-th:border-sumi-10 prose-th:p-2 prose-th:bg-sumi/5 focus:outline-none",
            },
        },
        onUpdate: ({ editor }) => {
            if (!isApplyingBackup.current) {
                setContent(editor.getHTML());
            }
        },
    });

    // ── Auto-save ke server ───────────────────────────────────────────────────
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (isApplyingBackup.current) return;

        setSaveStatus("saving");

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/posts/${postId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, content }),
                });

                if (res.ok) {
                    // Sukses — catat sebagai last known server state dan hapus LS backup
                    lastServerSave.current = { title, content };
                    clearDraftFromLS(postId);
                    setSaveStatus("saved");
                    setTimeout(() => setSaveStatus("idle"), 2000);
                } else {
                    throw new Error("Server responded with error");
                }
            } catch {
                // Gagal — simpan ke localStorage sebagai backup
                saveDraftToLS(postId, title, content);
                setSaveStatus("error");
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [title, content, postId]);

    // ── Load data dari server saat pertama buka ───────────────────────────────
    useEffect(() => {
        if (!editor) return;

        const fetchPostData = async () => {
            try {
                const res = await fetch(`/api/posts/${postId}`);
                if (res.ok) {
                    const data = await res.json();

                    const serverTitle = data.title || "Tanpa Judul";
                    const serverContent = typeof data.content === "string" ? data.content : "";

                    // Catat state server sebagai baseline
                    lastServerSave.current = { title: serverTitle, content: serverContent };

                    setTitle(serverTitle);
                    setContent(serverContent);
                    editor.commands.setContent(serverContent);

                    // Cek apakah ada LS backup yang lebih baru
                    const backup = loadDraftFromLS(postId);
                    if (backup) {
                        // Hanya offer recovery kalau konten LS berbeda dari server
                        const isDifferent =
                            backup.title !== serverTitle ||
                            backup.content !== serverContent;

                        if (isDifferent) {
                            setPendingBackup(backup);
                        } else {
                            // Sama — backup sudah tidak relevan, hapus
                            clearDraftFromLS(postId);
                        }
                    }
                }
            } catch (err) {
                console.error("Gagal load artikel:", err);
            } finally {
                setIsInitialLoading(false);
            }
        };

        fetchPostData();
    }, [postId, editor]);

    // ── Handler: apply recovery ───────────────────────────────────────────────
    const handleRestore = useCallback(() => {
        if (!pendingBackup || !editor) return;

        isApplyingBackup.current = true;

        setTitle(pendingBackup.title);
        setContent(pendingBackup.content);
        editor.commands.setContent(pendingBackup.content);

        setPendingBackup(null);

        // Beri waktu React flush sebelum auto-save boleh jalan lagi
        setTimeout(() => {
            isApplyingBackup.current = false;
            // Trigger save ke server dengan konten yang baru di-restore
            setSaveStatus("saving");
        }, 100);
    }, [pendingBackup, editor]);

    const handleDismissBackup = useCallback(() => {
        clearDraftFromLS(postId);
        setPendingBackup(null);
    }, [postId]);

    // ── Download sebagai .ntc ─────────────────────────────────────────────────
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadNtc = useCallback(() => {
        setIsDownloading(true);
        try {
            // Konversi HTML Tiptap → format .ntc
            const ntcContent = htmlToNtc(content);
            const slug = titleToSlug(title || "tanpa-judul");
            const fileName = `${slug}.ntc`;

            // Tambah header judul kalau belum ada
            const hasH1 = ntcContent.trimStart().startsWith("# ");
            const fileBody = hasH1
                ? ntcContent
                : `# ${title}\n\n${ntcContent}`;

            // Trigger browser download
            const blob = new Blob([fileBody], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Download gagal:", err);
            showAlert("Gagal mengekspor file.", "Error", "danger");
        } finally {
            // Tunda sedikit biar feedback visual kelihatan
            setTimeout(() => setIsDownloading(false), 800);
        }
    }, [title, content, showAlert]);

    // ── Publish ───────────────────────────────────────────────────────────────
    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const res = await fetch(`/api/posts/${postId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, content, published: true }),
            });
            if (res.ok) {
                clearDraftFromLS(postId); // Artikel live — hapus backup lokal
                showAlert("Artikel berhasil mengudara ke publik!", "Sukses", "success");
                router.push("/");
                router.refresh();
            } else {
                showAlert("Gagal mempublikasikan artikel.", "Error", "danger");
            }
        } catch {
            showAlert("Koneksi server bermasalah.", "Error", "danger");
        } finally {
            setIsPublishing(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-washi relative">

            {/* Recovery banner — muncul di atas top bar kalau ada backup */}
            {pendingBackup && (
                <RecoveryBanner
                    backup={pendingBackup}
                    onRestore={handleRestore}
                    onDismiss={handleDismissBackup}
                />
            )}

            {/* Top bar */}
            <div className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-8 py-4 bg-washi/90 backdrop-blur-sm border-b border-sumi-10">
                <div className="flex items-center gap-2 text-xs font-medium text-sumi-muted truncate max-w-[50%]">
                    <span className="truncate">Draft Lokal</span>
                    <span className="text-sumi-10">/</span>
                    <span className="text-sumi truncate">{title || "Tanpa Judul"}.md</span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {/* Save status indicator */}
                    <div className="hidden md:flex items-center gap-1.5 text-xs font-medium transition-colors">
                        {saveStatus === "saving" && (
                            <><Loader2 size={14} className="animate-spin text-sumi-muted" />
                                <span className="text-sumi-muted">Menyimpan...</span></>
                        )}
                        {saveStatus === "saved" && (
                            <><Check size={14} className="text-emerald-500" />
                                <span className="text-emerald-600">Disimpan ke cloud</span></>
                        )}
                        {saveStatus === "error" && (
                            <><CloudIcon size={14} className="text-amber-500" />
                                <span className="text-amber-600 font-semibold">
                                    Gagal — tersimpan lokal
                                </span></>
                        )}
                        {saveStatus === "idle" && (
                            <><CheckCircle2 size={14} className="text-sumi-muted/50" />
                                <span className="text-sumi-muted/70">Tersimpan otomatis</span></>
                        )}
                    </div>

                    {/* Download .ntc */}
                    <button
                        onClick={handleDownloadNtc}
                        disabled={isDownloading || isInitialLoading}
                        title="Download sebagai file .ntc"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-sumi-10 text-xs font-medium text-sumi-muted hover:text-sumi hover:border-sumi/30 hover:bg-sumi/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isDownloading ? (
                            <Loader2 size={13} className="animate-spin" />
                        ) : (
                            <Download size={13} />
                        )}
                        <span className="hidden sm:inline">
                            {isDownloading ? "Mengekspor..." : ".ntc"}
                        </span>
                    </button>

                    <button
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="flex items-center gap-2 bg-sumi text-washi px-4 py-1.5 rounded-full text-xs font-bold hover:bg-sumi-light transition-all shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isPublishing ? (
                            <Loader2 size={12} className="animate-spin text-washi" />
                        ) : (
                            <Play size={12} className="fill-washi" />
                        )}
                        {isPublishing ? "Memproses..." : "Publikasikan"}
                    </button>
                </div>
            </div>

            {/* Area ngetik */}
            <div className="max-w-3xl mx-auto w-full px-6 md:px-8 py-10 md:py-12 flex-1 flex flex-col">
                {isInitialLoading ? (
                    <div className="animate-pulse flex flex-col gap-6 w-full">
                        <div className="h-12 bg-sumi-10 rounded-lg w-3/4" />
                        <div className="h-6 bg-sumi-10 rounded-lg w-1/3 mb-10" />
                        <div className="h-4 bg-sumi-10 rounded w-full" />
                        <div className="h-4 bg-sumi-10 rounded w-full" />
                        <div className="h-4 bg-sumi-10 rounded w-5/6" />
                    </div>
                ) : (
                    <>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Judul Artikel..."
                            className="text-3xl md:text-5xl font-bold text-sumi bg-transparent border-none outline-none placeholder:text-sumi-muted/30 mb-6"
                        />
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="Tambahkan tag (misal: Cloud, API)..."
                            className="text-sm font-medium text-sumi-muted bg-transparent border-b border-sumi-10 pb-2 mb-8 outline-none focus:border-sumi focus:text-sumi transition-colors"
                        />
                        <div className="sticky top-20 z-30">
                            <MenuBar editor={editor} />
                        </div>
                        <div className="flex-1 pb-32">
                            <EditorContent editor={editor} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}