import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

export async function PATCH(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        // const token = authHeader?.split(' ')[1];
        const { user, error } = await checkCliToken(req);
        if (error) return error;

        // if (!token) {
        //     return NextResponse.json({ message: "Akses ditolak. Token tidak ditemukan." }, { status: 401 });
        // }

        // const user = await prisma.user.findUnique({
        //     where: { cliToken: token }
        // });

        if (!user) {
            return NextResponse.json({ message: "Sesi tidak valid! Silakan login ulang." }, { status: 401 });
        }

        // Ambil parameter slug dari URL
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ message: "Slug artikel tidak diberikan." }, { status: 400 });
        }

        // Cari artikelnya
        const post = await prisma.post.findFirst({
            where: { slug: slug, authorId: user.id }
        });

        if (!post) {
            return NextResponse.json({ message: "Artikel tidak ditemukan atau Anda tidak memiliki akses." }, { status: 404 });
        }

        if (post.published) {
            return NextResponse.json({ message: "Artikel ini sudah berstatus LIVE dan mengudara." }, { status: 400 });
        }

        // Ubah status jadi TRUE (Publik!)
        await prisma.post.update({
            where: { id: post.id },
            data: { published: true }
        });

        return NextResponse.json({ message: "Artikel berhasil dipublikasikan!", slug: post.slug }, { status: 200 });

    } catch (error) {
        console.error("NTC Publish Error:", error);
        return NextResponse.json({ message: "Gagal memproses data di server." }, { status: 500 });
    }
}