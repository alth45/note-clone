"use client";

// components/write/EditorToolbar.tsx
// Toolbar formatting Tiptap: Bold, Italic, Heading, dll.

import {
    Bold, Italic, Heading2, Quote, Code, List, ListOrdered,
    Image as ImageIcon, Braces, Presentation
} from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useDialog } from "@/context/DialogContext";

interface EditorToolbarProps {
    editor: Editor | null;
}

export default function EditorToolbar({ editor }: EditorToolbarProps) {
    const { showPrompt } = useDialog();

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
                className={btn(editor.isActive("code"))} title="Inline Code (Ctrl+E)">
                <Code size={16} />
            </button>
            <button onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={btn(editor.isActive("codeBlock"))} title="Code Block">
                <Braces size={16} />
            </button>

            {divider}

            <button
                onClick={async () => {
                    const url = await showPrompt("Masukkan URL Gambar:", "Insert Image");
                    if (url) editor.chain().focus().setImage({ src: url }).run();
                }}
                className={btn(false)}
                title="Insert Image"
            >
                <ImageIcon size={16} />
            </button>

            {divider}

            <button onClick={addSlideEmbed}
                className={btn(false)} title="Sisipkan Slide / Iframe">
                <Presentation size={18} />
            </button>
        </div>
    );
}