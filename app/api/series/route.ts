import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 100);
}

// GET /api/series — ambil semua series milik user yang login
export async function GET(req: Request) {
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

        const series = await prisma.series.findMany({
            where: { authorId: user.id },
            orderBy: { updatedAt: "desc" },
            include: {
                posts: {
                    orderBy: { order: "asc" },
                    include: {
                        post: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                published: true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(series, { status: 200 });

    } catch (error) {
        console.error("[GET /api/series]", error);
        return NextResponse.json({ message: "Gagal mengambil series." }, { status: 500 });
    }
}

// POST /api/series — buat series baru
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
        const { title, description } = body;

        if (!title || typeof title !== "string" || !title.trim()) {
            return NextResponse.json({ message: "Judul series wajib diisi." }, { status: 400 });
        }

        if (title.trim().length > 150) {
            return NextResponse.json({ message: "Judul maksimal 150 karakter." }, { status: 400 });
        }

        if (description && description.length > 500) {
            return NextResponse.json({ message: "Deskripsi maksimal 500 karakter." }, { status: 400 });
        }

        // Generate slug unik — kalau sudah ada, tambah suffix timestamp
        let slug = generateSlug(title.trim());
        const existing = await prisma.series.findUnique({ where: { slug } });
        if (existing) {
            slug = `${slug}-${Date.now()}`;
        }

        const series = await prisma.series.create({
            data: {
                title: title.trim(),
                description: description?.trim() || null,
                slug,
                authorId: user.id,
            },
        });

        return NextResponse.json(series, { status: 201 });

    } catch (error) {
        console.error("[POST /api/series]", error);
        return NextResponse.json({ message: "Gagal membuat series." }, { status: 500 });
    }
}