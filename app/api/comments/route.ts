import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

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
            // replies dari replies tidak di-fetch (max depth = 2)
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

        if (!postId) {
            return NextResponse.json(
                { message: "postId wajib diisi." },
                { status: 400 }
            );
        }

        // Hanya ambil top-level comments — replies sudah nested di dalam
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

// POST /api/comments — tambah komentar baru
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
        });
        if (!user) {
            return NextResponse.json(
                { message: "User tidak ditemukan." },
                { status: 404 }
            );
        }

        const body = await req.json();
        const { postId, content, parentId } = body;

        // Validasi
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

        return NextResponse.json(comment, { status: 201 });

    } catch (error) {
        console.error("[POST /api/comments]", error);
        return NextResponse.json(
            { message: "Gagal menyimpan komentar." },
            { status: 500 }
        );
    }
}