"use client";

// EditorCanvas.tsx
// Orchestrator — hanya menyambungkan hooks dan komponen.
// Tidak ada business logic di sini.

import { useRef } from "react";
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
import { SlideEmbed } from "@/lib/SlideExtension";

import { useDialog } from "@/context/DialogContext";
import { useRouter } from "next/navigation";

import { useEditorPost } from "@/components/write/hooks/useEditorPost";
import { useDraftBackup } from "@/components/write/hooks/useDraftBackup";
import { useNtcDownload } from "@/components/write/hooks/useNtcDownload";
import { clearDraftFromLS } from "@/components/write/utils/draftStorage";

import RecoveryBanner from "@/components/write/RecoveryBanner";
import EditorTopBar from "@/components/write/EditorTopBar";
import EditorToolbar from "@/components/write/EditorToolbar";
import TagInput from "@/components/write/TagInput";

interface EditorCanvasProps {
    postId: string;
}

export default function EditorCanvas({ postId }: EditorCanvasProps) {
    const router = useRouter();
    const { showAlert } = useDialog();
    const isApplyingBackup = useRef(false);

    // ── Tiptap editor instance ────────────────────────────────────────────────
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Image.configure({
                HTMLAttributes: {
                    class: "rounded-2xl border border-sumi-10 shadow-sm max-h-[500px] w-full object-cover my-8",
                },
            }),
            Placeholder.configure({
                placeholder: "Mulai ketik pemikiran, riset, atau kode arsitektur Anda di sini...",
            }),
            SlideEmbed,
            CodeBlock,
            TiptapCode,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            LinkExtension.configure({
                openOnClick: false,
                HTMLAttributes: { class: "text-blue-500 hover:text-blue-700 underline cursor-pointer" },
            }),
        ],
        content: "",
        editorProps: {
            attributes: {
                class: [
                    "prose prose-lg prose-sumi max-w-none min-h-[500px]",
                    "prose-p:text-sumi-light prose-p:leading-relaxed",
                    "prose-h3:text-2xl prose-h3:font-bold",
                    "prose-blockquote:border-l-4 prose-blockquote:border-sumi-10",
                    "prose-blockquote:pl-6 prose-blockquote:italic",
                    "prose-pre:bg-sumi prose-pre:text-washi-dark prose-pre:rounded-xl",
                    "prose-code:text-sumi-light",
                    "prose-table:table-auto prose-td:border prose-td:border-sumi-10",
                    "prose-td:p-2 prose-th:border prose-th:border-sumi-10",
                    "prose-th:p-2 prose-th:bg-sumi/5",
                    "focus:outline-none",
                ].join(" "),
            },
        },
        onUpdate: ({ editor }) => {
            if (!isApplyingBackup.current) {
                post.setContent(editor.getHTML());
            }
        },
    });

    // ── Hooks ─────────────────────────────────────────────────────────────────
    const backup = useDraftBackup({
        postId,
        editor,
        setTitle: (t) => post.setTitle(t),
        setContent: (c) => post.setContent(c),
        onRestoreComplete: () => {
            isApplyingBackup.current = false;
            post.setSaveStatus("saving");
        },
    });

    const post = useEditorPost({
        postId,
        editor,
        isApplyingBackup,
        onLoaded: (t, c) => backup.checkForBackup(t, c),
        onSaveFailed: (t, c) => backup.saveBackup(t, c),
        onSaveSuccess: () => backup.clearBackup(),
    });

    const ntc = useNtcDownload({
        title: post.title,
        content: post.content,
        onError: (msg) => showAlert(msg, "Error", "danger"),
    });

    // ── Publish handler — perlu router, tidak bisa di dalam hook ─────────────
    const handlePublish = async () => {
        const ok: any = await post.handlePublish();
        if (ok) {
            clearDraftFromLS(postId);
            showAlert("Artikel berhasil mengudara ke publik!", "Sukses", "success");
            router.push("/");
            router.refresh();
        } else {
            showAlert("Gagal mempublikasikan artikel.", "Error", "danger");
        }
    };

    // ── Restore intercept — set guard sebelum backup apply ───────────────────
    const handleRestore = () => {
        isApplyingBackup.current = true;
        backup.handleRestore();
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto bg-washi relative">

            {backup.pendingBackup && (
                <RecoveryBanner
                    backup={backup.pendingBackup}
                    onRestore={handleRestore}
                    onDismiss={backup.handleDismiss}
                />
            )}

            <EditorTopBar
                title={post.title}
                saveStatus={post.saveStatus}
                isPublishing={post.isPublishing}
                isDownloading={ntc.isDownloading}
                isLoading={post.isInitialLoading}
                onDownload={ntc.handleDownload}
                onPublish={handlePublish}
            />

            <div className="max-w-3xl mx-auto w-full px-6 md:px-8 py-10 md:py-12 flex-1 flex flex-col">
                {post.isInitialLoading ? (
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
                            value={post.title}
                            onChange={(e) => post.setTitle(e.target.value)}
                            placeholder="Judul Artikel..."
                            className="text-3xl md:text-5xl font-bold text-sumi bg-transparent border-none outline-none placeholder:text-sumi-muted/30 mb-6"
                        />

                        <TagInput
                            tags={post.tags}
                            input={post.tagInput}
                            onChange={post.setTagInput}
                            onAdd={(tag) => post.setTags((prev) => [...prev, tag])}
                            onRemove={(tag) => post.setTags((prev) => prev.filter((t) => t !== tag))}
                        />

                        <div className="sticky top-20 z-30">
                            <EditorToolbar editor={editor} />
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