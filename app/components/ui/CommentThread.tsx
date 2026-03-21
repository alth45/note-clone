"use client";

// components/ui/CommentThread.tsx
// Thread komentar lengkap: list, form, reply, delete.

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Trash2, CornerDownRight, Loader2, LogIn } from "lucide-react";
import { useSession } from "next-auth/react";
import { useComments, type CommentData } from "@/hooks/useComments";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return "baru saja";
    if (mins < 60) return `${mins}m lalu`;
    if (hours < 24) return `${hours}j lalu`;
    if (days < 7) return `${days}h lalu`;
    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric", month: "short", year: "numeric",
    }).format(new Date(dateStr));
}

function Avatar({ user, size = 32 }: { user: { name?: string | null; image?: string | null }; size?: number }) {
    const initials = (user.name ?? "?")[0].toUpperCase();
    return (
        <div
            className="rounded-full overflow-hidden bg-sumi-10 shrink-0 flex items-center justify-center text-xs font-bold text-sumi-muted"
            style={{ width: size, height: size, minWidth: size }}
        >
            {user.image
                ? <img src={user.image} alt="" className="w-full h-full object-cover" />
                : initials
            }
        </div>
    );
}

// ─── Comment input form ───────────────────────────────────────────────────────

interface CommentFormProps {
    onSubmit: (content: string) => Promise<void>;
    isSubmitting: boolean;
    placeholder?: string;
    autoFocus?: boolean;
    onCancel?: () => void;
    compact?: boolean;
}

