import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import ReadClient from "./ReadClient";

// ─── View counter (dari fix sebelumnya) ──────────────────────────────────────
const viewCache = new Map<string, number>();
const VIEW_COOLDOWN_MS = 60 * 60 * 1000;

async function incrementViewIfNew(slug: string, postId: string) {
    let ip = "unknown";
    try {
        const headerList = await headers();
        ip =
            headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
            headerList.get("x-real-ip") ??
            "unknown";
    } catch {
        return;
    }

    const cacheKey = `${ip}:${slug}`;
    const lastView = viewCache.get(cacheKey);
    const now = Date.now();
    if (lastView && now - lastView < VIEW_COOLDOWN_MS) return;

    viewCache.set(cacheKey, now);
    if (viewCache.size > 10_000) {
        for (const [key, ts] of viewCache.entries()) {
            if (now - ts > VIEW_COOLDOWN_MS) viewCache.delete(key);
        }
    }

    void prisma.post.update({
        where: { id: postId },
        data: { views: { increment: 1 } },
        select: { id: true },
    }).catch((err: Error) => {
        viewCache.delete(cacheKey);
        console.error("[ViewCounter] Failed:", err.message);
    });
}

// ─── Related articles fetcher ─────────────────────────────────────────────────
async function getRelatedPosts(post: {
    id: string;
    folderId: string | null;
    authorId: string;
    slug: string;
}) {
    const LIMIT = 4;

    // Strategi 1 — artikel lain dalam folder yang sama
    if (post.folderId) {
        const sameFolderPosts = await prisma.post.findMany({
            where: {
                published: true,
                folderId: post.folderId,
                id: { not: post.id },      // exclude diri sendiri
            },
            orderBy: { views: "desc" },
            take: LIMIT,
            include: { author: { select: { name: true } } },
        });

        if (sameFolderPosts.length >= 2) {
            return { posts: sameFolderPosts, reason: "folder" as const };
        }
    }

    // Strategi 2 — artikel lain dari author yang sama
    const sameAuthorPosts = await prisma.post.findMany({
        where: {
            published: true,
            authorId: post.authorId,
            id: { not: post.id },
        },
        orderBy: { views: "desc" },
        take: LIMIT,
        include: { author: { select: { name: true } } },
    });

    if (sameAuthorPosts.length > 0) {
        return { posts: sameAuthorPosts, reason: "author" as const };
    }

    // Strategi 3 — fallback: artikel terbaru secara global
    const recentPosts = await prisma.post.findMany({
        where: {
            published: true,
            id: { not: post.id },
        },
        orderBy: { updatedAt: "desc" },
        take: LIMIT,
        include: { author: { select: { name: true } } },
    });

    return { posts: recentPosts, reason: "recent" as const };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function PostDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const post = await prisma.post.findUnique({
        where: { slug },
        include: { author: true },
    });

    if (!post || !post.published) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h1 className="text-4xl font-bold text-sumi mb-4">404</h1>
                <p className="text-sumi-muted">
                    Artikel tidak ditemukan atau belum dipublikasikan.
                </p>
            </div>
        );
    }

    // Kedua ini jalan paralel — tidak ada yang nunggu satu sama lain
    const [related] = await Promise.all([
        getRelatedPosts({
            id: post.id,
            folderId: post.folderId,
            authorId: post.authorId,
            slug: post.slug,
        }),
        incrementViewIfNew(slug, post.id),
    ]);

    const postWithUpdatedViews = {
        ...post,
        views: (post.views ?? 0) + 1,
    };

    return (
        <ReadClient
            post={postWithUpdatedViews}
            relatedPosts={related.posts}
            relatedReason={related.reason}
        />
    );
}