import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        // 1. Cek Token CLI
        const authHeader = req.headers.get('authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return NextResponse.json({ message: "Akses ditolak. Token tidak ditemukan." }, { status: 401 });
        }

        // 2. Cari user berdasarkan token
        const user = await prisma.user.findUnique({
            where: { cliToken: token }
        });

        if (!user) {
            return NextResponse.json({ message: "Sesi tidak valid! Silakan login ulang." }, { status: 401 });
        }

        // 3. Ambil semua artikel milik user ini, urutkan dari yang terbaru
        // const posts = await prisma.post.findMany({
        //     where: { authorId: user.id },
        //     orderBy: { updatedAt: 'desc' },
        //     select: {
        //         id: true,
        //         title: true,
        //         slug: true,
        //         published: true,
        //         updatedAt: true
        //     }
        // });
        // 3. Ambil semua artikel beserta nama foldernya
        const posts = await prisma.post.findMany({
            where: { authorId: user.id },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                title: true,
                slug: true,
                published: true,
                updatedAt: true,
                // --- TAMBAHAN BARU: Ambil relasi folder ---
                folder: {
                    select: { name: true }
                }
            }
        });

        return NextResponse.json({ posts }, { status: 200 });

    } catch (error) {
        console.error("NTC List Error:", error);
        return NextResponse.json({ message: "Gagal mengambil data dari server." }, { status: 500 });
    }
}