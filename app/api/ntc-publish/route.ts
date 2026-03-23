import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

export async function PATCH(req: Request) {
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
                { message: "Artikel tidak ditemukan atau Anda tidak memiliki akses." },
                { status: 404 }
            );
        }

        if (post.published) {
            return NextResponse.json(
                { message: "Artikel ini sudah berstatus LIVE dan mengudara." },
                { status: 400 }
            );
        }

        await prisma.post.update({
            where: { id: post.id },
            data: { published: true },
        });

        return NextResponse.json(
            { message: "Artikel berhasil dipublikasikan!", slug: post.slug },
            { status: 200 }
        );

    } catch (error) {
        console.error("NTC Publish Error:", error);
        return NextResponse.json(
            { message: "Gagal memproses data di server." },
            { status: 500 }
        );
    }
}