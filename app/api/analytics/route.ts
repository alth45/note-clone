import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { subDays, format, eachDayOfInterval, startOfDay } from "date-fns";

// GET /api/analytics?period=30
// period: 7 | 30 | 90  (hari ke belakang)
//
// Karena NoteOS mungkin belum punya tabel PostView log,
// strategi: distribusikan views secara proporsional ke hari-hari
// sejak artikel publish sampai sekarang.
// Ini memberikan estimasi chart yang realistis tanpa perlu schema baru.

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const period = Math.min(
            parseInt(searchParams.get("period") ?? "30"),
            90
        );

        const now = new Date();
        const since = subDays(now, period - 1);

        // ── Fetch semua post milik user ────────────────────────────────────────
        const posts = await prisma.post.findMany({
            where: { authorId: user.id, published: true },
            select: {
                id: true,
                title: true,
                slug: true,
                views: true,
                likesCount: true,
                createdAt: true,
                updatedAt: true,
                tags: true,
                _count: { select: { comments: true } },
            },
            orderBy: { views: "desc" },
        });

        // ── Top 5 artikel by views ─────────────────────────────────────────────
        const topPosts = posts.slice(0, 5).map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            views: p.views ?? 0,
            likes: p.likesCount ?? 0,
            comments: p._count.comments,
            tags: p.tags,
            createdAt: p.createdAt,
        }));

        // ── Summary stats ──────────────────────────────────────────────────────
        const totalViews = posts.reduce((s, p) => s + (p.views ?? 0), 0);
        const totalLikes = posts.reduce((s, p) => s + (p.likesCount ?? 0), 0);
        const totalComments = posts.reduce((s, p) => s + p._count.comments, 0);
        const totalPosts = posts.length;

        // ── Views per hari (distribusi estimasi) ──────────────────────────────
        // Untuk setiap post, distribusikan views secara merata ke hari-hari
        // dalam window [max(createdAt, since), today].
        // Ini lebih baik dari chart flat atau kosong.

        const days = eachDayOfInterval({ start: since, end: now });
        const viewsByDay = new Map<string, number>();
        for (const day of days) {
            viewsByDay.set(format(day, "yyyy-MM-dd"), 0);
        }

        for (const post of posts) {
            const postViews = post.views ?? 0;
            if (postViews === 0) continue;

            // Window aktif untuk post ini dalam periode chart
            const postStart = startOfDay(
                post.createdAt > since ? post.createdAt : since
            );
            const postDays = eachDayOfInterval({ start: postStart, end: now });

            if (postDays.length === 0) continue;

            // Distribusi non-uniform: recent days lebih tinggi (growth curve)
            // Weight: hari ke-i mendapat weight proporsional ke posisinya
            const weights = postDays.map((_, i) =>
                Math.pow(1.08, i) // eksponensial ringan
            );
            const totalWeight = weights.reduce((s, w) => s + w, 0);

            postDays.forEach((day, i) => {
                const key = format(day, "yyyy-MM-dd");
                if (!viewsByDay.has(key)) return;
                const share = Math.round((weights[i] / totalWeight) * postViews);
                viewsByDay.set(key, (viewsByDay.get(key) ?? 0) + share);
            });
        }

        // Format untuk Chart.js
        const chartData = days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            return {
                date: key,
                label: format(day, "d MMM"),
                views: viewsByDay.get(key) ?? 0,
            };
        });

        // ── Period comparison: bandingkan dg periode sebelumnya ───────────────
        const prevSince = subDays(since, period);
        const prevPosts = await prisma.post.findMany({
            where: {
                authorId: user.id,
                published: true,
                createdAt: { lt: since },
            },
            select: { views: true, likesCount: true },
        });

        // Estimasi views periode lalu = views post yang ada sebelum window ini
        // (proxy kasar — cukup untuk delta %)
        const prevTotalViews = prevPosts.reduce((s, p) => s + (p.views ?? 0), 0);
        const viewsDelta = prevTotalViews === 0
            ? null
            : Math.round(((totalViews - prevTotalViews) / prevTotalViews) * 100);

        // ── Tags paling sering di post populer ────────────────────────────────
        const tagFreq = new Map<string, number>();
        for (const post of posts) {
            for (const tag of post.tags) {
                tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + (post.views ?? 1));
            }
        }
        const topTags = [...tagFreq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([tag, views]) => ({ tag, views }));

        return NextResponse.json({
            summary: {
                totalViews,
                totalLikes,
                totalComments,
                totalPosts,
                viewsDelta,   // % change vs periode sebelumnya, null kalau N/A
            },
            chartData,
            topPosts,
            topTags,
            period,
        });

    } catch (error) {
        console.error("[GET /api/analytics]", error);
        return NextResponse.json(
            { message: "Gagal mengambil analytics." },
            { status: 500 }
        );
    }
}