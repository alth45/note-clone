import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// GET /api/feed/following?cursor=<id>
// Return artikel published dari semua user yang di-follow,
// diurutkan terbaru. Cursor-based pagination.

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Harus login." },
                { status: 401 }
            );
        }

        const me = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!me) {
            return NextResponse.json(
                { message: "User tidak ditemukan." },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get("cursor") ?? undefined;
        const LIMIT = 12;

        // Ambil ID semua user yang di-follow
        const following = await prisma.follow.findMany({
            where: { followerId: me.id },
            select: { followingId: true },
        });

        const followingIds = following.map((f) => f.followingId);

        if (followingIds.length === 0) {
            return NextResponse.json(
                { posts: [], hasMore: false, followingCount: 0 },
                { status: 200 }
            );
        }

        const posts = await prisma.post.findMany({
            where: {
                published: true,
                authorId: { in: followingIds },
            },
            take: LIMIT + 1,
            ...(cursor && { skip: 1, cursor: { id: cursor } }),
            orderBy: { updatedAt: "desc" },
            include: { author: true },
        });

        const hasMore = posts.length > LIMIT;
        const items = hasMore ? posts.slice(0, LIMIT) : posts;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        return NextResponse.json({
            posts: items,
            hasMore,
            nextCursor,
            followingCount: followingIds.length,
        });

    } catch (error) {
        console.error("[GET /api/feed/following]", error);
        return NextResponse.json(
            { message: "Gagal mengambil feed." },
            { status: 500 }
        );
    }
}