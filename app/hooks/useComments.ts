"use client";

// hooks/useComments.ts
// Semua logic komentar: fetch, optimistic add, optimistic delete, reply state.

import { useState, useCallback, useEffect } from "react";

export interface CommentAuthor {
    id: string;
    name: string | null;
    handle: string | null;
    image: string | null;
    email: string;
}

export interface CommentData {
    id: string;
    content: string;
    createdAt: string;
    parentId: string | null;
    author: CommentAuthor;
    replies: CommentData[];
    _count: { replies: number };
}

interface UseCommentsReturn {
    comments: CommentData[];
    total: number;
    isLoading: boolean;
    isSubmitting: boolean;
    replyingTo: string | null;          // comment id yang sedang di-reply
    setReplyingTo: (id: string | null) => void;
    submitComment: (content: string, parentId?: string) => Promise<void>;
    deleteComment: (id: string) => Promise<void>;
    currentUserId: string | null;
}

export function useComments(
    postId: string,
    currentUser: { id: string; email: string } | null
): UseCommentsReturn {
    const [comments, setComments] = useState<CommentData[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/comments?postId=${postId}`);
                const data = await res.json();
                if (cancelled) return;
                setComments(data.comments ?? []);
                setTotal(data.total ?? 0);
            } catch {
                // silent — empty state ditampilkan di UI
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [postId]);

    // ── Submit (top-level atau reply) ─────────────────────────────────────────
    const submitComment = useCallback(async (
        content: string,
        parentId?: string,
    ) => {
        if (!content.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId, content, parentId }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message ?? "Gagal");
            }

            const newComment: CommentData = await res.json();

            setComments((prev) => {
                if (!parentId) {
                    // Top-level — append ke akhir
                    return [...prev, { ...newComment, replies: [] }];
                }
                // Reply — insert ke dalam parent
                return prev.map((c) =>
                    c.id === parentId
                        ? { ...c, replies: [...(c.replies ?? []), newComment], _count: { replies: c._count.replies + 1 } }
                        : c
                );
            });

            setTotal((n) => n + 1);
            setReplyingTo(null);

        } finally {
            setIsSubmitting(false);
        }
    }, [postId, isSubmitting]);

    // ── Delete ────────────────────────────────────────────────────────────────
    const deleteComment = useCallback(async (id: string) => {
        // Optimistic — hapus dari UI langsung
        const removeById = (list: CommentData[]): CommentData[] =>
            list
                .filter((c) => c.id !== id)
                .map((c) => ({ ...c, replies: removeById(c.replies ?? []) }));

        setComments((prev) => removeById(prev));
        setTotal((n) => Math.max(0, n - 1));

        try {
            await fetch(`/api/comments/${id}`, { method: "DELETE" });
        } catch {
            // Kalau gagal, refetch untuk restore state
            const res = await fetch(`/api/comments?postId=${postId}`);
            const data = await res.json();
            setComments(data.comments ?? []);
            setTotal(data.total ?? 0);
        }
    }, [postId]);

    return {
        comments,
        total,
        isLoading,
        isSubmitting,
        replyingTo,
        setReplyingTo,
        submitComment,
        deleteComment,
        currentUserId: currentUser?.id ?? null,
    };
}