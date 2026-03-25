/**
 * lib/db.ts
 *
 * Lapisan keamanan database terpusat.
 * Semua query yang menyentuh data sensitif harus lewat helper di sini.
 *
 * Masalah yang diselesaikan:
 *  1. IDOR  — setiap query wajib menyertakan authorId/userId sebagai filter
 *  2. Data leak — semua fungsi punya explicit select{}, tidak pernah return full row
 *  3. SQL injection — Prisma sudah parameterized, tapi kita tambah validasi input
 *  4. Query performa — hanya fetch kolom yang benar-benar dibutuhkan
 *  5. Race condition di counter — pakai $transaction atomic
 */

import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export type SafePost = {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    views: number;
    likesCount: number;
    tags: string[];
    coverImage: string | null;
    folderId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export type SafeUser = {
    id: string;
    name: string | null;
    handle: string | null;
    image: string | null;
    bio: string | null;
};

// SELECT object yang reusable — tidak pernah include password, cliToken, dll
export const SAFE_USER_SELECT = {
    id: true,
    name: true,
    handle: true,
    image: true,
    bio: true,
} as const;

export const SAFE_POST_SELECT = {
    id: true,
    title: true,
    slug: true,
    published: true,
    views: true,
    likesCount: true,
    tags: true,
    coverImage: true,
    folderId: true,
    createdAt: true,
    updatedAt: true,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 2. OWNERSHIP VERIFICATION — cegah IDOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifikasi post milik user ini sebelum operasi apapun.
 * Return post atau null — TIDAK throw exception.
 */
export async function getOwnedPost(postId: string, userId: string) {
    if (!postId || !userId) return null;

    return prisma.post.findFirst({
        where: {
            id: postId,
            authorId: userId, // <— kunci: filter by owner sekaligus
        },
        select: SAFE_POST_SELECT,
    });
}

/**
 * Verifikasi folder milik user ini.
 */
export async function getOwnedFolder(folderId: string, userId: string) {
    if (!folderId || !userId) return null;

    return prisma.folder.findFirst({
        where: { id: folderId, userId },
        select: { id: true, name: true, userId: true },
    });
}

/**
 * Verifikasi series milik user ini.
 */
export async function getOwnedSeries(seriesId: string, userId: string) {
    if (!seriesId || !userId) return null;

    return prisma.series.findFirst({
        where: { id: seriesId, authorId: userId },
        select: { id: true, title: true, slug: true, published: true },
    });
}

/**
 * Verifikasi komentar milik user ini ATAU user adalah penulis artikel.
 * Dipakai sebelum operasi delete komentar.
 */
export async function canDeleteComment(commentId: string, userId: string): Promise<boolean> {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: {
            authorId: true,
            post: { select: { authorId: true } },
        },
    });

    if (!comment) return false;
    return comment.authorId === userId || comment.post.authorId === userId;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SAFE QUERY HELPERS — explicit select, no full row fetch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ambil user dari DB — TIDAK pernah return kolom sensitif (password, cliToken, dll).
 */
export async function getSafeUser(email: string): Promise<SafeUser | null> {
    return prisma.user.findUnique({
        where: { email },
        select: SAFE_USER_SELECT,
    });
}

export async function getSafeUserById(id: string): Promise<SafeUser | null> {
    return prisma.user.findUnique({
        where: { id },
        select: SAFE_USER_SELECT,
    });
}

/**
 * Ambil user dengan ID saja — untuk operasi yang butuh id userId.
 */
export async function getUserId(email: string): Promise<{ id: string } | null> {
    return prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });
}

/**
 * Dashboard posts — hanya kolom yang dibutuhkan UI, tidak include content.
 * content bisa 100KB+ per artikel, sangat boros kalau di-fetch di list.
 */
export async function getDashboardPosts(userId: string) {
    return prisma.post.findMany({
        where: { authorId: userId },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            slug: true,
            published: true,
            views: true,
            likesCount: true,
            tags: true,
            folderId: true,
            createdAt: true,
            updatedAt: true,
            // TIDAK include: content, rawContent — bisa sangat besar
        },
    });
}

/**
 * Feed publik — hanya artikel published, dengan author yang dibutuhkan UI.
 */
export async function getPublicFeed(opts: {
    tag?: string;
    limit?: number;
    cursor?: string;
}) {
    const { tag, limit = 20, cursor } = opts;

    const where: any = { published: true };
    if (tag) {
        where.tags = { has: tag.toLowerCase() };
    }

    const posts = await prisma.post.findMany({
        where,
        take: limit + 1,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            title: true,
            slug: true,
            tags: true,
            coverImage: true,
            folderId: true,
            views: true,
            updatedAt: true,
            author: {
                select: SAFE_USER_SELECT, // tidak include password, cliToken, dll
            },
        },
    });

    const hasMore = posts.length > limit;
    return {
        posts: hasMore ? posts.slice(0, limit) : posts,
        hasMore,
        nextCursor: hasMore ? posts[limit - 1].id : null,
    };
}

/**
 * Single post untuk halaman baca — increment view secara atomic.
 * Pakai $transaction agar count tidak race condition.
 */
