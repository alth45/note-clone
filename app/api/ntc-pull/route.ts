import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        // const token = authHeader?.split(' ')[1];
        // if (!token) return NextResponse.json({ message: "Akses ditolak." }, { status: 401 });
        const { user, error } = await checkCliToken(req);
        if (error) return error;
        // const user = await prisma.user.findUnique({ where: { cliToken: token } });
        // if (!user) return NextResponse.json({ message: "Sesi tidak valid." }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode') || 'all';

        let posts = [];

        // LOGIKA 1: Tarik Spesifik Slug
        // LOGIKA 1: Tarik Spesifik Slug
        if (mode === 'single') {
            const slug = searchParams.get('slug');

            // --- FIX TYPESCRIPT: Pastikan slug tidak null ---
            if (!slug) {
                return NextResponse.json({ message: "Slug wajib diisi untuk menarik 1 file." }, { status: 400 });
            }

            posts = await prisma.post.findMany({
                where: {
                    authorId: user.id,
                    slug: slug // Sekarang TypeScript udah yakin 100% ini string
                }
            });
        }
        // LOGIKA 2: Tarik Range (rg 1-3)
        else if (mode === 'range') {
            const skip = parseInt(searchParams.get('skip') || '0');
            const take = parseInt(searchParams.get('take') || '10');
            posts = await prisma.post.findMany({
                where: { authorId: user.id },
                orderBy: { updatedAt: 'desc' }, // Ambil dari yang paling baru diupdate
                skip: skip,
                take: take
            });
        }
        // LOGIKA 3: Tarik Semua (ntc pull)
        else {
            posts = await prisma.post.findMany({
                where: { authorId: user.id },
                orderBy: { updatedAt: 'desc' }
            });
        }

        if (posts.length === 0) {
            return NextResponse.json({ message: "Tidak ada data yang ditemukan." }, { status: 404 });
        }

        return NextResponse.json({ message: "Berhasil menarik data.", posts }, { status: 200 });

    } catch (error) {
        console.error("NTC Pull Error:", error);
        return NextResponse.json({ message: "Gagal menarik data dari server." }, { status: 500 });
    }
}