/**
 * app/api/comments/route.ts  — VERSI HARDENED
 *
 * Gantikan file yang sudah ada.
 *
 * Perbaikan vs versi lama:
 *  - Rate limit di satu tempat menggunakan lib/rateLimit.ts (sliding window)
 *  - Input sanitasi: content di-trim & di-escape sebelum masuk DB
 *  - Select eksplisit: tidak pernah return kolom password/cliToken
 *  - Validasi parentId: pastikan parent ada di post yang sama (IDOR)
 *  - Error response konsisten
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
    getUserId,
    isValidCuid,
    sanitizeInput,
    unauthorized,
    badRequest,
    notFound,
    serverError,
    tooManyRequests,
    SAFE_USER_SELECT,
} from "@/lib/db";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { notifyNewComment, notifyNewReply } from "@/lib/createNotification";
import prisma from "@/lib/prisma";

const COMMENT_SELECT = {
    id: true,
    content: true,
    createdAt: true,
    parentId: true,
    author: { select: SAFE_USER_SELECT },
    replies: {
        select: {
            id: true,
            content: true,
            createdAt: true,
            parentId: true,
            author: { select: SAFE_USER_SELECT },
            _count: { select: { replies: true } },
        },
        orderBy: { createdAt: "asc" as const },
    },
    _count: { select: { replies: true } },
} as const;

// GET /api/comments?postId=xxx
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get("postId");

        if (!isValidCuid(postId)) {
            return badRequest("postId tidak valid.");
        }

        const [comments, total] = await Promise.all([
            prisma.comment.findMany({
                where: { postId, parentId: null },
                select: COMMENT_SELECT,
                orderBy: { createdAt: "asc" },
            }),
            prisma.comment.count({ where: { postId } }),
        ]);

        return NextResponse.json({ comments, total }, { status: 200 });
    } catch (error) {
        console.error("[GET /api/comments]", error);
        return serverError();
    }
}

// POST /api/comments
export async function POST(req: Request) {
    try {
        // 1. Auth
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return unauthorized("Harus login untuk berkomentar.");

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, name: true, handle: true, image: true, email: true },
        });
        if (!user) return unauthorized("Akun tidak ditemukan.");

        // 2. Rate limit per user — sliding window 10 komentar/jam
        const rl = rateLimit(`comment:${user.id}`, RATE_LIMITS.comment);
        if (!rl.allowed) return tooManyRequests(rl.retryAfter);

        // 3. Parse body
        let body: Record<string, unknown>;
        try {
            body = await req.json();
        } catch {
            return badRequest("Body tidak valid.");
        }

        const { postId, content, parentId } = body;

        // 4. Validasi input
        if (!isValidCuid(postId)) return badRequest("postId tidak valid.");

        // Sanitasi konten: strip HTML, batasi 2000 karakter
        const safeContent = sanitizeInput(content, 2000);
        if (!safeContent) return badRequest("Konten komentar tidak boleh kosong.");
        if (safeContent.length > 2000) return badRequest("Komentar maksimal 2000 karakter.");

        // 5. Verifikasi post exist dan published
        const post = await prisma.post.findUnique({
            where: { id: postId as string },
            select: { id: true, published: true, authorId: true },
        });
        if (!post || !post.published) return notFound("Artikel tidak ditemukan.");

        // 6. Validasi parentId jika reply (cegah IDOR — parent harus di post yang sama)
        let parentAuthorId: string | null = null;
        if (parentId !== undefined && parentId !== null) {
            if (!isValidCuid(parentId)) return badRequest("parentId tidak valid.");

            const parent = await prisma.comment.findFirst({
                where: { id: parentId as string, postId: postId as string }, // pastikan di post yang sama
                select: { id: true, authorId: true },
            });
            if (!parent) return notFound("Komentar parent tidak ditemukan.");
            parentAuthorId = parent.authorId;
        }

        // 7. Simpan komentar
        const comment = await prisma.comment.create({
            data: {
                content: safeContent,
                postId: postId as string,
                authorId: user.id,
                ...(parentId && { parentId: parentId as string }),
            },
            select: COMMENT_SELECT,
        });

        // 8. Notifikasi fire-and-forget
        void (async () => {
            if (parentId && parentAuthorId && parentAuthorId !== user.id) {
                await notifyNewReply({
                    parentCommentAuthorId: parentAuthorId,
                    actorId: user.id,
                    postId: postId as string,
                    commentId: comment.id,
                });
            } else if (!parentId && post.authorId !== user.id) {
                await notifyNewComment({
                    postAuthorId: post.authorId,
                    actorId: user.id,
                    postId: postId as string,
                    commentId: comment.id,
                });
            }
        })();

        return NextResponse.json(comment, { status: 201 });
    } catch (error) {
        console.error("[POST /api/comments]", error);
        return serverError();
    }
}