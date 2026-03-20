import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Akses ditolak." }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        const bookmarks = await prisma.bookmark.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            include: {
                post: {
                    include: { author: true },
                },
            },
        });

        // Filter out bookmarks whose post was deleted
        const validBookmarks = bookmarks.filter((b) => b.post !== null);

        const posts = validBookmarks.map((b) => ({
            ...b.post,
            bookmarkedAt: b.createdAt,
        }));

        return NextResponse.json(posts, { status: 200 });

    } catch (error) {
        console.error("Bookmarks GET error:", error);
        return NextResponse.json({ message: "Gagal mengambil data." }, { status: 500 });
    }
}