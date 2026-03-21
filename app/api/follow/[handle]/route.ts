import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// GET /api/follow/[handle]
// Return: { isFollowing, followerCount, followingCount }
// isFollowing = apakah user yang login sedang follow handle ini
export async function GET(
    req: Request,
    { params }: { params: Promise<{ handle: string }> }
) {
    try {
        const { handle } = await params;

        const target = await prisma.user.findUnique({
            where: { handle },
            select: {
                id: true,
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
                { message: "User tidak ditemukan." },
                { status: 404 }
            );
        }

        // Cek apakah user yang login follow target ini
        let isFollowing = false;
        const session = await getServerSession(authOptions);

        if (session?.user?.email) {
            const me = await prisma.user.findUnique({
                where: { email: session.user.email },
                select: { id: true },
            });

            if (me && me.id !== target.id) {
                const row = await prisma.follow.findUnique({
                    where: {
                        followerId_followingId: {
                            followerId: me.id,
                            followingId: target.id,
                        },
                    },
                });
                isFollowing = !!row;
            }
        }

        return NextResponse.json({
            targetId: target.id,
            isFollowing,
            followerCount: target._count.followers,
            followingCount: target._count.following,
        });

    } catch (error) {
        console.error("[GET /api/follow/[handle]]", error);
        return NextResponse.json(
            { message: "Gagal mengambil data follow." },
            { status: 500 }
        );
    }
}