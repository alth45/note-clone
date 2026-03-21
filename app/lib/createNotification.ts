// lib/createNotification.ts
// Helper server-side untuk buat notifikasi.
// Dipanggil dari: /api/comments POST, /api/follow POST, /api/interact POST.
// Fire-and-forget (tidak throw) — notifikasi tidak boleh block response utama.

import prisma from "@/lib/prisma";

type NotificationType = "NEW_COMMENT" | "NEW_REPLY" | "NEW_LIKE" | "NEW_FOLLOWER";

interface CreateNotificationParams {
    type: NotificationType;
    recipientId: string;
    actorId: string;
    postId?: string;
    commentId?: string;
}

export async function createNotification(
    params: CreateNotificationParams
): Promise<void> {
    const { type, recipientId, actorId, postId, commentId } = params;

    // Jangan buat notif ke diri sendiri
    if (recipientId === actorId) return;

    // Deduplicate: cegah spam notif untuk aksi yang sama
    // (misal like → unlike → like lagi dalam 1 menit = 1 notif)
    const DEDUP_WINDOW_MS = 60_000;
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);

    const existing = await prisma.notification.findFirst({
        where: {
            type,
            recipientId,
            actorId,
            ...(postId && { postId }),
            ...(commentId && { commentId }),
            createdAt: { gte: cutoff },
        },
    });

    if (existing) return; // Sudah ada notif sejenis baru-baru ini

    await prisma.notification.create({
        data: {
            type,
            recipientId,
            actorId,
            ...(postId && { postId }),
            ...(commentId && { commentId }),
        },
    });
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export async function notifyNewComment(opts: {
    postAuthorId: string;
    actorId: string;
    postId: string;
    commentId: string;
}) {
    await createNotification({
        type: "NEW_COMMENT",
        recipientId: opts.postAuthorId,
        actorId: opts.actorId,
        postId: opts.postId,
        commentId: opts.commentId,
    });
}

export async function notifyNewReply(opts: {
    parentCommentAuthorId: string;
    actorId: string;
    postId: string;
    commentId: string;
}) {
    await createNotification({
        type: "NEW_REPLY",
        recipientId: opts.parentCommentAuthorId,
        actorId: opts.actorId,
        postId: opts.postId,
        commentId: opts.commentId,
    });
}

export async function notifyNewLike(opts: {
    postAuthorId: string;
    actorId: string;
    postId: string;
}) {
    await createNotification({
        type: "NEW_LIKE",
        recipientId: opts.postAuthorId,
        actorId: opts.actorId,
        postId: opts.postId,
    });
}

export async function notifyNewFollower(opts: {
    followingId: string; // yang menerima follow
    actorId: string; // yang melakukan follow
}) {
    await createNotification({
        type: "NEW_FOLLOWER",
        recipientId: opts.followingId,
        actorId: opts.actorId,
    });
}