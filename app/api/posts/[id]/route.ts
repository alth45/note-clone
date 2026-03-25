/**
 * app/api/posts/[id]/route.ts  — VERSI HARDENED
 *
 * Gantikan file yang sudah ada.
 *
 * Perbaikan vs versi lama:
 *  - Semua field divalidasi satu per satu — tidak spread body langsung ke data{}
 *  - coverImage divalidasi URL sebelum masuk DB
 *  - tags disanitasi (lowercase, alphanumeric, deduplicated)
 *  - Rate limit autosave 30x/menit
 *  - Ownership check menggunakan getOwnedPost() dari lib/db.ts
 *  - Error response tidak bocorkan detail internal
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
    getUserId,
    getOwnedPost,
    isValidCuid,
    sanitizeInput,
    sanitizeUrl,
    sanitizeTags,
    unauthorized,
    badRequest,
    notFound,
    serverError,
    tooManyRequests,
} from "@/lib/db";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import prisma from "@/lib/prisma";

// PATCH /api/posts/[id]
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return unauthorized();

        const user = await getUserId(session.user.email);
        if (!user) return unauthorized();

        // Validasi format id sebelum query
        if (!isValidCuid(id)) return notFound();

        // Rate limit autosave — 30 save/menit per user
        const rl = rateLimit(`posts.patch:${user.id}`, RATE_LIMITS.autoSave);
        if (!rl.allowed) return tooManyRequests(rl.retryAfter);

        // Ownership check — sekaligus filter by authorId
        const existingPost = await getOwnedPost(id, user.id);
        if (!existingPost) return notFound("Artikel tidak ditemukan.");

        // Parse body
        let body: Record<string, unknown>;
        try {
            body = await req.json();
        } catch {
            return badRequest("Body tidak valid.");
        }

        // Bangun update data — VALIDASI SETIAP FIELD, jangan spread langsung
        const updateData: Record<string, unknown> = {};

        if (body.title !== undefined) {
            const safeTitle = sanitizeInput(body.title, 300);
            if (!safeTitle) return badRequest("Judul tidak boleh kosong.");
            updateData.title = safeTitle;
        }

        if (body.content !== undefined) {
            if (typeof body.content === "string") {
                if (body.content.length > 500_000) {
                    return badRequest("Konten terlalu besar. Maksimal 500.000 karakter.");
                }
                updateData.content = body.content;
            } else if (body.content !== null && typeof body.content === "object") {
                updateData.content = body.content;
            }
        }

        if (body.published !== undefined) {
            if (typeof body.published !== "boolean") {
                return badRequest("published harus boolean.");
            }
            updateData.published = body.published;
        }

        if (body.coverImage !== undefined) {
            if (body.coverImage === null) {
                updateData.coverImage = null;
            } else {
                const safeUrl = sanitizeUrl(body.coverImage);
                if (!safeUrl) return badRequest("URL cover image tidak valid (harus http/https).");
                updateData.coverImage = safeUrl;
            }
        }

        if (body.tags !== undefined) {
            updateData.tags = sanitizeTags(body.tags);
        }

        if (Object.keys(updateData).length === 0) {
            return badRequest("Tidak ada field yang diupdate.");
        }

        const updatedPost = await prisma.post.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                title: true,
                slug: true,
                published: true,
                updatedAt: true,
                tags: true,
            },
        });

        return NextResponse.json(
            { message: "Tersimpan", post: updatedPost },
            { status: 200 }
        );
    } catch (error) {
        console.error("[PATCH /api/posts/[id]]", error);
        return serverError();
    }
}

// GET /api/posts/[id]
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return unauthorized();

        const user = await getUserId(session.user.email);
        if (!user) return unauthorized();

        if (!isValidCuid(id)) return notFound();

        // getOwnedPost sudah filter by authorId — ini mencegah IDOR
        const post = await getOwnedPost(id, user.id);
        if (!post) return notFound("Artikel tidak ditemukan.");

        return NextResponse.json(post, { status: 200 });
    } catch (error) {
        console.error("[GET /api/posts/[id]]", error);
        return serverError();
    }
}