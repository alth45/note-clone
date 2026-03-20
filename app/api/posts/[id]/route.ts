import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email)
            return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });

        const body = await req.json();
        const { title, content, published, tags } = body;

        const existingPost = await prisma.post.findUnique({
            where: { id },
            include: { author: true },
        });

        if (!existingPost || existingPost.author.email !== session.user.email)
            return NextResponse.json(
                { message: "Artikel tidak ditemukan / Bukan milik Anda" },
                { status: 403 }
            );

        // Normalise tags — trim, lowercase, buang kosong, buang duplikat
        const normalisedTags: string[] | undefined = Array.isArray(tags)
            ? [...new Set(
                tags
                    .map((t: string) => t.trim().toLowerCase())
                    .filter(Boolean)
            )]
            : undefined;

        const updatedPost = await prisma.post.update({
            where: { id },
            data: {
                title: title !== undefined ? title : existingPost.title,
                content: content !== undefined ? content : existingPost.content,
                published: published !== undefined ? published : existingPost.published,
                // Hanya update tags kalau dikirim
                ...(normalisedTags !== undefined && { tags: normalisedTags }),
            },
        });

        return NextResponse.json(
            { message: "Tersimpan", post: updatedPost },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error auto-save:", error);
        return NextResponse.json({ message: "Gagal menyimpan" }, { status: 500 });
    }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.email)
            return NextResponse.json({ message: "Akses ditolak" }, { status: 401 });

        const post = await prisma.post.findUnique({
            where: { id },
            include: { author: true },
        });

        if (!post || post.author.email !== session.user.email)
            return NextResponse.json(
                { message: "Artikel tidak ditemukan" },
                { status: 404 }
            );

        return NextResponse.json(post, { status: 200 });

    } catch (error) {
        console.error("Error get post:", error);
        return NextResponse.json({ message: "Gagal mengambil data" }, { status: 500 });
    }
}