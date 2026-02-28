import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// --- PATCH: GANTI NAMA FOLDER ATAU FILE ---
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });

        const body = await req.json();
        const { type, name } = body; // Kasih tau backend ini "folder" atau "file"

        if (type === "folder") {
            await prisma.folder.update({ where: { id }, data: { name } });
        } else {
            await prisma.post.update({ where: { id }, data: { title: name } });
        }

        return NextResponse.json({ message: "Nama berhasil diganti" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Gagal mengganti nama" }, { status: 500 });
    }
}

// --- DELETE: HAPUS FOLDER ATAU FILE ---
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });

        // Tangkap tipe dari URL query (contoh: /api/explorer/123?type=folder)
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");

        // Berkat onDelete: Cascade di Prisma, hapus folder bakal otomatis ngehapus isi di dalamnya!
        if (type === "folder") {
            await prisma.folder.delete({ where: { id } });
        } else {
            await prisma.post.delete({ where: { id } });
        }

        return NextResponse.json({ message: "Berhasil dihapus" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Gagal menghapus item" }, { status: 500 });
    }
}