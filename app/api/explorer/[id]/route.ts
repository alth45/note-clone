import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

// Helper: ambil user dari session, return null kalau tidak login
async function getSessionUser(email: string) {
    return prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });
}

// --- PATCH: GANTI NAMA FOLDER ATAU FILE ---
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });
        }

        const user = await getSessionUser(session.user.email);
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
        }

        const body = await req.json();
        const { type, name } = body;

        // Validasi name: tidak boleh kosong, max 200 karakter
        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json({ message: "Nama tidak boleh kosong" }, { status: 400 });
        }
        const safeName = name.trim().slice(0, 200);

        if (type === "folder") {
            // Verifikasi folder ini milik user yang login
            const folder = await prisma.folder.findFirst({
                where: { id, userId: user.id },
                select: { id: true },
            });

            if (!folder) {
                return NextResponse.json(
                    { message: "Folder tidak ditemukan atau bukan milik Anda" },
                    { status: 404 }
                );
            }

            await prisma.folder.update({
                where: { id },
                data: { name: safeName },
            });
        } else {
            // Verifikasi post ini milik user yang login
            const post = await prisma.post.findFirst({
                where: { id, authorId: user.id },
                select: { id: true },
            });

            if (!post) {
                return NextResponse.json(
                    { message: "File tidak ditemukan atau bukan milik Anda" },
                    { status: 404 }
                );
            }

            await prisma.post.update({
                where: { id },
                data: { title: safeName },
            });
        }

        return NextResponse.json({ message: "Nama berhasil diganti" }, { status: 200 });

    } catch (error) {
        console.error("[PATCH /api/explorer/[id]]", error);
        return NextResponse.json({ message: "Gagal mengganti nama" }, { status: 500 });
    }
}

// --- DELETE: HAPUS FOLDER ATAU FILE ---
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });
        }

        const user = await getSessionUser(session.user.email);
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");

        if (type === "folder") {
            // Verifikasi folder ini milik user yang login
            const folder = await prisma.folder.findFirst({
                where: { id, userId: user.id },
                select: { id: true },
            });

            if (!folder) {
                return NextResponse.json(
                    { message: "Folder tidak ditemukan atau bukan milik Anda" },
                    { status: 404 }
                );
            }

            // onDelete: Cascade di schema hapus semua posts di dalamnya otomatis
            await prisma.folder.delete({ where: { id } });

        } else {
            // Verifikasi post ini milik user yang login
            const post = await prisma.post.findFirst({
                where: { id, authorId: user.id },
                select: { id: true },
            });

            if (!post) {
                return NextResponse.json(
                    { message: "File tidak ditemukan atau bukan milik Anda" },
                    { status: 404 }
                );
            }

            await prisma.post.delete({ where: { id } });
        }

        return NextResponse.json({ message: "Berhasil dihapus" }, { status: 200 });

    } catch (error) {
        console.error("[DELETE /api/explorer/[id]]", error);
        return NextResponse.json({ message: "Gagal menghapus item" }, { status: 500 });
    }
}