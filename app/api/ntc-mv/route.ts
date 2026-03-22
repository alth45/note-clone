import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        // const token = authHeader?.split(' ')[1];
        // if (!token) return NextResponse.json({ message: "Akses ditolak." }, { status: 401 });
        const { user, error } = await checkCliToken(req);
        if (error) return error;
        // const user = await prisma.user.findUnique({ where: { cliToken: token } });
        if (!user) return NextResponse.json({ message: "Sesi tidak valid." }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');
        const targetFolder = searchParams.get('folder'); // Bisa nama folder atau "root"

        if (!slug || !targetFolder) {
            return NextResponse.json({ message: "Slug dan nama folder tujuan wajib diisi." }, { status: 400 });
        }

        // 1. Cari artikelnya
        const post = await prisma.post.findFirst({ where: { slug: slug, authorId: user.id } });
        if (!post) return NextResponse.json({ message: "Artikel tidak ditemukan." }, { status: 404 });

        // 2. Tentukan ID Folder Target
        let newFolderId = null; // Default null kalau targetnya adalah 'root'

        if (targetFolder.toLowerCase() !== 'root') {
            const folder = await prisma.folder.findFirst({
                where: { name: targetFolder, userId: user.id }
            });

            if (!folder) {
                return NextResponse.json({ message: `Folder '${targetFolder}' tidak ditemukan. Buat dulu pakai 'ntc mkdir'.` }, { status: 404 });
            }
            newFolderId = folder.id;
        }

        // 3. Pindahkan file (Update relasi)
        await prisma.post.update({
            where: { id: post.id },
            data: { folderId: newFolderId }
        });

        const targetName = targetFolder.toLowerCase() === 'root' ? 'Root (Luar Folder)' : targetFolder;
        return NextResponse.json({ message: `Berhasil dipindahkan ke [${targetName}]` }, { status: 200 });

    } catch (error) {
        console.error("MV Error:", error);
        return NextResponse.json({ message: "Gagal memindahkan file di server." }, { status: 500 });
    }
}