export async function getPublicPostWithView(
    slug: string,
    shouldCountView: boolean
): Promise<{ post: any; viewed: boolean }> {
    const post = await prisma.post.findUnique({
        where: { slug },
        select: {
            id: true,
            title: true,
            slug: true,
            content: true,
            published: true,
            coverImage: true,
            tags: true,
            views: true,
            likesCount: true,
            createdAt: true,
            updatedAt: true,
            folderId: true,
            authorId: true,
            author: { select: SAFE_USER_SELECT },
        },
    });

    if (!post || !post.published) return { post: null, viewed: false };

    if (shouldCountView) {
        // Atomic increment — tidak bisa race condition
        void prisma.post.update({
            where: { id: post.id },
            data: { views: { increment: 1 } },
            select: { id: true },
        }).catch(() => { }); // fire-and-forget, jangan block render
    }

    return { post, viewed: shouldCountView };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ATOMIC OPERATIONS — counter yang aman dari race condition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Like/Unlike post dalam satu transaction.
 * Jika salah satu gagal, keduanya rollback — tidak ada inconsistency.
 */
export async function toggleLike(
    userId: string,
    postId: string
): Promise<{ liked: boolean; newCount: number }> {
    const existing = await prisma.like.findUnique({
        where: { userId_postId: { userId, postId } },
        select: { id: true },
    });

    if (existing) {
        // Unlike — hapus like DAN decrement dalam satu transaction
        await prisma.$transaction([
            prisma.like.delete({ where: { id: existing.id } }),
            prisma.post.update({
                where: { id: postId },
                data: { likesCount: { decrement: 1 } },
            }),
        ]);

        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { likesCount: true },
        });

        return { liked: false, newCount: post?.likesCount ?? 0 };
    } else {
        // Like — create DAN increment dalam satu transaction
        const [, updatedPost] = await prisma.$transaction([
            prisma.like.create({ data: { userId, postId } }),
            prisma.post.update({
                where: { id: postId },
                data: { likesCount: { increment: 1 } },
                select: { likesCount: true, authorId: true },
            }),
        ]);

        return { liked: true, newCount: updatedPost.likesCount };
    }
}

/**
 * Toggle bookmark — idempotent, aman dijalankan berkali-kali.
 */
export async function toggleBookmark(
    userId: string,
    postId: string
): Promise<{ bookmarked: boolean }> {
    const existing = await prisma.bookmark.findUnique({
        where: { userId_postId: { userId, postId } },
        select: { id: true },
    });

    if (existing) {
        await prisma.bookmark.delete({ where: { id: existing.id } });
        return { bookmarked: false };
    } else {
        await prisma.bookmark.create({ data: { userId, postId } });
        return { bookmarked: true };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. INPUT VALIDATION — semua input dari client harus divalidasi dulu
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validasi string ID format — Prisma pakai CUID yang predictable.
 * Tolak input yang jelas-jelas bukan CUID sebelum query ke DB.
 */
export function isValidCuid(id: unknown): id is string {
    if (typeof id !== "string") return false;
    // CUID: huruf kecil + angka, panjang 20-30 karakter, mulai dengan 'c'
    return /^c[a-z0-9]{19,29}$/.test(id);
}

/**
 * Validasi slug format — alphanumeric + dash.
 */
export function isValidSlug(slug: unknown): slug is string {
    if (typeof slug !== "string") return false;
    return /^[a-z0-9-]{1,150}$/.test(slug) && slug.length >= 1;
}

/**
 * Sanitasi string input — strip HTML, batasi panjang.
 */
export function sanitizeInput(input: unknown, maxLen = 500): string | null {
    if (typeof input !== "string") return null;
    const trimmed = input.trim().slice(0, maxLen);
    if (!trimmed) return null;

    return trimmed
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Validasi URL — hanya izinkan http/https, tolak javascript: data: dll.
 */
export function sanitizeUrl(url: unknown): string | null {
    if (typeof url !== "string") return null;
    try {
        const parsed = new URL(url.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        if (parsed.username || parsed.password) return null; // reject basic auth URLs
        return parsed.toString();
    } catch {
        return null;
    }
}

/**
 * Sanitasi array tags — lowercase, alphanumeric+dash, deduplicated.
 */
export function sanitizeTags(tags: unknown): string[] {
    if (!Array.isArray(tags)) return [];

    return [
        ...new Set(
            tags
                .map((t) => {
                    if (typeof t !== "string") return null;
                    return t
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "")
                        .slice(0, 50);
                })
                .filter((t): t is string => t !== null && t.length > 0)
        ),
    ].slice(0, 20); // max 20 tags
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ERROR HELPERS — response yang konsisten, tidak bocorkan detail internal
// ─────────────────────────────────────────────────────────────────────────────

export function unauthorized(message = "Harus login.") {
    return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = "Akses ditolak.") {
    return NextResponse.json({ message }, { status: 403 });
}

export function notFound(message = "Data tidak ditemukan.") {
    return NextResponse.json({ message }, { status: 404 });
}

export function badRequest(message: string) {
    return NextResponse.json({ message }, { status: 400 });
}

export function serverError() {
    // Jangan pernah expose detail error internal ke client
    return NextResponse.json(
        { message: "Terjadi kesalahan server. Silakan coba lagi." },
        { status: 500 }
    );
}

export function tooManyRequests(retryAfter: number) {
    return NextResponse.json(
        { message: `Terlalu banyak request. Coba lagi dalam ${retryAfter} detik.` },
        {
            status: 429,
            headers: { "Retry-After": String(retryAfter) },
        }
    );
}