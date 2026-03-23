import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { notifyNewLike } from "@/lib/createNotification";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
        }

        const { action, postId } = await req.json();

        if (!postId || typeof postId !== "string") {
            return NextResponse.json({ message: "postId tidak valid." }, { status: 400 });
        }

        // ── LOGIKA LIKE / UNLIKE ──────────────────────────────────────────────
        if (action === "like") {
            const existingLike = await prisma.like.findUnique({
                where: { userId_postId: { userId: user.id, postId } },
            });

            if (existingLike) {
                // Unlike — hapus like dan decrement counter dalam satu transaction
                // Kalau salah satu gagal, keduanya rollback — tidak ada state tidak sinkron
                await prisma.$transaction([
                    prisma.like.delete({ where: { id: existingLike.id } }),
                    prisma.post.update({
                        where: { id: postId },
                        data: { likesCount: { decrement: 1 } },
                    }),
                ]);

                return NextResponse.json({ message: "Unliked" }, { status: 200 });

            } else {
                // Like — create like dan increment counter dalam satu transaction
                await prisma.$transaction([
                    prisma.like.create({ data: { userId: user.id, postId } }),
                    prisma.post.update({
                        where: { id: postId },
                        data: { likesCount: { increment: 1 } },
                    }),
                ]);

                // Notifikasi fire-and-forget — di luar transaction supaya tidak
                // rollback transaction kalau notif gagal
                void prisma.post
                    .findUnique({ where: { id: postId }, select: { authorId: true } })
                    .then((likedPost) => {
                        if (likedPost) {
                            return notifyNewLike({
                                postAuthorId: likedPost.authorId,
                                actorId: user.id,
                                postId,
                            });
                        }
                    });

                return NextResponse.json({ message: "Liked" }, { status: 200 });
            }
        }

        // ── LOGIKA BOOKMARK / UNBOOKMARK ──────────────────────────────────────
        if (action === "bookmark") {
            const existingBookmark = await prisma.bookmark.findUnique({
                where: { userId_postId: { userId: user.id, postId } },
            });

            if (existingBookmark) {
                await prisma.bookmark.delete({ where: { id: existingBookmark.id } });
                return NextResponse.json({ message: "Unbookmarked" }, { status: 200 });
            } else {
                await prisma.bookmark.create({ data: { userId: user.id, postId } });
                return NextResponse.json({ message: "Bookmarked" }, { status: 200 });
            }
        }

        return NextResponse.json({ message: "Aksi tidak dikenali" }, { status: 400 });

    } catch (error) {
        console.error("Interact Error:", error);
        return NextResponse.json({ message: "Gagal memproses permintaan" }, { status: 500 });
    }
}