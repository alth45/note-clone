/**
 * app/api/interact/route.ts  — VERSI HARDENED
 *
 * Gantikan file yang sudah ada.
 *
 * Perbaikan vs versi lama:
 *  - IDOR: verifikasi post exist sebelum like/bookmark
 *  - Atomic: like + counter dalam 1 $transaction
 *  - Rate limit: max 60 interact/menit per user
 *  - Input validation: postId divalidasi sebelum query
 *  - Error: tidak bocorkan detail internal
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import {
    getUserId,
    toggleLike,
    toggleBookmark,
    isValidCuid,
    unauthorized,
    badRequest,
    notFound,
    serverError,
    tooManyRequests,
} from "@/lib/db";
import { rateLimit, RATE_LIMITS } from "@/lib/rateLimit";
import { notifyNewLike } from "@/lib/createNotification";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        // 1. Auth
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return unauthorized();

        const user = await getUserId(session.user.email);
        if (!user) return unauthorized("Akun tidak ditemukan.");

        // 2. Rate limit per user
        const rl = rateLimit(`interact:${user.id}`, RATE_LIMITS.interact);
        if (!rl.allowed) return tooManyRequests(rl.retryAfter);

        // 3. Parse body
        let body: Record<string, unknown>;
        try {
            body = await req.json();
        } catch {
            return badRequest("Body tidak valid.");
        }

        const { action, postId } = body;

        // 4. Validasi input sebelum query ke DB
        if (!isValidCuid(postId)) {
            return badRequest("postId tidak valid.");
        }

        if (action !== "like" && action !== "bookmark") {
            return badRequest("Aksi tidak dikenal.");
        }

        // 5. Verifikasi post exist dan published — cegah like ke post orang lain yang private
        const post = await prisma.post.findFirst({
            where: { id: postId, published: true },
            select: { id: true, authorId: true },
        });

        if (!post) return notFound("Artikel tidak ditemukan.");

        // 6. Eksekusi aksi
        if (action === "like") {
            const { liked, newCount } = await toggleLike(user.id, postId);

            // Notifikasi fire-and-forget — di luar transaction supaya tidak rollback
            if (liked && post.authorId !== user.id) {
                void notifyNewLike({
                    postAuthorId: post.authorId,
                    actorId: user.id,
                    postId,
                });
            }

            return NextResponse.json(
                { liked, likesCount: newCount },
                { status: 200 }
            );
        }

        if (action === "bookmark") {
            const { bookmarked } = await toggleBookmark(user.id, postId);
            return NextResponse.json({ bookmarked }, { status: 200 });
        }

    } catch (error) {
        console.error("[POST /api/interact]", error);
        return serverError();
    }
}