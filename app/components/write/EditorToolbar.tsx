/**
 * app/components/write/EditorToolbar.tsx  — PATCH untuk image upload
 *
 * Tambahkan tombol upload gambar di toolbar editor.
 * Gantikan seluruh file EditorToolbar.tsx yang sudah ada dengan ini.
 *
 * Perubahan:
 *  - Tombol gambar sekarang punya dropdown: Upload File vs URL
 *  - File diupload ke Supabase, URL langsung di-insert ke editor
 */

"use client";

import { useRef, useState } from "react";
import {
    Bold, Italic, Heading2, Quote, Code, List, ListOrdered,
    Image as ImageIcon, Braces, Presentation, Upload, Link2, X,
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useDialog } from "@/context/DialogContext";
import { useUpload } from "@/hooks/useUpload";

interface EditorToolbarProps {
    editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
    const { showPrompt } = useDialog();
    const { upload, isUploading } = useUpload("editor");

    const [imgMenuOpen, setImgMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload file ke Supabase lalu insert ke editor
    const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editor) return;

        setImgMenuOpen(false);

        // Masukkan placeholder dulu biar user tahu sedang proses
        editor.chain().focus().insertContent("<p><em>Mengupload gambar...</em></p>").run();

        const url = await upload(file);

        // Hapus placeholder
        const html = editor.getHTML();
        const cleaned = html.replace("<p><em>Mengupload gambar...</em></p>", "");
        editor.commands.setContent(cleaned);

        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }

        // Reset input supaya bisa upload file yang sama lagi
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Insert gambar dari URL
    const handleImageUrl = async () => {
        setImgMenuOpen(false);
        if (!editor) return;
        const url = await showPrompt("Masukkan URL gambar:", "Insert dari URL");
        if (url?.trim()) {
            editor.chain().focus().setImage({ src: url.trim() }).run();
        }
    };

    const addSlideEmbed = () => {
        const url = prompt("Masukkan Link Embed Slide:");
        if (url && editor) editor.chain().focus().setSlide({ src: url }).run();
    };

    if (!editor) return null;

    const btn = (active: boolean) =>
        `p-2 rounded-lg transition-colors ${active
            ? "bg-sumi text-washi"
            : "text-sumi-muted hover:text-sumi hover:bg-sumi/5"
        }`;

    const divider = <div className="w-[1px] h-6 bg-sumi-10 mx-1" />;

    return (
        <div className="flex items-center gap-1 md:gap-2 mb-8 bg-washi-dark/50 p-2 rounded-xl border border-sumi-10 overflow-x-auto scrollbar-hide">

            <button onClick={() => editor.chain().focus().toggleBold().run()}
                className={btn(editor.isActive("bold"))} title="Bold (Ctrl+B)">
                <Bold size={16} />
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()}
                className={btn(editor.isActive("italic"))} title="Italic (Ctrl+I)">
                <Italic size={16} />
            </button>

            {divider}

            <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={btn(editor.isActive("heading", { level: 3 }))} title="Heading 3">
                <Heading2 size={16} />
            </button>
            <button onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={btn(editor.isActive("blockquote"))} title="Blockquote">
                <Quote size={16} />
            </button>

            {divider}

            <button onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={btn(editor.isActive("bulletList"))} title="Bullet List">
                <List size={16} />
            </button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={btn(editor.isActive("orderedList"))} title="Numbered List">
                <ListOrdered size={16} />
            </button>

            {divider}

            <button onClick={() => editor.chain().focus().toggleCode().run()}
                className={btn(editor.isActive("code"))} title="Inline Code">
                <Code size={16} />
            </button>
            <button onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={btn(editor.isActive("codeBlock"))} title="Code Block">
                <Braces size={16} />
            </button>

            {divider}

            {/* Image button dengan dropdown */}
            <div className="relative">
                <button
                    onClick={() => setImgMenuOpen((v) => !v)}
                    disabled={isUploading}
                    className={`${btn(false)} ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                    title="Insert Gambar"
                >
                    {isUploading
                        ? <span className="text-[10px] font-bold px-1">...</span>
                        : <ImageIcon size={16} />
                    }
                </button>

                {imgMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setImgMenuOpen(false)}
                        />
                        {/* Dropdown */}
                        <div className="absolute top-full left-0 mt-1 w-44 bg-washi border border-sumi-10 rounded-xl shadow-lg z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                onChange={handleImageFile}
                                className="hidden"
                            />
                            <button
                                onClick={() => { setImgMenuOpen(false); fileInputRef.current?.click(); }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-medium text-sumi hover:bg-sumi/5 transition-colors"
                            >
                                <Upload size={13} className="text-sumi-muted" />
                                Upload dari perangkat
                            </button>
                            <div className="h-[0.5px] bg-sumi-10 mx-3" />
                            <button
                                onClick={handleImageUrl}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs font-medium text-sumi hover:bg-sumi/5 transition-colors"
                            >
                                <Link2 size={13} className="text-sumi-muted" />
                                Insert dari URL
                            </button>
                        </div>
                    </>
                )}
            </div>

            {divider}

            <button onClick={addSlideEmbed}
                className={btn(false)} title="Sisipkan Slide / Iframe">
                <Presentation size={18} />
            </button>
        </div>
    );
}