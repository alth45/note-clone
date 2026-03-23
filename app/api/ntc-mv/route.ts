import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

export async function PATCH(req: Request) {
    try {
        const { user, error } = await checkCliToken(req);
        if (error) return error;

        const { searchParams } = new URL(req.url);
        const slug = searchParams.get("slug");
        const targetFolder = searchParams.get("folder");

        if (!slug || !targetFolder) {
            return NextResponse.json(
                { message: "Slug dan nama folder tujuan wajib diisi." },
                { status: 400 }
            );
        }

        const post = await prisma.post.findFirst({
            where: { slug, authorId: user.id },
        });
        if (!post) {
            return NextResponse.json(
                { message: "Artikel tidak ditemukan." },
                { status: 404 }
            );
        }

        let newFolderId: string | null = null;

        if (targetFolder.toLowerCase() !== "root") {
            const folder = await prisma.folder.findFirst({
                where: { name: targetFolder, userId: user.id },
            });

            if (!folder) {
                return NextResponse.json(
                    { message: `Folder '${targetFolder}' tidak ditemukan. Buat dulu pakai 'ntc mkdir'.` },
                    { status: 404 }
                );
            }
            newFolderId = folder.id;
        }

        await prisma.post.update({
            where: { id: post.id },
            data: { folderId: newFolderId },
        });

        const targetName = targetFolder.toLowerCase() === "root"
            ? "Root (Luar Folder)"
            : targetFolder;

        return NextResponse.json(
            { message: `Berhasil dipindahkan ke [${targetName}]` },
            { status: 200 }
        );

    } catch (error) {
        console.error("MV Error:", error);
        return NextResponse.json(
            { message: "Gagal memindahkan file di server." },
            { status: 500 }
        );
    }
}