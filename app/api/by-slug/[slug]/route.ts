import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/series/by-slug/[slug]
// Dipakai oleh SeriesNav component di client side.
// Hanya return series yang sudah published.

export async function GET(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const series = await prisma.series.findUnique({
            where: { slug, published: true },
            select: {
                id: true,
                title: true,
                slug: true,
                posts: {
                    orderBy: { order: "asc" },
                    select: {
                        order: true,
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

        if (!series) {
            return NextResponse.json(
                { message: "Series tidak ditemukan." },
                { status: 404 }
            );
        }

        return NextResponse.json(series, { status: 200 });

    } catch (error) {
        console.error("[GET /api/series/by-slug/[slug]]", error);
        return NextResponse.json(
            { message: "Gagal mengambil series." },
            { status: 500 }
        );
    }
}