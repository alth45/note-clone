import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

// GET /api/notes — ambil semua notes yang aktif (belum expired)
export async function GET() {
    try {
        const notes = await prisma.note.findMany({
            where: {
                published: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                content: true,
                bgColor: true,
                emoji: true,
                expiresAt: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        handle: true,
                        image: true,
                    },
                },
            },
        });

        return NextResponse.json(notes, { status: 200 });
    } catch (error) {
        console.error("[GET /api/notes]", error);
        return NextResponse.json({ message: "Gagal mengambil notes." }, { status: 500 });
    }
}

// POST /api/notes — buat note baru
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        const body = await req.json();
        const { content, bgColor, emoji } = body;

        if (!content || typeof content !== "string" || !content.trim()) {
            return NextResponse.json({ message: "Konten tidak boleh kosong." }, { status: 400 });
        }

        if (content.trim().length > 280) {
            return NextResponse.json({ message: "Maksimal 280 karakter." }, { status: 400 });
        }

        // Note kedaluwarsa dalam 24 jam
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const note = await prisma.note.create({
            data: {
                content: content.trim(),
                bgColor: bgColor || "#1C1C1E",
                emoji: emoji || null,
                expiresAt,
                published: true,
                authorId: user.id,
            },
            select: {
                id: true,
                content: true,
                bgColor: true,
                emoji: true,
                expiresAt: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        handle: true,
                        image: true,
                    },
                },
            },
        });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        console.error("[POST /api/notes]", error);
        return NextResponse.json({ message: "Gagal membuat note." }, { status: 500 });
    }
}

// DELETE /api/notes?id=xxx — hapus note milik sendiri
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { id: true },
        });
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ message: "ID note wajib diisi." }, { status: 400 });
        }

        const note = await prisma.note.findFirst({
            where: { id, authorId: user.id },
        });

        if (!note) {
            return NextResponse.json({ message: "Note tidak ditemukan." }, { status: 404 });
        }

        await prisma.note.delete({ where: { id } });

        return NextResponse.json({ message: "Note dihapus." }, { status: 200 });
    } catch (error) {
        console.error("[DELETE /api/notes]", error);
        return NextResponse.json({ message: "Gagal menghapus note." }, { status: 500 });
    }
}