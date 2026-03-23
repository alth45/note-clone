import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

const MAX_TAKE = 50;

export async function GET(req: Request) {
    try {
        const { user, error } = await checkCliToken(req);
        if (error) return error;

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode") || "all";

        let posts: any[] = [];

        if (mode === "single") {
            const slug = searchParams.get("slug");
            if (!slug) {
                return NextResponse.json(
                    { message: "Slug wajib diisi untuk menarik 1 file." },
                    { status: 400 }
                );
            }

            posts = await prisma.post.findMany({
                where: { authorId: user.id, slug },
            });

        } else if (mode === "range") {
            // Validasi skip dan take — cegah nilai negatif atau terlalu besar
            const rawSkip = parseInt(searchParams.get("skip") || "0");
            const rawTake = parseInt(searchParams.get("take") || "10");

            const skip = Math.max(0, isNaN(rawSkip) ? 0 : rawSkip);
            const take = Math.min(MAX_TAKE, Math.max(1, isNaN(rawTake) ? 10 : rawTake));

            posts = await prisma.post.findMany({
                where: { authorId: user.id },
                orderBy: { updatedAt: "desc" },
                skip,
                take,
            });

        } else {
            // mode = all
            posts = await prisma.post.findMany({
                where: { authorId: user.id },
                orderBy: { updatedAt: "desc" },
            });
        }

        if (posts.length === 0) {
            return NextResponse.json(
                { message: "Tidak ada data yang ditemukan." },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Berhasil menarik data.", posts },
            { status: 200 }
        );

    } catch (error) {
        console.error("NTC Pull Error:", error);
        return NextResponse.json(
            { message: "Gagal menarik data dari server." },
            { status: 500 }
        );
    }
}