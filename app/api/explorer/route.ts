import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// --- GET: AMBIL SEMUA FOLDER & FILE MILIK USER ---
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });

        // Cari ID user berdasarkan email
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });

        // 1. Ambil semua Folder
        const folders = await prisma.folder.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'asc' }
        });

        // 2. Ambil semua File (Post)
        const posts = await prisma.post.findMany({
            where: { authorId: user.id },
            orderBy: { updatedAt: 'desc' }
        });

        // 3. Format datanya biar persis kayak FileItem[] di Sidebar lu
        const formattedFolders = folders.map(f => ({
            id: f.id,
            type: "folder",
            name: f.name,
            parentId: f.parentId,
            isOpen: false // Default ketutup
        }));

        const formattedPosts = posts.map(p => ({
            id: p.id,
            type: "file",
            name: p.title || "Tanpa Judul",
            parentId: p.folderId
        }));

        // Gabungin dan balikin ke Frontend!
        return NextResponse.json([...formattedFolders, ...formattedPosts], { status: 200 });

    } catch (error) {
        console.error("Error fetch explorer:", error);
        return NextResponse.json({ message: "Gagal mengambil data eksplorer" }, { status: 500 });
    }
}

// --- POST: BIKIN FOLDER BARU AJA (File baru tetep lewat /api/posts) ---
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });

        const { name, parentId } = await req.json();
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });

        const newFolder = await prisma.folder.create({
            data: {
                name: name || "Folder Baru",
                parentId: parentId || null,
                userId: user!.id
            }
        });

        // Balikin format yang dimengerti Sidebar lu
        return NextResponse.json({
            id: newFolder.id,
            type: "folder",
            name: newFolder.name,
            parentId: newFolder.parentId,
        }, { status: 201 });

    } catch (error) {
        return NextResponse.json({ message: "Gagal membuat folder" }, { status: 500 });
    }
}