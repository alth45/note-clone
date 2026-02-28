import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function PUT(req: Request) {
    try {
        // 1. CEK SATPAM: Pastikan yang manggil API ini udah login
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Akses ditolak. Anda belum login." }, { status: 401 });
        }

        // 2. Ambil data dari Frontend
        const body = await req.json();
        const { name, handle, bio } = body;

        // 3. Validasi: Jangan sampai handle (username) dipakai orang lain
        if (handle) {
            const existingHandle = await prisma.user.findFirst({
                where: {
                    handle: handle,
                    NOT: { email: session.user.email } // Boleh pakai handle ini kalau emang punya dia sendiri
                }
            });

            if (existingHandle) {
                return NextResponse.json({ message: "Username/Handle sudah digunakan orang lain." }, { status: 400 });
            }
        }

        // 4. Update Database!
        const updatedUser = await prisma.user.update({
            where: { email: session.user.email },
            data: {
                name,
                handle,
                bio
            }
        });

        return NextResponse.json({ message: "Profil berhasil diperbarui!", user: updatedUser }, { status: 200 });

    } catch (error) {
        console.error("Error Update Profile:", error);
        return NextResponse.json({ message: "Terjadi kesalahan server" }, { status: 500 });
    }
}