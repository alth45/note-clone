import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

export async function DELETE(req: Request) {
    try {
        const { user, error } = await checkCliToken(req);
        if (error) return error;

        const { searchParams } = new URL(req.url);
        const slug = searchParams.get("slug");

        if (!slug) {
            return NextResponse.json(
                { message: "Slug artikel tidak diberikan." },
                { status: 400 }
            );
        }

        const post = await prisma.post.findFirst({
            where: { slug, authorId: user.id },
        });

        if (!post) {
            return NextResponse.json(
                { message: "Artikel tidak ditemukan atau Anda tidak memiliki akses menghapusnya." },
                { status: 404 }
            );
        }

        await prisma.post.delete({ where: { id: post.id } });

        return NextResponse.json(
            { message: "Artikel berhasil dihapus." },
            { status: 200 }
        );

    } catch (error) {
        console.error("NTC Delete Error:", error);
        return NextResponse.json(
            { message: "Gagal menghapus data di server." },
            { status: 500 }
        );
    }
}