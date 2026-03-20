import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/tags
// Return semua tag unik dari artikel yang sudah published,
// diurutkan dari yang paling banyak dipakai.
export async function GET() {
    try {
        const posts = await prisma.post.findMany({
            where: { published: true },
            select: { tags: true },
        });

        // Flatten, hitung frekuensi, sort
        const freq = new Map<string, number>();
        for (const post of posts) {
            for (const tag of post.tags) {
                const t = tag.trim();
                if (t) freq.set(t, (freq.get(t) ?? 0) + 1);
            }
        }

        const sorted = [...freq.entries()]
            .sort((a, b) => b[1] - a[1])   // most used first
            .map(([tag, count]) => ({ tag, count }));

        return NextResponse.json(sorted, { status: 200 });

    } catch (error) {
        console.error("Tags GET error:", error);
        return NextResponse.json(
            { message: "Gagal mengambil tags." },
            { status: 500 }
        );
    }
}