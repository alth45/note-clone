"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Play, Bold, Italic, Heading2, Quote, Code, List, ListOrdered, Image as ImageIcon, Braces, Loader2, CloudIcon, Check, Presentation } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';

// --- IMPORT "OTAK TAMBAHAN" TIPTAP (TABLE & CODE) ---
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CodeBlock from '@tiptap/extension-code-block';
import TiptapCode from '@tiptap/extension-code'; // Pakai alias biar gak bentrok sama icon <Code />

import { useDialog } from "@/context/DialogContext";
import { useRouter } from "next/navigation";
import { SlideEmbed } from "@/lib/SlideExtension";

// --- KOMPONEN TOOLBAR EDITOR ---
const MenuBar = ({ editor }: { editor: any }) => {
    // FUNGSI BUAT NANGKAP LINK SLIDE
    const addSlideEmbed = () => {
        const url = prompt("Masukkan Link Embed Slide (Google Slides, SpeakerDeck, atau link PDF):");

        if (url && editor) {
            editor.chain().focus().setSlide({ src: url }).run();
        }
    };
    const { showPrompt } = useDialog();

    if (!editor) return null;

    return (
        <div className="flex items-center gap-1 md:gap-2 mb-8 bg-washi-dark/50 p-2 rounded-xl border border-sumi-10 overflow-x-auto scrollbar-hide">
            {/* Format Teks */}
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-sumi text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`} title="Bold (Ctrl+B)"><Bold size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-sumi text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`} title="Italic (Ctrl+I)"><Italic size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1"></div>
            {/* Heading & Quote */}
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 rounded-lg transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-sumi text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`} title="Heading"><Heading2 size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive('blockquote') ? 'bg-sumi text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`} title="Quote"><Quote size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1"></div>
            {/* List */}
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-sumi text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`} title="Bullet List"><List size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-sumi text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`} title="Numbered List"><ListOrdered size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1"></div>
            {/* Kebutuhan Artikel Tech: Code & Code Block */}
            <button onClick={() => editor.chain().focus().toggleCode().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive('code') ? 'bg-sumi text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`} title="Inline Code (Ctrl+E)"><Code size={16} /></button>
            <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive('codeBlock') ? 'bg-sumi text-washi' : 'text-sumi-muted hover:text-sumi hover:bg-sumi/5'}`} title="Code Block"><Braces size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1"></div>
            {/* Gambar */}
            <button onClick={async () => {
                const url = await showPrompt('Masukkan URL Gambar:', 'Insert Image');
                if (url) editor.chain().focus().setImage({ src: url }).run();
            }} className="p-2 rounded-lg text-sumi-muted hover:text-sumi hover:bg-sumi/5 transition-colors" title="Insert Image"><ImageIcon size={16} /></button>
            <div className="w-[1px] h-6 bg-sumi-10 mx-1"></div>
            <button
                onClick={addSlideEmbed}
                className="p-2 text-sumi-muted hover:text-sumi hover:bg-sumi/10 rounded-md transition-colors"
                title="Sisipkan Slide / Iframe"
            >
                <Presentation size={18} />
            </button>
        </div>
    );
};

// --- PROPS DARI WritePage ---
interface EditorCanvasProps {
    postId: string;
}

// --- KANVAS UTAMA ---
export default function EditorCanvas({ postId }: EditorCanvasProps) {
    const router = useRouter();
    const { showPrompt, showAlert } = useDialog();

    // 1. STATE UNTUK DATA & AUTO-SAVE
    const [title, setTitle] = useState("Tanpa Judul");
    const [content, setContent] = useState("");
    const [tags, setTags] = useState("");

    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const isFirstRender = useRef(true);
    const [isPublishing, setIsPublishing] = useState(false);

    // 1. TAMBAHIN STATE LOADING INI
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // 2. INISIALISASI TIPTAP
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Image.configure({
                HTMLAttributes: { class: 'rounded-2xl border border-sumi-10 shadow-sm max-h-[500px] w-full object-cover my-8' },
            }),
            Placeholder.configure({
                placeholder: 'Mulai ketik pemikiran, riset, atau kode arsitektur Anda di sini...',
            }),
            SlideEmbed,
            // --- EKSTENSI BARU DIDAFTARKAN DI SINI ---
            CodeBlock,
            TiptapCode,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: '',
        editorProps: {
            attributes: {
                // Tambahin styling dasar tabel biar kalau lagi ngedit di canvas nggak berantakan bentuknya
                class: 'prose prose-lg prose-sumi max-w-none min-h-[500px] prose-p:text-sumi-light prose-p:leading-relaxed prose-h3:text-2xl prose-h3:font-bold prose-blockquote:border-l-4 prose-blockquote:border-sumi-10 prose-blockquote:pl-6 prose-blockquote:italic prose-pre:bg-sumi prose-pre:text-washi-dark prose-pre:rounded-xl prose-code:text-sumi-light prose-table:table-auto prose-td:border prose-td:border-sumi-10 prose-td:p-2 prose-th:border prose-th:border-sumi-10 prose-th:p-2 prose-th:bg-sumi/5 focus:outline-none',
            },
        },
        // TRIGGER SETIAP KALI TIPTAP BERUBAH
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        }
    });

    // 3. MESIN AUTO-SAVE (DEBOUNCING)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        setSaveStatus("saving");

        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await fetch(`/api/posts/${postId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: title,
                        content: content
                    }),
                });

                if (res.ok) {
                    setSaveStatus("saved");
                    setTimeout(() => setSaveStatus("idle"), 2000);
                } else {
                    setSaveStatus("error");
                }
            } catch (error) {
                console.error(error);
                setSaveStatus("error");
            }
        }, 1000);

        return () => clearTimeout(delayDebounceFn);

    }, [title, content, postId]);

    // FUNGSI SAKTI TOMBOL PUBLIKASIKAN
    const handlePublish = async () => {
        setIsPublishing(true);
        try {
            const res = await fetch(`/api/posts/${postId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    content: content,
                    published: true
                }),
            });

            if (res.ok) {
                showAlert("Artikel berhasil mengudara ke publik!", "Sukses", "success");
                router.push("/");
                router.refresh();
            } else {
                showAlert("Gagal mempublikasikan artikel.", "Error", "danger");
            }
        } catch (error) {
            showAlert("Koneksi server bermasalah.", "Error", "danger");
        } finally {
            setIsPublishing(false);
        }
    };

    // 2. TAMBAHIN USE-EFFECT INI BUAT NARIK DATA PAS PERTAMA BUKA!
    useEffect(() => {
        const fetchPostData = async () => {
            try {
                const res = await fetch(`/api/posts/${postId}`);
                if (res.ok) {
                    const data = await res.json();
                    setTitle(data.title || "Tanpa Judul");

                    if (data.content && typeof data.content === 'string') {
                        setContent(data.content);
                        if (editor) {
                            editor.commands.setContent(data.content);
                        }
                    }
                }
            } catch (error) {
                console.error("Gagal load artikel:", error);
            } finally {
                setIsInitialLoading(false);
            }
        };

        if (editor) {
            fetchPostData();
        }
    }, [postId, editor]);

    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-washi relative">
            {/* Top Bar Editor */}
            <div className="sticky top-0 z-40 flex items-center justify-between px-6 md:px-8 py-4 bg-washi/90 backdrop-blur-sm border-b border-sumi-10">
                <div className="flex items-center gap-2 text-xs font-medium text-sumi-muted truncate max-w-[50%]">
                    <span className="truncate">Draft Lokal</span>
                    <span className="text-sumi-10">/</span>
                    <span className="text-sumi truncate">{title || "Tanpa Judul"}.md</span>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {/* INDIKATOR AUTO-SAVE DINAMIS */}
                    <div className="hidden md:flex items-center gap-1.5 text-xs font-medium transition-colors">
                        {saveStatus === "saving" && <><Loader2 size={14} className="animate-spin text-sumi-muted" /> <span className="text-sumi-muted">Menyimpan...</span></>}
                        {saveStatus === "saved" && <><Check size={14} className="text-emerald-500" /> <span className="text-emerald-600">Disimpan ke cloud</span></>}
                        {saveStatus === "error" && <><CloudIcon size={14} className="text-red-500" /> <span className="text-red-500">Gagal menyimpan</span></>}
                        {saveStatus === "idle" && <><CheckCircle2 size={14} className="text-sumi-muted/50" /> <span className="text-sumi-muted/70">Tersimpan otomatis</span></>}
                    </div>

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

            {/* Area Ngetik Utama */}
            <div className="max-w-3xl mx-auto w-full px-6 md:px-8 py-10 md:py-12 flex-1 flex flex-col">
                {isInitialLoading ? (
                    <div className="animate-pulse flex flex-col gap-6 w-full">
                        <div className="h-12 bg-sumi-10 rounded-lg w-3/4"></div>
                        <div className="h-6 bg-sumi-10 rounded-lg w-1/3 mb-10"></div>
                        <div className="h-4 bg-sumi-10 rounded w-full"></div>
                        <div className="h-4 bg-sumi-10 rounded w-full"></div>
                        <div className="h-4 bg-sumi-10 rounded w-5/6"></div>
                    </div>
                ) : (
                    <>
                        < input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Judul Artikel..."
                            className="text-3xl md:text-5xl font-bold text-sumi bg-transparent border-none outline-none placeholder:text-sumi-muted/30 mb-6"
                        />

                        {/* Input Kategori / Tags Terikat State */}
                        <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            placeholder="Tambahkan tag (misal: Cloud, API)..."
                            className="text-sm font-medium text-sumi-muted bg-transparent border-b border-sumi-10 pb-2 mb-8 outline-none focus:border-sumi focus:text-sumi transition-colors"
                        />

                        {/* Menu Bar Tiptap */}
                        <div className="sticky top-20 z-30">
                            <MenuBar editor={editor} />
                        </div>

                        {/* Komponen Inti Editor Tiptap */}
                        <div className="flex-1 pb-32">
                            <EditorContent editor={editor} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}