import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// POST /api/follow
// body: { followingId: string }
// Toggle — kalau sudah follow, unfollow. Kalau belum, follow.
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Harus login." },
                { status: 401 }
            );
        }

        const follower = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!follower) {
            return NextResponse.json(
                { message: "User tidak ditemukan." },
                { status: 404 }
            );
        }

        const { followingId } = await req.json();

        if (!followingId) {
            return NextResponse.json(
                { message: "followingId wajib diisi." },
                { status: 400 }
            );
        }

        // Tidak bisa follow diri sendiri
        if (follower.id === followingId) {
            return NextResponse.json(
                { message: "Tidak bisa follow diri sendiri." },
                { status: 400 }
            );
        }

        // Pastikan target user exists
        const target = await prisma.user.findUnique({
            where: { id: followingId },
            select: { id: true },
        });
        if (!target) {
            return NextResponse.json(
                { message: "User yang mau di-follow tidak ditemukan." },
                { status: 404 }
            );
        }

        // Cek apakah sudah follow
        const existing = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: follower.id,
                    followingId,
                },
            },
        });

        if (existing) {
            // Unfollow
            await prisma.follow.delete({ where: { id: existing.id } });

            // Hitung followers terbaru setelah unfollow
            const followerCount = await prisma.follow.count({
                where: { followingId },
            });

            return NextResponse.json(
                { following: false, followerCount },
                { status: 200 }
            );
        } else {
            // Follow
            await prisma.follow.create({
                data: { followerId: follower.id, followingId },
            });

            const followerCount = await prisma.follow.count({
                where: { followingId },
            });

            return NextResponse.json(
                { following: true, followerCount },
                { status: 200 }
            );
        }

    } catch (error) {
        console.error("[POST /api/follow]", error);
        return NextResponse.json(
            { message: "Gagal memproses follow." },
            { status: 500 }
        );
    }
}