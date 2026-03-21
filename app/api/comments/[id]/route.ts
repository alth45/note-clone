import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// DELETE /api/comments/[id]
// Hanya author komentar atau author artikel yang boleh hapus
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Harus login." },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json(
                { message: "User tidak ditemukan." },
                { status: 404 }
            );
        }

        const comment = await prisma.comment.findUnique({
            where: { id },
            select: {
                id: true,
                authorId: true,
                post: { select: { authorId: true } },
            },
        });

        if (!comment) {
            return NextResponse.json(
                { message: "Komentar tidak ditemukan." },
                { status: 404 }
            );
        }

        const isCommentAuthor = comment.authorId === user.id;
        const isPostAuthor = comment.post.authorId === user.id;

        if (!isCommentAuthor && !isPostAuthor) {
            return NextResponse.json(
                { message: "Tidak punya izin menghapus komentar ini." },
                { status: 403 }
            );
        }

        // onDelete: Cascade di schema akan hapus replies juga
        await prisma.comment.delete({ where: { id } });

        return NextResponse.json(
            { message: "Komentar dihapus." },
            { status: 200 }
        );

    } catch (error) {
        console.error("[DELETE /api/comments/[id]]", error);
        return NextResponse.json(
            { message: "Gagal menghapus komentar." },
            { status: 500 }
        );
    }
}