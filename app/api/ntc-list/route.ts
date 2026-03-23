import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

export async function GET(req: Request) {
    try {
        const { user, error } = await checkCliToken(req);
        if (error) return error;

        const posts = await prisma.post.findMany({
            where: { authorId: user.id },
            orderBy: { updatedAt: "desc" },
            select: {
                id: true,
                title: true,
                slug: true,
                published: true,
                updatedAt: true,
                folder: {
                    select: { name: true },
                },
            },
        });

        return NextResponse.json({ posts }, { status: 200 });

    } catch (error) {
        console.error("NTC List Error:", error);
        return NextResponse.json(
            { message: "Gagal mengambil data dari server." },
            { status: 500 }
        );
    }
}