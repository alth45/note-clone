import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

async function getOwnerUser(email: string) {
    return prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });
}

async function verifySeriesOwnership(seriesId: string, userId: string) {
    return prisma.series.findFirst({
        where: { id: seriesId, authorId: userId },
        select: { id: true },
    });
}

// POST /api/series/[id]/posts — tambah artikel ke series
// body: { postId: string }
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: seriesId } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await getOwnerUser(session.user.email);
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        const series = await verifySeriesOwnership(seriesId, user.id);
        if (!series) {
            return NextResponse.json({ message: "Series tidak ditemukan." }, { status: 404 });
        }

        const { postId } = await req.json();

        if (!postId || typeof postId !== "string") {
            return NextResponse.json({ message: "postId wajib diisi." }, { status: 400 });
        }

        // Pastikan artikel milik user yang sama
        const post = await prisma.post.findFirst({
            where: { id: postId, authorId: user.id },
            select: { id: true },
        });
        if (!post) {
            return NextResponse.json(
                { message: "Artikel tidak ditemukan atau bukan milik Anda." },
                { status: 404 }
            );
        }

        // Cek sudah ada di series ini belum
        const existing = await prisma.seriesPost.findUnique({
            where: { seriesId_postId: { seriesId, postId } },
        });
        if (existing) {
            return NextResponse.json(
                { message: "Artikel sudah ada di series ini." },
                { status: 400 }
            );
        }

        // Taruh di urutan paling akhir
        const lastPost = await prisma.seriesPost.findFirst({
            where: { seriesId },
            orderBy: { order: "desc" },
            select: { order: true },
        });
        const nextOrder = (lastPost?.order ?? 0) + 1;

        const seriesPost = await prisma.seriesPost.create({
            data: { seriesId, postId, order: nextOrder },
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
        });

        return NextResponse.json(seriesPost, { status: 201 });

    } catch (error) {
        console.error("[POST /api/series/[id]/posts]", error);
        return NextResponse.json({ message: "Gagal menambahkan artikel." }, { status: 500 });
    }
}

// DELETE /api/series/[id]/posts — hapus artikel dari series
// body: { postId: string }
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: seriesId } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await getOwnerUser(session.user.email);
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        const series = await verifySeriesOwnership(seriesId, user.id);
        if (!series) {
            return NextResponse.json({ message: "Series tidak ditemukan." }, { status: 404 });
        }

        const { postId } = await req.json();
        if (!postId) {
            return NextResponse.json({ message: "postId wajib diisi." }, { status: 400 });
        }

        await prisma.seriesPost.delete({
            where: { seriesId_postId: { seriesId, postId } },
        });

        // Re-normalize urutan setelah hapus supaya tidak ada gap
        const remaining = await prisma.seriesPost.findMany({
            where: { seriesId },
            orderBy: { order: "asc" },
            select: { id: true },
        });

        await prisma.$transaction(
            remaining.map((sp, index) =>
                prisma.seriesPost.update({
                    where: { id: sp.id },
                    data: { order: index + 1 },
                })
            )
        );

        return NextResponse.json({ message: "Artikel dihapus dari series." }, { status: 200 });

    } catch (error) {
        console.error("[DELETE /api/series/[id]/posts]", error);
        return NextResponse.json({ message: "Gagal menghapus artikel dari series." }, { status: 500 });
    }
}

// PATCH /api/series/[id]/posts — reorder artikel (dari drag & drop)
// body: { orderedPostIds: string[] } — array postId sesuai urutan baru
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: seriesId } = await params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Harus login." }, { status: 401 });
        }

        const user = await getOwnerUser(session.user.email);
        if (!user) {
            return NextResponse.json({ message: "User tidak ditemukan." }, { status: 404 });
        }

        const series = await verifySeriesOwnership(seriesId, user.id);
        if (!series) {
            return NextResponse.json({ message: "Series tidak ditemukan." }, { status: 404 });
        }

        const { orderedPostIds } = await req.json();

        if (!Array.isArray(orderedPostIds) || orderedPostIds.length === 0) {
            return NextResponse.json(
                { message: "orderedPostIds harus array tidak kosong." },
                { status: 400 }
            );
        }

        // Validasi semua postId yang dikirim memang ada di series ini
        const existing = await prisma.seriesPost.findMany({
            where: { seriesId },
            select: { postId: true },
        });
        const existingIds = new Set(existing.map((sp) => sp.postId));

        const allValid = orderedPostIds.every((id) => existingIds.has(id));
        if (!allValid || orderedPostIds.length !== existingIds.size) {
            return NextResponse.json(
                { message: "orderedPostIds tidak sesuai dengan artikel dalam series." },
                { status: 400 }
            );
        }

        // Update semua order dalam satu transaction
        await prisma.$transaction(
            orderedPostIds.map((postId, index) =>
                prisma.seriesPost.update({
                    where: { seriesId_postId: { seriesId, postId } },
                    data: { order: index + 1 },
                })
            )
        );

        return NextResponse.json({ message: "Urutan berhasil disimpan." }, { status: 200 });

    } catch (error) {
        console.error("[PATCH /api/series/[id]/posts]", error);
        return NextResponse.json({ message: "Gagal menyimpan urutan." }, { status: 500 });
    }
}