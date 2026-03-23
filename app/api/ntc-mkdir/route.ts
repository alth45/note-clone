import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

export async function POST(req: Request) {
    try {
        const { user, error } = await checkCliToken(req);
        if (error) return error;

        const { folderName } = await req.json();

        if (!folderName || typeof folderName !== "string" || !folderName.trim()) {
            return NextResponse.json(
                { message: "Nama folder wajib diisi." },
                { status: 400 }
            );
        }

        const existingFolder = await prisma.folder.findFirst({
            where: { name: folderName.trim(), userId: user.id },
        });

        if (existingFolder) {
            return NextResponse.json(
                { message: `Folder '${folderName}' sudah ada.` },
                { status: 400 }
            );
        }

        await prisma.folder.create({
            data: { name: folderName.trim(), userId: user.id },
        });

        return NextResponse.json(
            { message: `Folder '${folderName}' berhasil dibuat!` },
            { status: 201 }
        );

    } catch (error) {
        console.error("Mkdir Error:", error);
        return NextResponse.json(
            { message: "Gagal membuat folder di server." },
            { status: 500 }
        );
    }
}