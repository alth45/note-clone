import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

import {
    notifyNewComment,
    notifyNewReply,
} from "@/lib/createNotification";

// ─── Rate limit config ────────────────────────────────────────────────────────
// Cooldown antar komentar per user (dalam ms)
const COMMENT_COOLDOWN_MS = 5_000;       // 5 detik antar komentar
const MAX_COMMENTS_PER_POST_PER_HOUR = 10; // max 10 komentar ke 1 artikel per jam
const MAX_COMMENTS_PER_HOUR = 20;          // max 20 komentar ke semua artikel per jam

// ─── Select shape yang konsisten ──────────────────────────────────────────────
const COMMENT_SELECT = {
    id: true,
    content: true,
    createdAt: true,
    parentId: true,
    author: {
        select: {
            id: true,
            name: true,
            handle: true,
            image: true,
            email: true,
        },
    },
    replies: {
        select: {
            id: true,
            content: true,
            createdAt: true,
            parentId: true,
            author: {
                select: {
                    id: true,
                    name: true,
                    handle: true,
                    image: true,
                    email: true,
                },
            },
            _count: { select: { replies: true } },
        },
        orderBy: { createdAt: "asc" as const },
    },
    _count: { select: { replies: true } },
} as const;

// ─── Rate limit checker ───────────────────────────────────────────────────────
async function checkRateLimit(
    userId: string,
    postId: string
): Promise<{ limited: boolean; message: string }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const cooldownStart = new Date(now.getTime() - COMMENT_COOLDOWN_MS);

    // Query semua dalam satu Promise.all — tidak perlu tunggu satu per satu
    const [lastComment, commentsThisPostThisHour, commentsThisHour] =
        await Promise.all([
            // 1. Komentar terakhir dari user ini (semua post) — cek cooldown
            prisma.comment.findFirst({
                where: { authorId: userId },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            }),

            // 2. Berapa komentar user ini ke post ini dalam 1 jam terakhir
            prisma.comment.count({
                where: {
                    authorId: userId,
                    postId,
                    createdAt: { gte: oneHourAgo },
                },
            }),

            // 3. Berapa total komentar user ini ke semua post dalam 1 jam terakhir
            prisma.comment.count({
                where: {
                    authorId: userId,
                    createdAt: { gte: oneHourAgo },
                },
            }),
        ]);

    // Cek cooldown — terlalu cepat komentar lagi
    if (lastComment && lastComment.createdAt > cooldownStart) {
        const sisaMs =
            COMMENT_COOLDOWN_MS -
            (now.getTime() - lastComment.createdAt.getTime());
        const sisaDetik = Math.ceil(sisaMs / 1000);
        return {
            limited: true,
            message: `Terlalu cepat. Tunggu ${sisaDetik} detik sebelum komentar lagi.`,
        };
    }

    // Cek limit per post per jam
    if (commentsThisPostThisHour >= MAX_COMMENTS_PER_POST_PER_HOUR) {
        return {
            limited: true,
            message: `Terlalu banyak komentar di artikel ini. Coba lagi dalam 1 jam.`,
        };
    }

    // Cek limit global per jam
    if (commentsThisHour >= MAX_COMMENTS_PER_HOUR) {
        return {
            limited: true,
            message: `Terlalu banyak komentar. Coba lagi dalam 1 jam.`,
        };
    }

    return { limited: false, message: "" };
}

// ─── GET /api/comments?postId=xxx ─────────────────────────────────────────────
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const postId = searchParams.get("postId");

        if (!postId) {
            return NextResponse.json(
                { message: "postId wajib diisi." },
                { status: 400 }
            );
        }

        const comments = await prisma.comment.findMany({
            where: { postId, parentId: null },
            select: COMMENT_SELECT,
            orderBy: { createdAt: "asc" },
        });

        const total = await prisma.comment.count({ where: { postId } });

        return NextResponse.json({ comments, total }, { status: 200 });

    } catch (error) {
        console.error("[GET /api/comments]", error);
        return NextResponse.json(
            { message: "Gagal mengambil komentar." },
            { status: 500 }
        );
    }
}

// ─── POST /api/comments — tambah komentar baru ────────────────────────────────
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Harus login untuk berkomentar." },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true, name: true, handle: true, image: true, email: true },
        });
        if (!user) {
            return NextResponse.json(
                { message: "User tidak ditemukan." },
                { status: 404 }
            );
        }

        const body = await req.json();
        const { postId, content, parentId } = body;

        // Validasi field wajib
        if (!postId || !content?.trim()) {
            return NextResponse.json(
                { message: "postId dan content wajib diisi." },
                { status: 400 }
            );
        }

        const trimmed = content.trim();
        if (trimmed.length > 2000) {
            return NextResponse.json(
                { message: "Komentar maksimal 2000 karakter." },
                { status: 400 }
            );
        }

        // Pastikan post exists dan published
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { id: true, published: true },
        });
        if (!post || !post.published) {
            return NextResponse.json(
                { message: "Artikel tidak ditemukan." },
                { status: 404 }
            );
        }

        // ── Rate limit check ──────────────────────────────────────────────────
        const { limited, message: limitMessage } = await checkRateLimit(
            user.id,
            postId
        );
        if (limited) {
            return NextResponse.json(
                { message: limitMessage },
                {
                    status: 429,
                    headers: {
                        // Beri tahu client kapan bisa coba lagi
                        "Retry-After": String(Math.ceil(COMMENT_COOLDOWN_MS / 1000)),
                    },
                }
            );
        }

        // Kalau reply, pastikan parent exists di post yang sama
        if (parentId) {
            const parent = await prisma.comment.findFirst({
                where: { id: parentId, postId },
            });
            if (!parent) {
                return NextResponse.json(
                    { message: "Komentar parent tidak ditemukan." },
                    { status: 404 }
                );
            }
        }

        const comment = await prisma.comment.create({
            data: {
                content: trimmed,
                postId,
                authorId: user.id,
                ...(parentId && { parentId }),
            },
            select: COMMENT_SELECT,
        });

        // Fire-and-forget notifikasi — tidak boleh block response
        void (async () => {
            if (parentId) {
                const parent = await prisma.comment.findUnique({
                    where: { id: parentId },
                    select: { authorId: true },
                });
                if (parent) {
                    await notifyNewReply({
                        parentCommentAuthorId: parent.authorId,
                        actorId: user.id,
                        postId,
                        commentId: comment.id,
                    });
                }
            } else {
                const postRecord = await prisma.post.findUnique({
                    where: { id: postId },
                    select: { authorId: true },
                });
                if (postRecord) {
                    await notifyNewComment({
                        postAuthorId: postRecord.authorId,
                        actorId: user.id,
                        postId,
                        commentId: comment.id,
                    });
                }
            }
        })();

        return NextResponse.json(comment, { status: 201 });

    } catch (error) {
        console.error("[POST /api/comments]", error);
        return NextResponse.json(
            { message: "Gagal menyimpan komentar." },
            { status: 500 }
        );
    }
}