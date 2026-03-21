import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/search?q=keyword&limit=10&cursor=<id>
//
// Mencari artikel published dari SEMUA user.
// Tidak butuh autentikasi — ini endpoint publik.
// Mendukung pagination berbasis cursor untuk load more.

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim() ?? "";
        const cursor = searchParams.get("cursor") ?? undefined;
        const limit = Math.min(
            parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT)),
            MAX_LIMIT
        );

        if (!q || q.length < 2) {
            return NextResponse.json(
                { results: [], hasMore: false, total: 0 },
                { status: 200 }
            );
        }

        // PostgreSQL ILIKE untuk case-insensitive search di title
        // Untuk full-text search konten, cukup cek contains di rawContent
        // (tidak perlu tsquery/tsvector untuk scope ini)
        const where = {
            published: true,
            OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { rawContent: { contains: q, mode: "insensitive" as const } },
                { tags: { has: q.toLowerCase() } },
            ],
        };

        // Hitung total untuk info "X hasil"
        const total = await prisma.post.count({ where });

        // Fetch hasil dengan cursor pagination
        const posts = await prisma.post.findMany({
            where,
            take: limit + 1,  // ambil satu lebih untuk cek hasMore
            ...(cursor && { skip: 1, cursor: { id: cursor } }),
            orderBy: [
                // Title match naik duluan — simulasi relevance tanpa full-text engine
                { views: "desc" },
                { updatedAt: "desc" },
            ],
            select: {
                id: true,
                title: true,
                slug: true,
                tags: true,
                views: true,
                updatedAt: true,
                rawContent: true,
                author: {
                    select: {
                        name: true,
                        handle: true,
                        image: true,
                    },
                },
            },
        });

        const hasMore = posts.length > limit;
        const items = hasMore ? posts.slice(0, limit) : posts;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        // Buat snippet dari rawContent sekitar keyword
        const results = items.map((post) => {
            const snippet = extractSnippet(post.rawContent ?? "", q, 120);
            // Jangan kirim rawContent penuh ke client — boros bandwidth
            const { rawContent: _, ...rest } = post;
            return { ...rest, snippet };
        });

        // Sort ulang: title match diprioritaskan di atas
        results.sort((a, b) => {
            const aTitle = a.title.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
            const bTitle = b.title.toLowerCase().includes(q.toLowerCase()) ? 1 : 0;
            return bTitle - aTitle;
        });

        return NextResponse.json(
            { results, hasMore, total, nextCursor },
            { status: 200 }
        );

    } catch (error) {
        console.error("[/api/search] error:", error);
        return NextResponse.json(
            { message: "Search gagal." },
            { status: 500 }
        );
    }
}

// ─── Helper: ambil potongan teks sekitar keyword ──────────────────────────────

function extractSnippet(text: string, keyword: string, maxLen = 120): string {
    if (!text) return "";

    // Strip markup NTC sederhana
    const clean = text
        .replace(/```[\s\S]*?```/g, "")   // hapus code blocks
        .replace(/#{1,3} /g, "")           // hapus heading markers
        .replace(/\*\*(.*?)\*\*/g, "$1")   // un-bold
        .replace(/\*(.*?)\*/g, "$1")       // un-italic
        .replace(/`([^`]+)`/g, "$1")       // un-code inline
        .replace(/:::[\s\S]*?:::/g, "")    // hapus NTC blocks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // un-link
        .replace(/\n+/g, " ")
        .trim();

    const lower = clean.toLowerCase();
    const kwLow = keyword.toLowerCase();
    const idx = lower.indexOf(kwLow);

    if (idx === -1) {
        // Keyword tidak ada di konten — return awal teks
        return clean.slice(0, maxLen) + (clean.length > maxLen ? "…" : "");
    }

    const start = Math.max(0, idx - 40);
    const end = Math.min(clean.length, idx + maxLen);
    const snippet = clean.slice(start, end).trim();

    return (start > 0 ? "…" : "") + snippet + (end < clean.length ? "…" : "");
}