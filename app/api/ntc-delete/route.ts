import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

export async function DELETE(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        // const token = authHeader?.split(' ')[1];
        const { user, error } = await checkCliToken(req)

        // if (!token) {
        //     return NextResponse.json({ message: "Akses ditolak. Token tidak ditemukan." }, { status: 401 });
        // }
        if (error) return error;
        // const user = await prisma.user.findUnique({
        //     where: { cliToken: token }
        // });

        if (!user) {
            return NextResponse.json({ message: "Sesi tidak valid! Silakan login ulang." }, { status: 401 });
        }

        // Ambil parameter slug dari URL (contoh: /api/ntc-delete?slug=catatan-asep)
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ message: "Slug artikel tidak diberikan." }, { status: 400 });
        }

        // Cek apakah artikelnya ada DAN milik user yang nge-request
        const post = await prisma.post.findFirst({
            where: { slug: slug, authorId: user.id }
        });

        if (!post) {
            return NextResponse.json({ message: "Artikel tidak ditemukan atau Anda tidak memiliki akses menghapusnya." }, { status: 404 });
        }

        // Musnahkan dari database!
        await prisma.post.delete({
            where: { id: post.id }
        });

        return NextResponse.json({ message: "Artikel berhasil dihapus." }, { status: 200 });

    } catch (error) {
        console.error("NTC Delete Error:", error);
        return NextResponse.json({ message: "Gagal menghapus data di server." }, { status: 500 });
    }
}