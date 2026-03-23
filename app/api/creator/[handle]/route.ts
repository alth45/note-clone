import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/api/auth/[...nextauth]/route";

// GET /api/creator/[handle]
// Return stats lengkap creator.
// Kalau creatorStatsPublic = false, hanya pemilik akun yang bisa akses.

export async function GET(
    req: Request,
    { params }: { params: Promise<{ handle: string }> }
) {
    try {
        const { handle } = await params;

        // Ambil data user target
        const target = await prisma.user.findUnique({
            where: { handle },
            select: {
                id: true,
                name: true,
                handle: true,
                bio: true,
                image: true,
                creatorStatsPublic: true,
                createdAt: true,
                _count: {
                    select: {
                        followers: true,
                        following: true,
                    },
                },
            },
        });

        if (!target) {
            return NextResponse.json(
                { message: "Creator tidak ditemukan." },
                { status: 404 }
            );
        }

        // Cek akses — kalau private, hanya pemilik yang boleh lihat
        const session = await getServerSession(authOptions);
        const isOwner = session?.user?.email
            ? await prisma.user
                .findUnique({
                    where: { email: session.user.email },
                    select: { id: true },
                })
                .then((me) => me?.id === target.id)
            : false;

        if (!target.creatorStatsPublic && !isOwner) {
            return NextResponse.json(
                { message: "Stats creator ini bersifat privat." },
                { status: 403 }
            );
        }

        // Ambil semua artikel published milik creator ini
        const posts = await prisma.post.findMany({
            where: { authorId: target.id, published: true },
            select: {
                id: true,
                title: true,
                slug: true,
                views: true,
                likesCount: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { comments: true } },
            },
            orderBy: { views: "desc" },
        });

        // ── Summary lifetime ──────────────────────────────────────────────────
        const totalViews = posts.reduce((s, p) => s + (p.views ?? 0), 0);
        const totalLikes = posts.reduce((s, p) => s + (p.likesCount ?? 0), 0);
        const totalComments = posts.reduce((s, p) => s + p._count.comments, 0);
        const totalPosts = posts.length;

        // ── Top 5 artikel by views ────────────────────────────────────────────
        const topPosts = posts.slice(0, 5).map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            views: p.views ?? 0,
            likes: p.likesCount ?? 0,
            comments: p._count.comments,
        }));

        // ── Grafik views per bulan (12 bulan terakhir) ────────────────────────
        // Distribusikan views per artikel ke bulan publish-nya secara proporsional
        // berdasarkan berapa bulan artikel sudah hidup
        const now = new Date();
        const monthlyViews = new Map<string, number>();

        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            monthlyViews.set(key, 0);
        }

        for (const post of posts) {
            if (!post.views) continue;

            const postCreated = new Date(post.createdAt);
            const monthsActive = Math.max(
                1,
                (now.getFullYear() - postCreated.getFullYear()) * 12 +
                (now.getMonth() - postCreated.getMonth()) + 1
            );

            // Distribusi sederhana: views dibagi rata ke bulan-bulan aktif
            // Bulan lebih baru dapat bobot lebih tinggi (1.08^i)
            const activeMonthKeys: string[] = [];
            for (const key of monthlyViews.keys()) {
                const [y, m] = key.split("-").map(Number);
                const keyDate = new Date(y, m - 1, 1);
                if (keyDate >= new Date(postCreated.getFullYear(), postCreated.getMonth(), 1)) {
                    activeMonthKeys.push(key);
                }
            }

            if (activeMonthKeys.length === 0) continue;

            const weights = activeMonthKeys.map((_, i) => Math.pow(1.08, i));
            const totalWeight = weights.reduce((s, w) => s + w, 0);

            activeMonthKeys.forEach((key, i) => {
                const share = Math.round((weights[i] / totalWeight) * post.views!);
                monthlyViews.set(key, (monthlyViews.get(key) ?? 0) + share);
            });
        }

        const viewsChart = [...monthlyViews.entries()].map(([key, views]) => {
            const [y, m] = key.split("-").map(Number);
            const label = new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
                month: "short",
                year: "2-digit",
            });
            return { month: key, label, views };
        });

        // ── Streak nulis ──────────────────────────────────────────────────────
        // Hitung hari berturut-turut ada artikel baru (berdasarkan createdAt)
        const allPosts = await prisma.post.findMany({
            where: { authorId: target.id },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
        });

        const activeDays = new Set(
            allPosts.map((p) =>
                new Date(p.createdAt).toISOString().slice(0, 10)
            )
        );

        let streak = 0;
        let cursor = new Date();
        cursor.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
            const key = cursor.toISOString().slice(0, 10);
            if (activeDays.has(key)) {
                streak++;
                cursor.setDate(cursor.getDate() - 1);
            } else if (i === 0) {
                // Hari ini belum nulis — coba dari kemarin
                cursor.setDate(cursor.getDate() - 1);
            } else {
                break;
            }
        }

        return NextResponse.json({
            creator: {
                name: target.name,
                handle: target.handle,
                bio: target.bio,
                image: target.image,
                createdAt: target.createdAt,
                followerCount: target._count.followers,
                followingCount: target._count.following,
            },
            stats: {
                totalViews,
                totalLikes,
                totalComments,
                totalPosts,
                streak,
            },
            topPosts,
            viewsChart,
            isOwner,
            isPublic: target.creatorStatsPublic,
        });

    } catch (error) {
        console.error("[GET /api/creator/[handle]]", error);
        return NextResponse.json(
            { message: "Gagal mengambil data creator." },
            { status: 500 }
        );
    }
}