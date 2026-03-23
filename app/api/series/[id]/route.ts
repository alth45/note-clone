import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

async function getOwnerUser(email: string) {
    return prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });
}

// GET /api/series/[id] — detail series + daftar artikel
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const series = await prisma.series.findUnique({
            where: { id },
            include: {
                author: {
                    select: { id: true, name: true, handle: true, image: true },
                },
                posts: {
                    orderBy: { order: "asc" },
                    include: {
                        post: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                published: true,
                                views: true,
                                createdAt: true,
                            },
                        },
                    },
                },
            },
        });

        if (!series) {
            return NextResponse.json({ message: "Series tidak ditemukan." }, { status: 404 });
        }

        // Kalau series belum published, hanya author yang boleh lihat
        if (!series.published) {
            const session = await getServerSession(authOptions);
            const me = session?.user?.email
                ? await getOwnerUser(session.user.email)
                : null;

            if (me?.id !== series.authorId) {
                return NextResponse.json({ message: "Series tidak ditemukan." }, { status: 404 });
            }
        }

        return NextResponse.json(series, { status: 200 });

    } catch (error) {
        console.error("[GET /api/series/[id]]", error);
        return NextResponse.json({ message: "Gagal mengambil series." }, { status: 500 });
    }
}

// PATCH /api/series/[id] — update title, description, published
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await getOwnerUser(session.user.email);
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        // Verifikasi kepemilikan
        const series = await prisma.series.findFirst({
            where: { id, authorId: user.id },
        });
        if (!series) {
            return NextResponse.json({ message: "Series tidak ditemukan." }, { status: 404 });
        }

        const body = await req.json();
        const { title, description, published } = body;

        const updateData: any = {};

        if (title !== undefined) {
            if (typeof title !== "string" || !title.trim()) {
                return NextResponse.json({ message: "Judul tidak boleh kosong." }, { status: 400 });
            }
            if (title.trim().length > 150) {
                return NextResponse.json({ message: "Judul maksimal 150 karakter." }, { status: 400 });
            }
            updateData.title = title.trim();
        }

        if (description !== undefined) {
            if (description && description.length > 500) {
                return NextResponse.json({ message: "Deskripsi maksimal 500 karakter." }, { status: 400 });
            }
            updateData.description = description?.trim() || null;
        }

        if (published !== undefined) {
            if (typeof published !== "boolean") {
                return NextResponse.json({ message: "Published harus boolean." }, { status: 400 });
            }
            updateData.published = published;
        }

        const updated = await prisma.series.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updated, { status: 200 });

    } catch (error) {
        console.error("[PATCH /api/series/[id]]", error);
        return NextResponse.json({ message: "Gagal memperbarui series." }, { status: 500 });
    }
}

// DELETE /api/series/[id] — hapus series (bukan artikelnya)
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await getOwnerUser(session.user.email);
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        // Verifikasi kepemilikan
        const series = await prisma.series.findFirst({
            where: { id, authorId: user.id },
        });
        if (!series) {
            return NextResponse.json({ message: "Series tidak ditemukan." }, { status: 404 });
        }

        // Hapus series — SeriesPost cascade terhapus otomatis
        // Artikel aslinya TIDAK ikut terhapus
        await prisma.series.delete({ where: { id } });

        return NextResponse.json({ message: "Series berhasil dihapus." }, { status: 200 });

    } catch (error) {
        console.error("[DELETE /api/series/[id]]", error);
        return NextResponse.json({ message: "Gagal menghapus series." }, { status: 500 });
    }
}