function CommentForm({
    onSubmit,
    isSubmitting,
    placeholder = "Tulis komentar...",
    autoFocus = false,
    onCancel,
    compact = false,
}: CommentFormProps) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { data: session } = useSession();

    useEffect(() => {
        if (autoFocus) textareaRef.current?.focus();
    }, [autoFocus]);

    const handleSubmit = async () => {
        if (!value.trim() || isSubmitting) return;
        await onSubmit(value);
        setValue("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Ctrl/Cmd+Enter untuk submit
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSubmit();
        }
    };

    if (!session) {
        return (
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-sumi-10 bg-washi-dark/30">
                <LogIn size={16} className="text-sumi-muted" />
                <p className="text-sm text-sumi-muted flex-1">
                    <Link href="/login" className="text-sumi font-medium hover:underline underline-offset-2">
                        Login
                    </Link>
                    {" "}untuk ikut berdiskusi.
                </p>
            </div>
        );
    }

    return (
        <div className={`flex gap-3 ${compact ? "" : ""}`}>
            {!compact && (
                <Avatar
                    user={{ name: session.user?.name, image: session.user?.image }}
                    size={36}
                />
            )}
            <div className="flex-1 flex flex-col gap-2">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={compact ? 2 : 3}
                    maxLength={2000}
                    className={`w-full resize-none rounded-xl border border-sumi-10 bg-washi px-3 py-2.5 text-sm text-sumi outline-none focus:border-sumi/40 transition-colors placeholder:text-sumi-muted/50 ${compact ? "text-xs" : ""
                        }`}
                />
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-sumi-muted/50">
                        {value.length > 0 && `${value.length}/2000`}
                        {value.length === 0 && "Ctrl+Enter untuk kirim"}
                    </span>
                    <div className="flex items-center gap-2">
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="px-3 py-1.5 text-xs font-medium text-sumi-muted hover:text-sumi transition-colors"
                            >
                                Batal
                            </button>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={!value.trim() || isSubmitting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sumi text-washi text-xs font-bold rounded-lg hover:bg-sumi-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSubmitting
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Send size={12} />
                            }
                            {compact ? "Balas" : "Kirim"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Single comment + replies ─────────────────────────────────────────────────

interface CommentItemProps {
    comment: CommentData;
    currentUserId: string | null;
    isSubmitting: boolean;
    replyingTo: string | null;
    onReply: (id: string | null) => void;
    onSubmitReply: (content: string, parentId: string) => Promise<void>;
    onDelete: (id: string) => void;
    depth?: number;
}

function CommentItem({
    comment,
    currentUserId,
    isSubmitting,
    replyingTo,
    onReply,
    onSubmitReply,
    onDelete,
    depth = 0,
}: CommentItemProps) {
    const isOwn = currentUserId === comment.author.id;
    const isReplying = replyingTo === comment.id;

    return (
        <div className={`flex gap-3 ${depth > 0 ? "ml-8 mt-3" : ""}`}>
            <Avatar user={comment.author} size={depth > 0 ? 28 : 34} />

            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-sumi">
                        {comment.author.name ?? "Anonim"}
                    </span>
                    {comment.author.handle && (
                        <span className="text-xs text-sumi-muted/60">
                            @{comment.author.handle}
                        </span>
                    )}
                    <span className="text-xs text-sumi-muted/50">
                        {timeAgo(comment.createdAt)}
                    </span>
                </div>

                {/* Content */}
                <p className="text-sm text-sumi-light leading-relaxed whitespace-pre-wrap break-words">
                    {comment.content}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-3 mt-2">
                    {depth === 0 && (
                        <button
                            onClick={() => onReply(isReplying ? null : comment.id)}
                            className={`flex items-center gap-1 text-xs transition-colors ${isReplying
                                    ? "text-sumi font-medium"
                                    : "text-sumi-muted hover:text-sumi"
                                }`}
                        >
                            <CornerDownRight size={12} />
                            {isReplying ? "Batal" : "Balas"}
                            {comment._count.replies > 0 && !isReplying && (
                                <span className="text-sumi-muted/50 ml-0.5">
                                    ({comment._count.replies})
                                </span>
                            )}
                        </button>
                    )}

                    {isOwn && (
                        <button
                            onClick={() => onDelete(comment.id)}
                            className="flex items-center gap-1 text-xs text-sumi-muted/40 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={11} />
                            Hapus
                        </button>
                    )}
                </div>

                {/* Reply form */}
                {isReplying && depth === 0 && (
                    <div className="mt-3">
                        <CommentForm
                            onSubmit={(c) => onSubmitReply(c, comment.id)}
                            isSubmitting={isSubmitting}
                            placeholder={`Balas ke ${comment.author.name ?? "Anonim"}...`}
                            autoFocus
                            onCancel={() => onReply(null)}
                            compact
                        />
                    </div>
                )}

                {/* Nested replies — max depth 1 */}
                {comment.replies?.length > 0 && (
                    <div className="mt-2 border-l-2 border-sumi-10 pl-3">
                        {comment.replies.map((reply) => (
                            <CommentItem
                                key={reply.id}
                                comment={reply}
                                currentUserId={currentUserId}
                                isSubmitting={isSubmitting}
                                replyingTo={replyingTo}
                                onReply={onReply}
                                onSubmitReply={onSubmitReply}
                                onDelete={onDelete}
                                depth={1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface CommentThreadProps {
    postId: string;
}

export default function CommentThread({ postId }: CommentThreadProps) {
    const { data: session } = useSession();
    const currentUser = session?.user
        ? { id: (session.user as any).id, email: session.user.email! }
        : null;

    const {
        comments,
        total,
        isLoading,
        isSubmitting,
        replyingTo,
        setReplyingTo,
        submitComment,
        deleteComment,
    } = useComments(postId, currentUser);

    return (
        <section className="mt-20 pt-10 border-t border-sumi-10">

            {/* Header */}
            <div className="max-w-3xl mx-auto px-6 md:px-8 mb-8">
                <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-sumi-muted" />
                    <h2 className="text-base font-bold text-sumi">
                        Diskusi
                        {total > 0 && (
                            <span className="ml-2 text-sm font-normal text-sumi-muted">
                                ({total})
                            </span>
                        )}
                    </h2>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 md:px-8 flex flex-col gap-6">

                {/* Form komentar baru */}
                <CommentForm
                    onSubmit={(c) => submitComment(c)}
                    isSubmitting={isSubmitting}
                />

                {/* List */}
                {isLoading ? (
                    <div className="flex items-center gap-2 py-8 text-sumi-muted justify-center">
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-sm">Memuat komentar...</span>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="py-10 text-center text-sumi-muted">
                        <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">Belum ada komentar.</p>
                        <p className="text-xs mt-1 opacity-60">Jadilah yang pertama!</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {comments.map((comment) => (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                currentUserId={currentUser?.id ?? null}
                                isSubmitting={isSubmitting}
                                replyingTo={replyingTo}
                                onReply={setReplyingTo}
                                onSubmitReply={(c, parentId) => submitComment(c, parentId)}
                                onDelete={deleteComment}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}