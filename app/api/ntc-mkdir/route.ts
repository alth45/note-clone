import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkCliToken } from "@/lib/checkCliToken";

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        // const token = authHeader?.split(' ')[1];
        // if (!token) return NextResponse.json({ message: "Akses ditolak." }, { status: 401 });
        const { user, error } = await checkCliToken(req);
        if (error) return error

        // const user = await prisma.user.findUnique({ where: { cliToken: token } });
        if (!user) return NextResponse.json({ message: "Sesi tidak valid." }, { status: 401 });

        const { folderName } = await req.json();
        if (!folderName) return NextResponse.json({ message: "Nama folder wajib diisi." }, { status: 400 });

        // Cek apakah folder dengan nama ini udah ada
        const existingFolder = await prisma.folder.findFirst({
            where: { name: folderName, userId: user.id }
        });

        if (existingFolder) {
            return NextResponse.json({ message: `Folder '${folderName}' sudah ada.` }, { status: 400 });
        }

        // Bikin folder baru
        await prisma.folder.create({
            data: {
                name: folderName,
                userId: user.id
            }
        });

        return NextResponse.json({ message: `Folder '${folderName}' berhasil dibuat!` }, { status: 201 });
    } catch (error) {
        console.error("Mkdir Error:", error);
        return NextResponse.json({ message: "Gagal membuat folder di server." }, { status: 500 });
    }
}